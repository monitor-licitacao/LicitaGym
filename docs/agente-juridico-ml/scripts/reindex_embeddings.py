"""Reindex legislacao_embeddings for all rows in legislacao (VectraCargo + TRT)."""
from __future__ import annotations
import json, os, sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)
load_dotenv(ROOT / ".env")

from agente import AgenteJuridico
from modelo_ml import BancoVetorialLegislacao

def main():
    agente = AgenteJuridico()
    assert agente.ingestor, "ingestor required"
    print("loading model...")
    agente.carregar_modelo()
    sb = agente.ingestor.supabase
    # Fix: wire real supabase client into vector bank
    banco = BancoVetorialLegislacao(agente.modelo_ml, sb)
    agente.banco_vetorial = banco

    docs = agente.listar_legislacao(limite=200) or []
    print("docs", len(docs))

    existing = set()
    try:
        resp = sb.table("legislacao_embeddings").select("documento_id").execute()
        existing = {str(r.get("documento_id")) for r in (resp.data or [])}
    except Exception as e:
        print("warn list embeddings", type(e).__name__, str(e)[:200])
    print("existing_embeddings", len(existing))

    report = []
    for d in docs:
        doc_id = str(d.get("id"))
        titulo = d.get("titulo")
        texto = d.get("texto_completo") or d.get("ementa") or titulo or ""
        rec = {"id": doc_id, "titulo": titulo}
        if doc_id in existing:
            rec["status"] = "skip"
            print("SKIP", doc_id, titulo)
            report.append(rec)
            continue
        if not texto.strip():
            rec["status"] = "empty_text"
            print("EMPTY", doc_id, titulo)
            report.append(rec)
            continue
        # keep embedding input bounded for very long laws
        chunk = texto[:12000]
        try:
            banco.indexar_documento(doc_id, chunk, {
                "titulo": titulo,
                "tipo": d.get("tipo"),
                "numero": d.get("numero"),
                "url_origem": d.get("url_origem"),
                "tags": d.get("tags"),
            })
            rec["status"] = "ok"
            print("OK", doc_id, titulo)
        except Exception as e:
            rec["status"] = "error"
            rec["error"] = str(e)[:300]
            print("ERR", doc_id, type(e).__name__, str(e)[:200])
        report.append(rec)

    out = ROOT / "artifacts" / "reindex_embeddings_report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        n = len(sb.table("legislacao_embeddings").select("id", count="exact").execute().data or [])
    except Exception:
        n = "unknown"
    print("FINAL_EMBEDDINGS", n)
    print("REPORT", out)
    print("SUMMARY", {s: sum(1 for r in report if r.get("status")==s) for s in ("ok","skip","empty_text","error")})

if __name__ == "__main__":
    main()
