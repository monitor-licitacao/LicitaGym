#!/usr/bin/env python3
"""
Collector: Endpoint 5 — consultarMaterialNaturezaDespesa
Golden rule: apenas classes 7220 (G72) e 7830 (G78)
Coleta Naturezas de Despesa associadas a items de material.
"""

import json
import urllib.request
import logging
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/5_consultarMaterialNaturezaDespesa"
TIMEOUT = 30

CLASSES_PERMITIDAS = {72: 7220, 78: 7830}

def fetch_naturezas(
    codigo_grupo: Optional[int] = None,
    codigo_classe: Optional[int] = None,
    codigo_item: Optional[int] = None,
    codigo_natureza: Optional[int] = None,
    pagina: int = 1,
    tamanho_pagina: int = 500
) -> Dict[str, Any]:
    """Consulta Naturezas de Despesa"""
    url = f"{BASE_URL}{ENDPOINT}"

    params = {
        "pagina": pagina,
        "tamanhoPagina": tamanho_pagina,
    }

    if codigo_grupo is not None:
        params["codigoGrupo"] = codigo_grupo
    if codigo_classe is not None:
        params["codigoClasse"] = codigo_classe
    if codigo_item is not None:
        params["codigoItem"] = codigo_item
    if codigo_natureza is not None:
        params["codigoNatureza"] = codigo_natureza

    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LicitaGym/Collector"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
            return data
    except Exception as e:
        logger.error(f"Erro: {e}")
        return {"resultado": []}

def collect_naturezas_por_grupo_classe(
    codigo_grupo: int,
    codigo_classe: int,
    max_pages: Optional[int] = None
) -> List[Dict]:
    """Coleta todas naturezas de despesa de um grupo/classe específico"""
    logger.info(f"\nColetando Naturezas Despesa: G{codigo_grupo} classe {codigo_classe}...")

    todas_naturezas = []
    pagina = 1

    while True:
        resp = fetch_naturezas(
            codigo_grupo=codigo_grupo,
            codigo_classe=codigo_classe,
            pagina=pagina,
            tamanho_pagina=500
        )
        naturezas = resp.get("resultado", [])

        logger.info(f"  Página {pagina}: {len(naturezas)} naturezas")
        todas_naturezas.extend(naturezas)

        if max_pages and pagina >= max_pages:
            break

        if resp.get("paginasRestantes", 0) == 0:
            break

        pagina += 1

    logger.info(f"  Total: {len(todas_naturezas)} naturezas")
    return todas_naturezas

def main():
    logger.info("=== COLLECTOR: Endpoint 5 — Natureza Despesa ===")
    logger.info("Golden rule: apenas 7220 (G72) e 7830 (G78)\n")

    resultado = {}

    for grupo, classe in CLASSES_PERMITIDAS.items():
        key = f"grupo_{grupo}"
        naturezas = collect_naturezas_por_grupo_classe(grupo, classe)
        resultado[key] = naturezas

    output = {
        "endpoint": "5_consultarMaterialNaturezaDespesa",
        "golden_rule": "apenas 7220 (G72) e 7830 (G78)",
        "data": resultado,
        "resumo": {
            "total_grupo_72": len(resultado.get("grupo_72", [])),
            "total_grupo_78": len(resultado.get("grupo_78", [])),
        }
    }

    with open("collector_natureza_despesa_resultado.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Salvo: collector_natureza_despesa_resultado.json")
    logger.info(f"  G72: {output['resumo']['total_grupo_72']} naturezas")
    logger.info(f"  G78: {output['resumo']['total_grupo_78']} naturezas")

if __name__ == "__main__":
    main()
