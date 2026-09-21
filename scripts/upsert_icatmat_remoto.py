#!/usr/bin/env python3
"""
Upsert consolidated CATMAT data to remote Supabase via REST API.
"""

import json
import urllib.request
import urllib.error
import logging
import sys
import os

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Load from .env — NEVER hardcode secrets
SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    logger.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios")
    sys.exit(1)

REST_URL = f"{SUPABASE_URL}/rest/v1/icatmat_pdm_completa"

def load_consolidated(filepath: str):
    logger.info(f"Carregando {filepath}...")
    with open(filepath, encoding='utf-8') as f:
        data = json.load(f)
    logger.info(f"  {len(data)} registros carregados")
    return data

def prepare_record(rec):
    """Map consolidado fields to table columns"""
    return {
        "codigo_grupo": rec.get("codigo_grupo"),
        "nome_grupo": rec.get("nome_grupo"),
        "status_grupo_ep1": rec.get("status_grupo_ep1"),
        "codigo_classe": rec.get("codigo_classe"),
        "nome_classe": rec.get("nome_classe"),
        "codigo_pdm": rec.get("codigo_pdm"),
        "nome_pdm": rec.get("nome_pdm"),
        "codigo_item": rec.get("codigo_item"),
        "descricao_item": rec.get("descricao_item"),
        "status_item_ep4": rec.get("status_item_ep4"),
        "item_sustentavel": rec.get("item_sustentavel"),
        "codigo_ncm": rec.get("codigo_ncm"),
        "descricao_ncm": rec.get("descricao_ncm"),
        "caracteristicas": rec.get("caracteristicas", []),
        "unidades_fornecimento": rec.get("unidades_fornecimento", []),
        "naturezas_despesa": rec.get("naturezas_despesa", []),
        "payload_hash": rec.get("payload_hash"),
        "data_sincronizacao": rec.get("data_sincronizacao"),
    }

def upsert_batch(records, batch_size=100):
    """Upsert via REST API"""
    total = len(records)
    success = 0

    for i in range(0, total, batch_size):
        batch = records[i:i+batch_size]
        body = json.dumps([prepare_record(r) for r in batch], ensure_ascii=False)

        req = urllib.request.Request(
            REST_URL,
            data=body.encode(),
            headers={
                "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
                "apikey": SERVICE_ROLE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                logger.info(f"  Lote {i//batch_size+1}: {len(batch)} registros ({resp.status})")
                success += len(batch)
        except urllib.error.HTTPError as e:
            logger.error(f"  Erro lote {i//batch_size+1}: HTTP {e.code}")
            logger.error(f"    {e.read().decode()}")
            return success
        except Exception as e:
            logger.error(f"  Erro lote {i//batch_size+1}: {e}")
            return success

    return success

def main():
    logger.info("=== UPSERT CATMAT REMOTO ===")

    records = load_consolidated("teste_catmat_consolidado.json")
    logger.info(f"\nUpsertando para {REST_URL}")

    success = upsert_batch(records)
    logger.info(f"\n✓ {success}/{len(records)} registros upserted")

    return 0 if success == len(records) else 1

if __name__ == "__main__":
    sys.exit(main())
