#!/usr/bin/env python3
"""
Collector: Endpoint 1 — consultarGrupoMaterial
Golden rule: apenas grupos 72 e 78
"""

import json
import urllib.request
import urllib.error
import logging
import time
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/1_consultarGrupoMaterial"
TIMEOUT = 30
GRUPOS_PERMITIDOS = [72, 78]

def fetch_grupos(pagina: int = 1, tamanho_pagina: int = 500, max_retries: int = 3) -> Dict[str, Any]:
    """Consulta Grupos de Material com retry exponencial."""
    url = f"{BASE_URL}{ENDPOINT}?pagina={pagina}&tamanhoPagina={tamanho_pagina}"

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
                logger.error(f"HTTP {e.code}: {e}")
                raise
        except Exception as e:
            logger.error(f"Erro: {e}")
            raise

def collect_grupos(max_pages: Optional[int] = None) -> List[Dict]:
    """Coleta todos os grupos (apenas 72, 78 da golden rule)."""
    logger.info("Coletando Grupos de Material...")

    todos_grupos = []
    pagina = 1
    pages_coletadas = 0

    while True:
        try:
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

        except Exception as e:
            logger.error(f"Erro na página {pagina}: {e}")
            break

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
