#!/usr/bin/env python3
import json
from pathlib import Path

# SEC-P1-02: Use relative path instead of hardcoded Windows absolute path
json_file = Path(__file__).parent / "collector_item_material_resultado.json"
if not json_file.exists():
    json_file = Path("collector_item_material_resultado.json")

with open(json_file, encoding='utf-8') as f:
    data = json.load(f)

items_g72 = data['data'].get('grupo_72', [])
if items_g72:
    item = items_g72[0]
    print('=== ESTRUTURA ITEM G72 (primeiro) ===')
    print(json.dumps(item, indent=2, ensure_ascii=False)[:1500])
    print('\n--- CAMPOS DISPONÍVEIS ---')
    print('Campos:', list(item.keys()))
    print(f'\ncodigoItem: {item.get("codigoItem")}')
    desc = item.get("descricao", "")
    print(f'descricao (primeiros 150 chars): {desc[:150]}...')
