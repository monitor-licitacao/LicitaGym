#!/usr/bin/env python3
"""Dry-run: mostra o que seria upsertado sem conectar Supabase."""

import json
import hashlib
from pathlib import Path
from typing import Any, Dict, List
from datetime import datetime

logger_info = print

COLLECTORS_DIR = Path(__file__).parent

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
    json_str = json.dumps(obj, sort_keys=True, separators=(',', ':'))
    return hashlib.md5(json_str.encode()).hexdigest()

def load_resultado(endpoint: str) -> List[Dict[str, Any]]:
    pattern = RESULTS_PATTERNS.get(endpoint)
    files = list(COLLECTORS_DIR.glob(pattern))

    if not files:
        logger_info(f"  ✗ {endpoint}: arquivo não encontrado ({pattern})")
        return []

    filepath = files[0]
    try:
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)

        # Formato 1: data['resultado'] é array (E1)
        records = []
        if isinstance(data, dict) and 'resultado' in data and isinstance(data['resultado'], list):
            records = data['resultado']
        # Formato 2: data['data'] é objeto com chaves (E4)
        elif isinstance(data, dict) and 'data' in data:
            for key, value in data['data'].items():
                if isinstance(value, list):
                    records.extend(value)

        if records:
            logger_info(f"  ✓ {endpoint}: {len(records)} registros de {filepath.name}")
            return records
        else:
            logger_info(f"  ✗ {endpoint}: nenhum registro encontrado")
            return []
    except Exception as e:
        logger_info(f"  ✗ {endpoint}: erro — {e}")
        return []

def enrich_e1(records: List[Dict]) -> List[Dict]:
    enriched = []
    for r in records:
        enriched.append({
            "codigo_grupo": r.get("codigoGrupo"),
            "nome_grupo": r.get("nomeGrupo"),
            "payload_hash": compute_hash(r),
        })
    return enriched

def enrich_e4(records: List[Dict]) -> List[Dict]:
    enriched = []
    for r in records:
        enriched.append({
            "codigo_item": r.get("codigoItem"),
            "descricao_item": r.get("descricaoItem", "")[:50],  # Primeiros 50 chars
            "payload_hash": compute_hash(r),
        })
    return enriched

print("\n" + "="*70)
print("UPSERT DRY-RUN: E1-E7")
print("="*70 + "\n")

print("Verificando collectors:\n")

# E1
e1_raw = load_resultado("E1")
e1_enriched = enrich_e1(e1_raw) if e1_raw else []

# E4
e4_raw = load_resultado("E4")
e4_enriched = enrich_e4(e4_raw) if e4_raw else []

# E7
e7_raw = load_resultado("E7")

print(f"\n=== E1: Grupo Material ===")
if e1_enriched:
    print(f"Registros: {len(e1_enriched)}")
    for r in e1_enriched[:3]:
        print(f"  {r}")
else:
    print("  (vazio)")

print(f"\n=== E4: Item Material ===")
if e4_enriched:
    print(f"Registros: {len(e4_enriched)}")
    for r in e4_enriched[:3]:
        print(f"  {r}")
else:
    print("  (vazio)")

print(f"\n=== E7: Características ===")
if e7_raw:
    print(f"Registros: {len(e7_raw) if isinstance(e7_raw, list) else 'N/A'}")
    if isinstance(e7_raw, list) and e7_raw:
        for r in e7_raw[:3]:
            print(f"  {r}")
else:
    print("  (vazio)")

print("\n" + "="*70)
print("RESUMO DISPONÍVEL:")
print(f"  E1 (grupo_material): {len(e1_enriched)} registros")
print(f"  E4 (item_material): {len(e4_enriched)} registros")
print(f"  E7 (caracteristica_material): {len(e7_raw) if isinstance(e7_raw, list) else 0} registros")
print("  E2, E3, E5, E6: não executados ainda")
print("="*70 + "\n")
