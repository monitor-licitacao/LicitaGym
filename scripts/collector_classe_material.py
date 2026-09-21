#!/usr/bin/env python3
"""
Collector: Endpoint 2 — consultarClasseMaterial
Golden rule: apenas classes 7220 (G72) e 7830 (G78)
"""

import json
import logging
from typing import Any, Dict, List, Optional
from scripts.lib.http_fetch import fetch_json, HttpFetchError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/2_consultarClasseMaterial"
TIMEOUT = 30

# Golden rule: apenas estas classes
CLASSES_PERMITIDAS = {72: 7220, 78: 7830}

def fetch_classes(
    codigo_grupo: Optional[int] = None,
    codigo_classe: Optional[int] = None,
    status_classe: Optional[bool] = None,
    pagina: int = 1,
    tamanho_pagina: int = 500
) -> Dict[str, Any]:
    """Consulta classes de material"""
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

    return fetch_json(
        url,
        timeout=TIMEOUT,
        user_agent="LicitaGym/Collector",
        raise_for_status=True,
        legacy_empty_envelope_key="resultado",
    )

def main():
    logger.info("=== COLLECTOR: Endpoint 2 — Classe Material ===")
    logger.info("Golden rule: apenas 7220 (G72) e 7830 (G78)\n")

    resultado = {}

    for grupo, classe in CLASSES_PERMITIDAS.items():
        logger.info(f"G{grupo} classe {classe}...")
        resp = fetch_classes(codigo_grupo=grupo, codigo_classe=classe)
        classes = resp.get("resultado", [])
        resultado[f"grupo_{grupo}"] = classes
        logger.info(f"  {len(classes)} record(s)")

    # Salva
    output = {
        "endpoint": "2_consultarClasseMaterial",
        "golden_rule": "apenas 7220 (G72) e 7830 (G78)",
        "data": resultado
    }

    with open("collector_classe_material_resultado.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Salvo: collector_classe_material_resultado.json")

if __name__ == "__main__":
    main()
