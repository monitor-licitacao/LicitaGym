#!/usr/bin/env python3
"""
Collector: Endpoint 2 — consultarClasseMaterial
Consulta classes de material por grupo, classe e/ou status.
"""

import json
import urllib.request
import logging
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/2_consultarClasseMaterial"
TIMEOUT = 30

def fetch_classes(
    codigo_grupo: Optional[int] = None,
    codigo_classe: Optional[int] = None,
    status_classe: Optional[bool] = None,
    pagina: int = 1,
    tamanho_pagina: int = 500
) -> Dict[str, Any]:
    """
    Consulta classes de material.

    Retorna: {resultado: [...], totalRegistros, totalPaginas, paginasRestantes}
    """
    url = f"{BASE_URL}{ENDPOINT}"

    params = {
        "pagina": pagina,
        "tamanhoPagina": tamanho_pagina,
    }

    if codigo_grupo is not None:
        params["codigoGrupo"] = codigo_grupo
    if codigo_classe is not None:
        params["codigoClasse"] = codigo_classe
    if status_classe is not None:
        params["statusClasse"] = "true" if status_classe else "false"

    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    logger.debug(f"Request: {url}")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LicitaGym/Collector"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
            return data
    except Exception as e:
        logger.error(f"Erro fetch: {e}")
        return {"resultado": [], "totalRegistros": 0, "totalPaginas": 0}

def collect_classes_por_grupo(codigo_grupo: int, max_pages: Optional[int] = None) -> List[Dict]:
    """Coleta todas classes de um grupo específico"""
    logger.info(f"\nColetando classes para Grupo {codigo_grupo}...")

    todas_classes = []
    pagina = 1

    while True:
        resp = fetch_classes(codigo_grupo=codigo_grupo, pagina=pagina, tamanho_pagina=500)
        classes = resp.get("resultado", [])

        logger.info(f"  Página {pagina}: {len(classes)} classes")
        todas_classes.extend(classes)

        if max_pages and pagina >= max_pages:
            break

        if resp.get("paginasRestantes", 0) == 0:
            break

        pagina += 1

    logger.info(f"  Total: {len(todas_classes)} classes")
    return todas_classes

def main():
    logger.info("=== COLLECTOR: Endpoint 2 — Consultar Classe Material ===\n")

    # Testa com grupo 72 (Utensílios)
    classes_72 = collect_classes_por_grupo(72, max_pages=3)

    # Testa com grupo 78 (Equipamentos Desportos)
    classes_78 = collect_classes_por_grupo(78, max_pages=3)

    # Salva resultado
    resultado = {
        "endpoint": "2_consultarClasseMaterial",
        "data": {
            "grupo_72": classes_72,
            "grupo_78": classes_78,
        },
        "resumo": {
            "total_grupo_72": len(classes_72),
            "total_grupo_78": len(classes_78),
        }
    }

    with open("collector_classe_material_resultado.json", "w", encoding="utf-8") as f:
        json.dump(resultado, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Resultado salvo em collector_classe_material_resultado.json")
    logger.info(f"  G72: {len(classes_72)} classes")
    logger.info(f"  G78: {len(classes_78)} classes")

if __name__ == "__main__":
    main()
