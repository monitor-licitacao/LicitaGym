#!/usr/bin/env python3
"""
Upsert Consolidado: E1-E7 Endpoints CATMAT
Carrega JSONs coletados → insere em tabelas icatmat_ com FKs respeitadas.

Ordem: E1 → E2 → E3 → E4 → E5/E6/E7 (paralelo satélites)
"""

import json
import hashlib
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Supabase connection (local)
try:
    from supabase import create_client
    SUPABASE_URL = "http://127.0.0.1:54321"
    SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpY2l0YWd5bSIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2OTc3NDEwMDAsImV4cCI6MTk5OTk5OTk5OX0.dummy"
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except ImportError:
    logger.warning("supabase-py não instalado. Use: pip install supabase")
    supabase = None

# Diretórios de entrada
COLLECTORS_DIR = Path(__file__).parent.parent / "scripts"
RESULTS_PATTERNS = {
    "E1": "*grupo_material_resultado.json",
    "E2": "*classe_material_resultado.json",
    "E3": "*pdm_material_resultado.json",
    "E4": "*item_material_resultado.json",
    "E5": "*natureza_despesa_resultado.json",
    "E6": "*unidade_fornecimento_resultado.json",
    "E7": "*caracteristica_material_resultado.json",
}

def compute_hash(obj: Dict[str, Any]) -> str:
    """MD5 hash of sorted JSON."""
    json_str = json.dumps(obj, sort_keys=True, separators=(',', ':'))
    return hashlib.md5(json_str.encode()).hexdigest()

def load_resultado(endpoint: str) -> List[Dict[str, Any]]:
    """Carrega resultado JSON de collector."""
    pattern = RESULTS_PATTERNS.get(endpoint)
    if not pattern:
        logger.warning(f"Pattern não encontrado para {endpoint}")
        return []

    files = list(COLLECTORS_DIR.glob(pattern))
    if not files:
        logger.warning(f"Nenhum arquivo encontrado para {endpoint} ({pattern})")
        return []

    filepath = files[0]
    try:
        with open(filepath) as f:
            data = json.load(f)
        logger.info(f"{endpoint}: carregado {len(data)} registros de {filepath.name}")
        return data
    except Exception as e:
        logger.error(f"{endpoint}: erro ao carregar {filepath.name} — {e}")
        return []

def upsert_table(table: str, records: List[Dict[str, Any]]) -> int:
    """Upsert records em tabela. Retorna count inserido."""
    if not records or not supabase:
        return 0

    try:
        result = supabase.table(table).upsert(records).execute()
        count = len(result.data) if hasattr(result, 'data') else len(records)
        logger.info(f"{table}: {count} registros upsertados")
        return count
    except Exception as e:
        logger.error(f"{table}: erro upsert — {e}")
        return 0

