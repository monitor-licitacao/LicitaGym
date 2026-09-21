#!/usr/bin/env python3
"""
Teste Fase 2: módulos LEGADO (13 endpoints) + CONTRATOS (5 endpoints)
Módulos com dados públicos históricos
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
    """Testa LEGADO (Lei 8.666/1993)"""
    logger.info("=== TESTE LEGADO (Lei 8.666 - 13 endpoints) ===")

    # LEGADO usa filtros de data, testar com 30 dias atrás
    data_fim = datetime.now().date()
    data_inicio = data_fim - timedelta(days=30)

    endpoints = [
        "/modulo-legado/1_consultarLicitacao",
        "/modulo-legado/2_consultarEdital",
        "/modulo-legado/3_consultarEditalDetalhe",
        "/modulo-legado/4_consultarDetalheEdital",
        "/modulo-legado/5_consultarProposta",
        "/modulo-legado/6_consultarPropostaDetalhe",
        "/modulo-legado/7_consultarResultadoCompra",
        "/modulo-legado/8_consultarArquivoEdital",
        "/modulo-legado/9_consultarComentarios",
    ]

    for ep in endpoints:
        logger.info(f"\nEndpoint: {ep}")
        # Tenta com filtro de data (requerido por LEGADO)
        params = {
            "dataVigenciaInicial": str(data_inicio),
            "dataVigenciaFinal": str(data_fim),
            "pagina": 1,
            "tamanhoPagina": 5
        }
        data = fetch(ep, params)
        logger.info(f"  Registros (30 dias): {len(data)}")
        if data:
            keys = list(data[0].keys())[:3]
            logger.info(f"  Campos: {keys}")

def test_contratos():
    """Testa CONTRATOS (Lei 14.133/2021)"""
    logger.info("\n=== TESTE CONTRATOS (Lei 14.133 - 5 endpoints) ===")

    endpoints = [
        "/modulo-contratacoes/1_consultarCompra",
        "/modulo-contratacoes/2_consultarCompraDetalhe",
        "/modulo-contratacoes/3_consultarCompraItem",
        "/modulo-contratacoes/4_consultarFase",
        "/modulo-contratacoes/5_consultarItem",
    ]

    for ep in endpoints:
        logger.info(f"\nEndpoint: {ep}")
        data = fetch(ep, {"pagina": 1, "tamanhoPagina": 5})
        logger.info(f"  Registros: {len(data)}")
        if data:
            keys = list(data[0].keys())[:3]
            logger.info(f"  Campos: {keys}")

def main():
    logger.info("=== FASE 2: TEST LEGADO + CONTRATOS ===\n")
    test_legado()
    test_contratos()
    logger.info("\n✓ Teste completo")

if __name__ == "__main__":
    main()
