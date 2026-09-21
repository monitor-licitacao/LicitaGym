#!/usr/bin/env python3
"""
Collector: Endpoint 1 — consultarGrupoMaterial
Golden rule: apenas grupos 72 e 78
"""

import json
import logging
from typing import Any, Dict, List, Optional
from scripts.lib.http_fetch import fetch_json, HttpFetchError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/1_consultarGrupoMaterial"
TIMEOUT = 30
GRUPOS_PERMITIDOS = [72, 78]

def fetch_grupos(pagina: int = 1, tamanho_pagina: int = 500, max_retries: int = 3) -> Dict[str, Any]:
    """Consulta Grupos de Material com retry exponencial."""
    url = f"{BASE_URL}{ENDPOINT}?pagina={pagina}&tamanhoPagina={tamanho_pagina}"
    return fetch_json(
        url,
        timeout=TIMEOUT,
        max_retries=max_retries,
        user_agent="LicitaGym/Collector",
        raise_for_status=True,
    )

def collect_grupos(max_pages: Optional[int] = None) -> List[Dict]:
    """Coleta todos os grupos (apenas 72, 78 da golden rule)."""
    logger.info("Coletando Grupos de Material...")

    todos_grupos = []
    pagina = 1
    pages_coletadas = 0

    while True:
        resp = fetch_grupos(pagina=pagina)
        registros = resp.get("resultado", [])

        if not registros:
            logger.info("Fim da paginação")
            break

        for reg in registros:
            codigo_grupo = reg.get("codigoGrupo")
            if codigo_grupo in GRUPOS_PERMITIDOS:
                todos_grupos.append(reg)

        pages_coletadas += 1
        logger.info(f"Página {pagina}: {len(registros)} registros")

        if max_pages and pages_coletadas >= max_pages:
            logger.info(f"Limite de {max_pages} página(s) atingido")
            break

        pagina += 1

    return todos_grupos

def main():
    try:
        grupos = collect_grupos()

        resultado = {
            "endpoint": "1_consultarGrupoMaterial",
            "total_coletados": len(grupos),
            "grupos_permitidos": GRUPOS_PERMITIDOS,
            "resultado": grupos,
        }

        output_file = "collector_grupo_material_resultado.json"
        with open(output_file, "w") as f:
            json.dump(resultado, f, indent=2)

        logger.info(f"\n✓ {len(grupos)} grupos coletados → {output_file}")

        por_grupo = {}
        for g in grupos:
            cg = g.get("codigoGrupo")
            por_grupo[cg] = por_grupo.get(cg, 0) + 1

        for cg in sorted(por_grupo.keys()):
            logger.info(f"  G{cg}: {por_grupo[cg]} registro(s)")

        return 0

    except Exception as e:
        logger.error(f"Falha: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
