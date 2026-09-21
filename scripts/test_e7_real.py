#!/usr/bin/env python3
import json
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/7_consultarMaterialCaracteristicas"

def test_e7(codigo_item: int):
    """Testa E7 com item real"""
    url = f"{BASE_URL}{ENDPOINT}?pagina=1&tamanhoPagina=500&codigoItem={codigo_item}"

    logger.info(f"Testando E7 com item {codigo_item}")
    logger.info(f"URL: {url}\n")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LicitaGym/Collector"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))

            logger.info(f"Status: OK")
            logger.info(f"Características: {len(data.get('resultado', []))}")

            if data.get('resultado'):
                logger.info(f"\n=== PRIMEIRAS CARACTERÍSTICAS ===")
                for i, carac in enumerate(data['resultado'][:3], 1):
                    print(json.dumps(carac, indent=2, ensure_ascii=False))
                    if i < 3:
                        print("---")
            else:
                logger.warning("VAZIO: Endpoint 7 não retornou características para este item")

            logger.info(f"\nResposta completa:")
            print(json.dumps(data, indent=2, ensure_ascii=False)[:800])

    except Exception as e:
        logger.error(f"Erro: {e}")

test_e7(374066)
