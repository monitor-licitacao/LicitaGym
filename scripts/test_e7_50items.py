#!/usr/bin/env python3
import json
import logging
import time
from scripts.lib.http_fetch import fetch_json, HttpFetchError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/7_consultarMaterialCaracteristicas"

def fetch_caracteristicas(codigo_item: int, pagina: int = 1, tamanho_pagina: int = 500) -> list:
    url = f"{BASE_URL}{ENDPOINT}?pagina={pagina}&tamanhoPagina={tamanho_pagina}&codigoItem={codigo_item}"
    data = fetch_json(url, timeout=30, user_agent="LicitaGym/Collector", raise_for_status=True)
    return data.get('resultado', [])

def main():
    # Carrega E4
    with open('collector_item_material_resultado.json', encoding='utf-8') as f:
        e4_data = json.load(f)

    items = []
    for grupo in ['grupo_72', 'grupo_78']:
        items.extend([item['codigoItem'] for item in e4_data['data'].get(grupo, [])])

    items = items[:50]  # Primeiros 50
    logger.info(f"Testando E7 com {len(items)} items\n")

    resultado = {}
    total_carac = 0

    for i, codigo_item in enumerate(items, 1):
        carac = fetch_caracteristicas(codigo_item)
        resultado[f"item_{codigo_item}"] = carac
        total_carac += len(carac)

        if i % 10 == 0:
            logger.info(f"[{i}/{len(items)}] {total_carac} características até agora")

        time.sleep(0.1)

    output = {
        "endpoint": "7_consultarMaterialCaracteristicas",
        "teste": "primeiros 50 items",
        "data": resultado,
        "resumo": {
            "total_items": len(items),
            "total_caracteristicas": total_carac,
            "media_carac_por_item": round(total_carac / len(items), 2) if items else 0
        }
    }

    with open('collector_caracteristica_material_50items_teste.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Salvo: collector_caracteristica_material_50items_teste.json")
    logger.info(f"  Items: {output['resumo']['total_items']}")
    logger.info(f"  Características: {output['resumo']['total_caracteristicas']}")
    logger.info(f"  Média: {output['resumo']['media_carac_por_item']} carac/item")

if __name__ == "__main__":
    main()
