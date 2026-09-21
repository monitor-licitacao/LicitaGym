#!/usr/bin/env python3
"""
Collector: Pesquisa de Preço — consultarMaterial + consultarMaterialDetalhe
Golden rule: apenas materiais de G72/G78
Coleta preços + fornecedores para items fitness no mercado.
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional
from scripts.lib.http_fetch import fetch_json, HttpFetchError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT_MATERIAL = "/modulo-pesquisa-preco/1_consultarMaterial"
ENDPOINT_DETALHE = "/modulo-pesquisa-preco/2_consultarMaterialDetalhe"
TIMEOUT = 30

# Carrega items E4 para filtrar por codigoItem
ITEMS_E4 = []

def load_items_e4():
    """Carrega items reais do collector E4"""
    global ITEMS_E4
    try:
        with open("collector_item_material_resultado.json", encoding="utf-8") as f:
            data = json.load(f)
        for grupo_key in ["grupo_72", "grupo_78"]:
            ITEMS_E4.extend([item["codigoItem"] for item in data["data"].get(grupo_key, [])])
        logger.info(f"Carregados {len(ITEMS_E4)} items de E4")
    except Exception as e:
        logger.error(f"Erro ao carregar E4: {e}")

def fetch_material(codigo_item: Optional[int] = None, pagina: int = 1) -> Dict[str, Any]:
    """Consulta Material em Pesquisa de Preço"""
    url = f"{BASE_URL}{ENDPOINT_MATERIAL}"
    params = {"pagina": pagina, "tamanhoPagina": 500}

    if codigo_item:
        params["codigoItem"] = codigo_item

    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    return fetch_json(
        url,
        timeout=TIMEOUT,
        user_agent="LicitaGym/Collector",
        raise_for_status=True,
        legacy_empty_envelope_key="resultado",
    )

def fetch_detalhe(codigo_material: int) -> Dict[str, Any]:
    """Consulta Detalhe (preços + fornecedores)"""
    url = f"{BASE_URL}{ENDPOINT_DETALHE}?codigoMaterial={codigo_material}"

    return fetch_json(
        url,
        timeout=TIMEOUT,
        user_agent="LicitaGym/Collector",
        raise_for_status=True,
        legacy_empty_envelope_key="resultado",
    )

def main():
    logger.info("=== COLLECTOR: Pesquisa de Preço — Material + Detalhe ===")
    logger.info("Golden rule: apenas items G72/G78\n")

    load_items_e4()

    materiais_encontrados = []
    detalhes_todos = []

    # Busca materiais por item (preço filtra por item fitness)
    for i, codigo_item in enumerate(ITEMS_E4[:100], 1):  # Primeiros 100 items
        if i % 20 == 0:
            logger.info(f"[{i}/{min(100, len(ITEMS_E4))}] processando...")

        resp = fetch_material(codigo_item=codigo_item)
        materiais = resp.get("resultado", [])

        if materiais:
            materiais_encontrados.extend(materiais)

            # Busca detalhe (preços, fornecedores) pra cada material
            for material in materiais:
                codigo_material = material.get("codigoMaterial")
                if codigo_material:
                    detalhe = fetch_detalhe(codigo_material)
                    detalhes = detalhe.get("resultado", [])
                    if detalhes:
                        detalhes_todos.extend(detalhes)

        time.sleep(0.2)

    output = {
        "endpoint": "pesquisa-preco (consultarMaterial + consultarMaterialDetalhe)",
        "golden_rule": "apenas G72/G78 items",
        "resumo": {
            "items_pesquisados": min(100, len(ITEMS_E4)),
            "materiais_encontrados": len(materiais_encontrados),
            "detalhes_preco_encontrados": len(detalhes_todos),
        },
        "materiais": materiais_encontrados,
        "detalhes": detalhes_todos
    }

    with open("collector_pesquisa_preco_resultado.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Salvo: collector_pesquisa_preco_resultado.json")
    logger.info(f"  Materiais: {output['resumo']['materiais_encontrados']}")
    logger.info(f"  Detalhes: {output['resumo']['detalhes_preco_encontrados']}")

if __name__ == "__main__":
    main()
