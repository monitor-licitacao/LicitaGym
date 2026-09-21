#!/usr/bin/env python3
"""Ingerir documentos PNCP mapeados em artifacts/pncp_links.json via AgenteJuridico."""

from __future__ import annotations

import json
import os
import sys
import traceback
from datetime import datetime
from pathlib import Path

# Project root = parent of scripts/
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

LINKS_PATH = ROOT / "artifacts" / "pncp_links.json"
REPORT_PATH = ROOT / "artifacts" / "pncp_ingest_report.json"


def _safe_err(exc: BaseException) -> str:
    msg = str(exc)
    # never echo secrets
    for key in ("SUPABASE_KEY", "service_role", "eyJ"):
        if key in msg and "eyJ" in msg:
            return type(exc).__name__ + ": [redacted]"
    if "eyJ" in msg:
        return type(exc).__name__ + ": [redacted JWT-like token]"
    return f"{type(exc).__name__}: {msg[:400]}"


def existing_urls(agente) -> set[str]:
    urls: set[str] = set()
    try:
        rows = agente.listar_legislacao(limite=500) or []
        for r in rows:
            u = (r or {}).get("url_origem")
            if u:
                urls.add(u.strip())
    except Exception as e:
        print(f"WARN listar_legislacao: {_safe_err(e)}")
    # also direct supabase if available
    try:
        if agente.ingestor and getattr(agente.ingestor, "supabase", None):
            resp = (
                agente.ingestor.supabase.table("legislacao")
                .select("url_origem")
                .limit(1000)
                .execute()
            )
            for r in resp.data or []:
                u = (r or {}).get("url_origem")
                if u:
                    urls.add(u.strip())
    except Exception as e:
        print(f"WARN supabase url scan: {_safe_err(e)}")
    return urls


def main() -> int:
    if not LINKS_PATH.exists():
        print(f"FAIL missing {LINKS_PATH}")
        return 2

    data = json.loads(LINKS_PATH.read_text(encoding="utf-8"))
    links = data.get("links") or []
    print(f"Loaded {len(links)} links from {LINKS_PATH}")

    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
        print("FAIL SUPABASE_URL/SUPABASE_KEY missing in env")
        return 2

    from agente import AgenteJuridico

    agente = AgenteJuridico()
    model_loaded = False
    model_error = None
    try:
        print("Carregando modelo (embeddings)...")
        agente.carregar_modelo()
        model_loaded = True
        backend = getattr(agente.modelo_ml, "embedding_backend", None)
        print(
            "Modelo OK",
            type(backend).__name__ if backend else None,
            getattr(backend, "provider", None),
        )
    except Exception as e:
        model_error = _safe_err(e)
        print(f"WARN carregar_modelo falhou — ingest sem embeddings: {model_error}")

    known = existing_urls(agente)
    print(f"URLs já no DB: {len(known)}")

    results = []
    n_pass = n_fail = n_skip = 0
    rls_blocked = False

    for i, item in enumerate(links, 1):
        url = (item.get("url") or "").strip()
        title = item.get("title") or url
        tipo = item.get("tipo_hint")
        print(f"\n[{i}/{len(links)}] {tipo} | {title[:80]}")
        print(f"  url={url}")

        if not url:
            print("FAIL empty url")
            n_fail += 1
            results.append({**item, "status": "FAIL", "error": "empty url"})
            continue

        if url in known:
            print("SKIP duplicate url_origem")
            n_skip += 1
            results.append({**item, "status": "SKIP", "reason": "duplicate url_origem"})
            continue

        try:
            out = agente.ingerir_documento(url)
            if not out:
                print("FAIL ingerir_documento returned None")
                n_fail += 1
                results.append({**item, "status": "FAIL", "error": "None result"})
                continue
            if isinstance(out, dict) and out.get("erro"):
                print(f"FAIL {out.get('erro')}")
                n_fail += 1
                results.append({**item, "status": "FAIL", "error": str(out.get("erro"))[:300]})
                continue
            print(
                "PASS",
                f"id={out.get('id')}",
                f"tipo={out.get('tipo')}",
                f"titulo={(out.get('titulo') or '')[:60]}",
            )
            n_pass += 1
            known.add(url)
            results.append(
                {
                    **{k: item.get(k) for k in ("tipo_hint", "title", "url", "source_list_url", "revogada", "detail_page_url", "dou_url")},
                    "status": "PASS",
                    "id": out.get("id"),
                    "tipo_detectado": out.get("tipo"),
                    "titulo_detectado": out.get("titulo"),
                }
            )
        except Exception as e:
            err = _safe_err(e)
            low = err.lower()
            if "row-level security" in low or "42501" in low or "rls" in low:
                rls_blocked = True
                print(f"FAIL RLS: {err}")
                n_fail += 1
                results.append({**item, "status": "FAIL", "error": err, "rls": True})
                break
            print(f"FAIL {err}")
            n_fail += 1
            results.append({**item, "status": "FAIL", "error": err})

    # final count
    final_count = None
    final_rows = []
    try:
        rows = agente.listar_legislacao(limite=500) or []
        final_rows = [
            {
                "id": r.get("id"),
                "tipo": r.get("tipo"),
                "titulo": (r.get("titulo") or "")[:120],
                "url_origem": r.get("url_origem"),
            }
            for r in rows
        ]
        final_count = len(rows)
        if agente.ingestor and getattr(agente.ingestor, "supabase", None):
            c = (
                agente.ingestor.supabase.table("legislacao")
                .select("id", count="exact")
                .limit(1)
                .execute()
            )
            if c.count is not None:
                final_count = c.count
    except Exception as e:
        print(f"WARN final list: {_safe_err(e)}")

    report = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "model_loaded": model_loaded,
        "model_error": model_error,
        "embedding_backend_env": os.getenv("LICITAGYM_EMBEDDING_BACKEND"),
        "totals": {
            "links": len(links),
            "pass": n_pass,
            "fail": n_fail,
            "skip": n_skip,
        },
        "rls_blocked": rls_blocked,
        "final_db_count": final_count,
        "final_rows": final_rows,
        "results": results,
    }
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n==== SUMMARY ====")
    print(json.dumps(report["totals"], ensure_ascii=False))
    print("final_db_count", final_count, "rls_blocked", rls_blocked, "model_loaded", model_loaded)
    print("Wrote", REPORT_PATH)

    if rls_blocked:
        return 3
    return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
