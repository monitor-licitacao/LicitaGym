#!/usr/bin/env python3
"""Reindex long legislacao docs as article-sized (or windowed) embeddings.

Same bootstrap pattern as scripts/reindex_embeddings.py:
AgenteJuridico + BancoVetorialLegislacao with real Supabase client.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

REPORT_PATH = ROOT / "artifacts" / "reindex_chunks_report.json"
MIN_LONG_CHARS = int(os.getenv("LICITAGYM_CHUNK_MIN_CHARS", "8000"))
CHUNK_ENCODE_CAP = 2000
OVERLAP_SIZE = 1800
OVERLAP_STEP = 1400
FORCE_IDS = {2, 4}  # Lei 14.133 + Decreto 10.764 (optional even if short)


CHROME_EXACT = {
    "Presidência da República",
    "Mensagem de veto",
    "Regulamento",
    "Vigência",
    "L14133",
    "D10764",
    "Secretaria-Geral",
    "Subchefia para Assuntos Jurídicos",
    "Assuntos Jurídicos",
    "Promulgação partes vetadas",
    'Acessibilidade',
    'Acesso rápido',
    'Acesso à Informação',
    'Acesso à informação',
    'Botão Menu',
    'Compartilhe :',
    'Ir para a busca',
    'Ir para a navegação',
    'Ir para o conteúdo',
    'Ir para o rodapé',
    'Legislação',
    'Links de compartilhamento em redes sociais',
    'Mudar para o modo de alto contraste',
    'Portal Gov.br',
    'Portarias',
    'Sobre o PNCP',
    'Você precisa habilitar o JavaScript para o funcionamento correto.',
    'Órgãos do Governo'
}
CHROME_RE = re.compile(
    r"^(Presidência da República|Mensagem de\s*veto|Regulamento|Vigência|"
    r"L\d+|D\d+|Secretaria-Geral|Subchefia.*|Promulgação partes vetadas)\s*$",
    re.IGNORECASE,
)
ART_SPLIT_RE = re.compile(r"(?:(?<=\n)|^)(?=Art\.\s*\d+)|(?:(?<=\n)|^)(?=Artigo\s+\d+)")
ART_HEAD_RE = re.compile(r"^(Art\.\s*\d+[ºªoO]?|Artigo\s+\d+[ºªoO]?)")


def _safe_err(exc: BaseException) -> str:
    msg = str(exc)
    if "eyJ" in msg:
        return type(exc).__name__ + ": [redacted JWT-like token]"
    for key in ("SUPABASE_KEY", "service_role"):
        if key in msg:
            return type(exc).__name__ + ": [redacted]"
    return f"{type(exc).__name__}: {msg[:400]}"


def clean_chrome(texto: str) -> str:
    lines = []
    for ln in (texto or "").splitlines():
        s = ln.strip()
        if not s:
            lines.append("")
            continue
        if s in CHROME_EXACT or CHROME_RE.match(s):
            continue
        lines.append(ln.rstrip())
    # normalize whitespace lightly
    text = "\n".join(lines)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def overview_chunk(titulo: str, ementa: str, texto: str) -> str:
    cleaned = clean_chrome(texto)
    # skip leading short chrome leftovers
    meaningful = []
    for ln in cleaned.splitlines():
        s = ln.strip()
        if not s:
            continue
        if len(s) < 4:
            continue
        meaningful.append(s)
    body = "\n".join(meaningful)[:1500]
    parts = [f"{titulo} — Visão geral"]
    if ementa:
        parts.append(ementa.strip())
    if body:
        parts.append(body)
    return "\n\n".join(parts)[:CHUNK_ENCODE_CAP]


def split_articles(texto: str) -> List[Tuple[Optional[str], str]]:
    cleaned = clean_chrome(texto)
    # Collapse "Art.\n 15" style line-breaks from Planalto HTML
    cleaned = re.sub(r"(Art\.)\s*\n\s*", r"\1 ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(Artigo)\s*\n\s*", r"\1 ", cleaned, flags=re.IGNORECASE)
    parts = [p.strip() for p in ART_SPLIT_RE.split(cleaned) if p and p.strip()]
    arts: List[Tuple[Optional[str], str]] = []
    for p in parts:
        m = ART_HEAD_RE.match(p)
        if m:
            label = re.sub(r"\s+", " ", m.group(1)).strip()
            arts.append((label, p))
        elif not arts:
            # preamble — skip (overview covers it)
            continue
        else:
            # orphan fragment; append to previous if any
            prev_label, prev_body = arts[-1]
            arts[-1] = (prev_label, (prev_body + "\n" + p).strip())
    return arts


def split_windows(texto: str) -> List[Tuple[Optional[str], str]]:
    cleaned = clean_chrome(texto)
    if not cleaned:
        return []
    out: List[Tuple[Optional[str], str]] = []
    i = 0
    n = len(cleaned)
    idx = 0
    while i < n:
        chunk = cleaned[i : i + OVERLAP_SIZE].strip()
        if chunk:
            idx += 1
            out.append((f"trecho-{idx}", chunk))
        if i + OVERLAP_SIZE >= n:
            break
        i += OVERLAP_STEP
    return out


def build_chunks(doc: Dict[str, Any]) -> List[Dict[str, Any]]:
    titulo = doc.get("titulo") or "Documento"
    ementa = doc.get("ementa") or ""
    texto = doc.get("texto_completo") or ""
    chunks: List[Dict[str, Any]] = []

    ov = overview_chunk(titulo, ementa, texto)
    if ov.strip():
        chunks.append(
            {
                "label": "overview",
                "artigo": None,
                "texto": ov,
                "kind": "overview",
            }
        )

    arts = split_articles(texto)
    if len(arts) < 5:
        parts = split_windows(texto)
        kind = "window"
    else:
        parts = arts
        kind = "artigo"

    for label, body in parts:
        body = body.strip()
        if not body:
            continue
        prefix = f"{titulo} — {label}" if label else titulo
        payload = f"{prefix}\n\n{body}"
        if len(payload) > CHUNK_ENCODE_CAP:
            payload = payload[:CHUNK_ENCODE_CAP]
        chunks.append(
            {
                "label": label,
                "artigo": label if kind == "artigo" else None,
                "texto": payload,
                "kind": kind,
            }
        )
    return chunks


def main() -> int:
    t0 = time.perf_counter()
    report: Dict[str, Any] = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "host_note": "executor box (Shell machineId VectraCargo nao roteou); backend=torch",
        "min_long_chars": MIN_LONG_CHARS,
        "docs": [],
        "totals": {"docs": 0, "chunks_inserted": 0, "chunks_deleted": 0, "errors": 0},
        "failures": [],
    }

    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
        print("FAIL SUPABASE_URL/SUPABASE_KEY missing")
        return 2

    # Prefer torch on this Linux box (no GPU TRT)
    os.environ.setdefault("LICITAGYM_EMBEDDING_BACKEND", "torch")

    from agente import AgenteJuridico

    print("Carregando AgenteJuridico + embeddings...")
    agente = AgenteJuridico()
    try:
        agente.carregar_modelo()
    except Exception as e:
        print("FAIL carregar_modelo:", _safe_err(e))
        report["failures"].append(_safe_err(e))
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        return 1

    if not agente.supabase or not agente.banco_vetorial:
        print("FAIL supabase/banco_vetorial nao disponivel")
        return 1

    sb = agente.supabase
    rows = (
        sb.table("legislacao")
        .select("id,titulo,numero,ano,tipo,ementa,texto_completo")
        .execute()
        .data
        or []
    )

    targets = []
    for r in rows:
        tc = r.get("texto_completo") or ""
        did = int(r["id"])
        if did in FORCE_IDS or len(tc) >= MIN_LONG_CHARS:
            targets.append(r)

    print(f"Docs alvo: {len(targets)} -> {[d['id'] for d in targets]}")
    report["totals"]["docs"] = len(targets)

    for doc in targets:
        did = int(doc["id"])
        entry: Dict[str, Any] = {
            "documento_id": did,
            "titulo": doc.get("titulo"),
            "texto_len": len(doc.get("texto_completo") or ""),
            "chunks": 0,
            "deleted": 0,
            "error": None,
        }
        try:
            # count existing
            before = (
                sb.table("legislacao_embeddings")
                .select("id", count="exact")
                .eq("documento_id", did)
                .execute()
            )
            n_before = before.count if before.count is not None else len(before.data or [])

            agente.banco_vetorial.remover_documento(str(did))
            entry["deleted"] = int(n_before or 0)
            report["totals"]["chunks_deleted"] += entry["deleted"]

            chunks = build_chunks(doc)
            print(f"  doc {did}: {len(chunks)} chunks (deleted {entry['deleted']})")

            base_meta = {
                "titulo": doc.get("titulo"),
                "numero": doc.get("numero"),
                "ano": doc.get("ano"),
                "tipo": doc.get("tipo"),
                "ementa": (doc.get("ementa") or "")[:500],
            }

            for ch in chunks:
                meta = {
                    **base_meta,
                    "chunk_kind": ch["kind"],
                    "artigo": ch.get("artigo"),
                    "chunk_label": ch.get("label"),
                }
                agente.banco_vetorial.indexar_documento(
                    doc_id=str(did),
                    texto=ch["texto"],
                    metadados=meta,
                )
                entry["chunks"] += 1
                report["totals"]["chunks_inserted"] += 1

            # sample labels
            entry["sample_labels"] = [c.get("label") for c in chunks[:5]]
            entry["kinds"] = {
                "overview": sum(1 for c in chunks if c["kind"] == "overview"),
                "artigo": sum(1 for c in chunks if c["kind"] == "artigo"),
                "window": sum(1 for c in chunks if c["kind"] == "window"),
            }
        except Exception as e:
            entry["error"] = _safe_err(e)
            report["failures"].append({"documento_id": did, "error": entry["error"]})
            report["totals"]["errors"] += 1
            print(f"  FAIL doc {did}: {entry['error']}")

        report["docs"].append(entry)

    report["elapsed_s"] = round(time.perf_counter() - t0, 1)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["totals"], indent=2))
    print("Report:", REPORT_PATH)
    return 0 if report["totals"]["errors"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
