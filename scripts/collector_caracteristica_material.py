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
    codigo_grupo: Optional[int] = None,
    codigo_classe: Optional[int] = None,
    codigo_item: Optional[int] = None,
    codigo_caracteristica: Optional[int] = None,
    pagina: int = 1,
    tamanho_pagina: int = 500,
    max_retries: int = 3
) -> Dict[str, Any]:
    """Consulta Características de Material com retry exponencial"""
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

def collect_caracteristicas_por_grupo_classe(
    codigo_grupo: int,
    codigo_classe: int,
    max_pages: Optional[int] = None
) -> List[Dict]:
    """Coleta todas características de um grupo/classe específico"""
    logger.info(f"\nColetando Características: G{codigo_grupo} classe {codigo_classe}...")

    todas_caracteristicas = []
    pagina = 1

    while True:
        resp = fetch_caracteristicas(
            codigo_grupo=codigo_grupo,
            codigo_classe=codigo_classe,
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

    logger.info(f"  Total: {len(todas_caracteristicas)} características")
    return todas_caracteristicas

def main():
    logger.info("=== COLLECTOR: Endpoint 7 — Característica Material ===")
    logger.info("Golden rule: apenas 7220 (G72) e 7830 (G78)\n")

    resultado = {}

    for grupo, classe in CLASSES_PERMITIDAS.items():
        key = f"grupo_{grupo}"
        caracteristicas = collect_caracteristicas_por_grupo_classe(grupo, classe)
        resultado[key] = caracteristicas

    output = {
        "endpoint": "7_consultarMaterialCaracteristicas",
        "golden_rule": "apenas 7220 (G72) e 7830 (G78)",
        "data": resultado,
        "resumo": {
            "total_grupo_72": len(resultado.get("grupo_72", [])),
            "total_grupo_78": len(resultado.get("grupo_78", [])),
        }
    }

    with open("collector_caracteristica_material_resultado.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Salvo: collector_caracteristica_material_resultado.json")
    logger.info(f"  G72: {output['resumo']['total_grupo_72']} características")
    logger.info(f"  G78: {output['resumo']['total_grupo_78']} características")

if __name__ == "__main__":
    main()
