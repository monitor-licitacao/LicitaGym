#!/usr/bin/env python3
"""
Teste Fase 2: módulos PGC (3 endpoints JSON) + UASG (2 endpoints JSON)
Total: 5 endpoints JSON, estruturas pequenas
"""

import json
import urllib.request
import logging
from typing import Any, Dict, List

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
TIMEOUT = 30

def fetch(path: str, params: Dict[str, Any] | None = None) -> List[Dict]:
    """Fetch e retorna array resultado"""
    url = f"{BASE_URL}{path}"
    if params:
        query_str = "&".join(f"{k}={v}" for k, v in params.items())
        url = f"{url}?{query_str}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LicitaGym/Test"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, dict) and "resultado" in data:
                return data.get("resultado", [])
            elif isinstance(data, list):
                return data
            return []
    except Exception as e:
        logger.error(f"Erro {path}: {e}")
        return []

def test_pgc():
    """Testa 3 endpoints PGC JSON"""
    logger.info("=== TESTE PGC (3 endpoints JSON) ===")

    endpoints = [
        "/modulo-pgc/1_consultarPgcDetalhe",
        "/modulo-pgc/2_consultarPgcDetalheCatalogo",
        "/modulo-pgc/3_consultarPgcAgregacao",
    ]

    for ep in endpoints:
        logger.info(f"\nEndpoint: {ep}")
        data = fetch(ep, {"pagina": 1, "tamanhoPagina": 5})
        logger.info(f"  Registros: {len(data)}")
        if data:
            keys = list(data[0].keys())[:5]
            logger.info(f"  Campos: {keys}")

def test_uasg():
    """Testa 2 endpoints UASG JSON"""
    logger.info("\n=== TESTE UASG (2 endpoints JSON) ===")

    endpoints = [
        "/modulo-uasg/1_consultarUasg",
        "/modulo-uasg/2_consultarOrgao",
    ]

    for ep in endpoints:
        logger.info(f"\nEndpoint: {ep}")
        data = fetch(ep, {"pagina": 1, "tamanhoPagina": 5})
        logger.info(f"  Registros: {len(data)}")
        if data:
            keys = list(data[0].keys())[:5]
            logger.info(f"  Campos: {keys}")

def main():
    logger.info("=== FASE 2: TEST PGC + UASG ===\n")
    test_pgc()
    test_uasg()
    logger.info("\n✓ Teste completo")

if __name__ == "__main__":
    main()
