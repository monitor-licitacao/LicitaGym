#!/usr/bin/env python3
"""
Collector: Endpoint 7 — consultarMaterialCaracteristicas
Golden rule: apenas classes 7220 (G72) e 7830 (G78)
Coleta Características com retry exponencial para rate-limiting.
"""

import json
import urllib.request
import logging
import time
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/7_consultarMaterialCaracteristicas"
TIMEOUT = 30

CLASSES_PERMITIDAS = {72: 7220, 78: 7830}

def fetch_caracteristicas(
    codigo_item: int,
    codigo_caracteristica: Optional[int] = None,
    pagina: int = 1,
    tamanho_pagina: int = 500,
    max_retries: int = 3
) -> Dict[str, Any]:
    """Consulta Características por Item (golden rule: E7 ignora grupo/classe)."""
    url = f"{BASE_URL}{ENDPOINT}"

    params = {
        "pagina": pagina,
        "tamanhoPagina": tamanho_pagina,
        "codigoItem": codigo_item,  # OBRIGATÓRIO: endpoint 7 não filtra por grupo/classe
    }

    if codigo_caracteristica is not None:
        params["codigoCaracteristica"] = codigo_caracteristica

    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LicitaGym/Collector"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                data = json.loads(resp.read().decode())
                return data
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries - 1:
                wait_time = 2 ** (attempt + 1)
                logger.warning(f"Rate-limit (429). Aguardando {wait_time}s...")
                time.sleep(wait_time)
            else:
                logger.error(f"Erro HTTP {e.code}: {e}")
                return {"resultado": []}
        except Exception as e:
            logger.error(f"Erro: {e}")
            return {"resultado": []}

def collect_caracteristicas_por_item(
    codigo_item: int,
    max_pages: Optional[int] = None
) -> List[Dict]:
    """Coleta todas características de um item específico (E7 filtra por item, não grupo/classe)."""
    todas_caracteristicas = []
    pagina = 1

    while True:
        try:
            resp = fetch_caracteristicas(
                codigo_item=codigo_item,
                pagina=pagina,
                tamanho_pagina=500
            )
            caracteristicas = resp.get("resultado", [])

            if not caracteristicas:
                logger.info(f"  Página {pagina}: vazio ou erro")
                break

            logger.info(f"  Página {pagina}: {len(caracteristicas)} características")
            todas_caracteristicas.extend(caracteristicas)

            if max_pages and pagina >= max_pages:
                break

            if resp.get("paginasRestantes", 0) == 0:
                break

            pagina += 1
            time.sleep(0.5)

        except Exception as e:
            logger.error(f"Erro na página {pagina}: {e}")
            break

    logger.info(f"  Total: {len(todas_caracteristicas)} características (item {codigo_item})")
    return todas_caracteristicas

def main():
    logger.info("=== COLLECTOR: Endpoint 7 — Característica Material ===")
    logger.info("Golden rule: E7 filtra por Item (codigoItem obrigatório)\n")

    # Carrega items reais de E4
    items_reais = []
    try:
        with open("collector_item_material_resultado.json", encoding="utf-8") as f:
            items_data = json.load(f)

        for grupo_key in ["grupo_72", "grupo_78"]:
            items_reais.extend([item["codigoItem"] for item in items_data["data"].get(grupo_key, [])])

        logger.info(f"Total items carregados: {len(items_reais)}")

    except FileNotFoundError:
        logger.warning("E4 não encontrado. Usando sample (item 374066).")
        items_reais = [374066]

    resultado = {}
    resumo_por_grupo = {"grupo_72": [], "grupo_78": []}

    for i, codigo_item in enumerate(items_reais, 1):
        if i % 100 == 0:
            logger.info(f"  [{i}/{len(items_reais)}] processado...")

        caracteristicas = collect_caracteristicas_por_item(codigo_item, max_pages=None)
        resultado[f"item_{codigo_item}"] = caracteristicas

    output = {
        "endpoint": "7_consultarMaterialCaracteristicas",
        "golden_rule": "E7 filtra por codigoItem (não grupo/classe)",
        "data": resultado,
        "resumo": {
            "total_items": len(items_reais),
            "total_caracteristicas_coletadas": sum(len(v) for v in resultado.values())
        }
    }

    with open("collector_caracteristica_material_resultado.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Salvo: collector_caracteristica_material_resultado.json")
    logger.info(f"  Items: {output['resumo']['total_items']}")
    logger.info(f"  Características: {output['resumo']['total_caracteristicas_coletadas']}")

if __name__ == "__main__":
    main()
