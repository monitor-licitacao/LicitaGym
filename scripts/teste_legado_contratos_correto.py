#!/usr/bin/env python3
"""
Teste Fase 2: LEGADO (13 endpoints) + CONTRATOS (5 endpoints) com paths corretos
"""

import json
import logging
from typing import Any, Dict, List
from datetime import datetime, timedelta
from scripts.lib.http_fetch import fetch_json, HttpFetchError

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

    data = fetch_json(url, timeout=TIMEOUT, user_agent="LicitaGym/Test", raise_for_status=True)
    if isinstance(data, dict) and "resultado" in data:
        return data.get("resultado", [])
    elif isinstance(data, list):
        return data
    return []

def test_legado():
    """Testa LEGADO com paths corretos"""
    logger.info("=== TESTE LEGADO (13 endpoints, Lei 8.666) ===")

    endpoints = [
        "/modulo-legado/1_consultarLicitacao",
        "/modulo-legado/2_consultarItemLicitacao",
        "/modulo-legado/3_consultarPregoes",
        "/modulo-legado/4_consultarEdital",
    ]

    for ep in endpoints:
        logger.info(f"\nEndpoint: {ep}")
        data = fetch(ep, {"pagina": 1, "tamanhoPagina": 3})
        logger.info(f"  Registros: {len(data)}")
        if data:
            keys = list(data[0].keys())[:3]
            logger.info(f"  Campos: {keys}")

def test_contratos():
    """Testa CONTRATOS com paths corretos"""
    logger.info("\n=== TESTE CONTRATOS (5 endpoints, Lei 14.133) ===")

    endpoints = [
        "/modulo-contratacoes/1_consultarContratacoes_PNCP_14133",
        "/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133",
        "/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133",
    ]

    for ep in endpoints:
        logger.info(f"\nEndpoint: {ep}")
        data = fetch(ep, {"pagina": 1, "tamanhoPagina": 3})
        logger.info(f"  Registros: {len(data)}")
        if data:
            keys = list(data[0].keys())[:3]
            logger.info(f"  Campos: {keys}")

def test_arp():
    """Testa ARP (Atas de Registro de Preços)"""
    logger.info("\n=== TESTE ARP (8 endpoints) ===")

    endpoints = [
        "/modulo-arp/1_consultarARP",
        "/modulo-arp/2_consultarARPItem",
        "/modulo-arp/3_consultarUnidadesItem",
    ]

    for ep in endpoints:
        logger.info(f"\nEndpoint: {ep}")
        data = fetch(ep, {"pagina": 1, "tamanhoPagina": 3})
        logger.info(f"  Registros: {len(data)}")
        if data:
            keys = list(data[0].keys())[:3]
            logger.info(f"  Campos: {keys}")

def main():
    logger.info("=== FASE 2: TEST com PATHS CORRETOS ===\n")
    test_legado()
    test_contratos()
    test_arp()
    logger.info("\n✓ Teste completo")

if __name__ == "__main__":
    main()