def enrich_e1(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich E1: adiciona payload_hash, timestamp."""
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "nome_grupo": r.get("nomeGrupo"),
            "data_hora_atualizacao": r.get("dataHoraAtualizacao"),
            "payload_hash": compute_hash(r),
            "sync_timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return enriched

def enrich_e2(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich E2: adiciona payload_hash, FK."""
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "codigo_classe": r.get("codigoClasse"),
            "nome_classe": r.get("nomeClasse"),
            "status_classe": r.get("statusClasse", True),
            "data_hora_atualizacao": r.get("dataHoraAtualizacao"),
            "payload_hash": compute_hash(r),
            "sync_timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return enriched

def enrich_e3(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich E3."""
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "codigo_classe": r.get("codigoClasse"),
            "codigo_pdm": r.get("codigoPdm"),
            "nome_pdm": r.get("nomePdm"),
            "status_pdm": r.get("statusPdm", True),
            "data_hora_atualizacao": r.get("dataHoraAtualizacao"),
            "payload_hash": compute_hash(r),
            "sync_timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return enriched

def enrich_e4(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich E4."""
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "codigo_classe": r.get("codigoClasse"),
            "codigo_pdm": r.get("codigoPdm"),
            "codigo_item": r.get("codigoItem"),
            "descricao_item": r.get("descricaoItem"),
            "tipo_item": r.get("tipoItem"),
            "status_item": r.get("statusItem", True),
            "valor_unitario": r.get("valorUnitario"),
            "unidade_padrao": r.get("unidadePadrao"),
            "data_hora_atualizacao": r.get("dataHoraAtualizacao"),
            "payload_hash": compute_hash(r),
            "sync_timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return enriched

def enrich_e5(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich E5."""
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "codigo_classe": r.get("codigoClasse"),
            "codigo_pdm": r.get("codigoPdm"),
            "codigo_item": r.get("codigoItem"),
            "codigo_natureza": r.get("codigoNatureza"),
            "descricao_natureza": r.get("descricaoNatureza"),
            "data_hora_atualizacao": r.get("dataHoraAtualizacao"),
            "payload_hash": compute_hash(r),
            "sync_timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return enriched

def enrich_e6(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich E6."""
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "codigo_classe": r.get("codigoClasse"),
            "codigo_pdm": r.get("codigoPdm"),
            "codigo_item": r.get("codigoItem"),
            "codigo_unidade": r.get("codigoUnidade"),
            "descricao_unidade": r.get("descricaoUnidade"),
            "sigla_unidade": r.get("siglaUnidade"),
            "data_hora_atualizacao": r.get("dataHoraAtualizacao"),
            "payload_hash": compute_hash(r),
            "sync_timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return enriched

def enrich_e7(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich E7."""
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "codigo_classe": r.get("codigoClasse"),
            "codigo_pdm": r.get("codigoPdm"),
            "codigo_item": r.get("codigoItem"),
            "codigo_caracteristica": r.get("codigoCaracteristica"),
            "nome_caracteristica": r.get("nomeCaracteristica"),
            "descricao_caracteristica": r.get("descricaoCaracteristica"),
            "tipo_caracteristica": r.get("tipoCaracteristica"),
            "data_hora_atualizacao": r.get("dataHoraAtualizacao"),
            "payload_hash": compute_hash(r),
            "sync_timestamp": datetime.utcnow().isoformat() + "Z",
        })
    return enriched

def main():
    print("\n" + "="*70)
    print("UPSERT CONSOLIDADO E1-E7 CATMAT")
    print("="*70 + "\n")

    if not supabase:
        print("[ERROR] Supabase não conectado. Instale supabase-py:\n")
        print("  pip install supabase")
        print()
        return 1

    # E1
    print("[1/7] E1: Grupo Material")
    e1_raw = load_resultado("E1")
    e1_enriched = enrich_e1(e1_raw)
    e1_count = upsert_table("icatmat_grupo_material", e1_enriched)

    # E2
    print("[2/7] E2: Classe Material")
    e2_raw = load_resultado("E2")
    e2_enriched = enrich_e2(e2_raw)
    e2_count = upsert_table("icatmat_classe_material", e2_enriched)

    # E3
    print("[3/7] E3: PDM Material")
    e3_raw = load_resultado("E3")
    e3_enriched = enrich_e3(e3_raw)
    e3_count = upsert_table("icatmat_pdm_material", e3_enriched)

    # E4
    print("[4/7] E4: Item Material")
    e4_raw = load_resultado("E4")
    e4_enriched = enrich_e4(e4_raw)
    e4_count = upsert_table("icatmat_item_material", e4_enriched)

    # E5-E7 (paralelo logicamente, sequencial aqui)
    print("[5/7] E5: Natureza Despesa")
    e5_raw = load_resultado("E5")
    e5_enriched = enrich_e5(e5_raw)
    e5_count = upsert_table("icatmat_natureza_despesa", e5_enriched)

    print("[6/7] E6: Unidade Fornecimento")
    e6_raw = load_resultado("E6")
    e6_enriched = enrich_e6(e6_raw)
    e6_count = upsert_table("icatmat_unidade_fornecimento", e6_enriched)

    print("[7/7] E7: Característica Material")
    e7_raw = load_resultado("E7")
    e7_enriched = enrich_e7(e7_raw)
    e7_count = upsert_table("icatmat_caracteristica_material", e7_enriched)

    # Resumo
    total = e1_count + e2_count + e3_count + e4_count + e5_count + e6_count + e7_count
    print("\n" + "="*70)
    print(f"RESUMO: {total} registros upsertados")
    print("  E1: " + str(e1_count).ljust(6) + "E5: " + str(e5_count))
    print("  E2: " + str(e2_count).ljust(6) + "E6: " + str(e6_count))
    print("  E3: " + str(e3_count).ljust(6) + "E7: " + str(e7_count))
    print("  E4: " + str(e4_count))
    print("="*70 + "\n")

    return 0

if __name__ == "__main__":
    exit(main())
