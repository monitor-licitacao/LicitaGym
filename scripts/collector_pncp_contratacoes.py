#!/usr/bin/env python3
"""
Collector: PNCP /v1/contratacoes/publicacao
Fase 3: Coleta contratações com items G72/G78 fitness
Extrai: fornecedor, preço, quantidade, datas
"""

import json
import urllib.request
import logging
import hashlib
from typing import Any, Dict, List, Optional

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://pncp.gov.br/api/consulta/v1"
ENDPOINT = "/contratacoes/publicacao"
TIMEOUT = 30

ITEMS_E4 = {}

def load_items_e4():
    """Carrega items (codigo_item → id) do collector E4"""
    global ITEMS_E4
    try:
        with open("collector_item_material_resultado.json", encoding="utf-8") as f:
            data = json.load(f)
        for grupo_key in ["grupo_72", "grupo_78"]:
            for item in data["data"].get(grupo_key, []):
                ITEMS_E4[item["codigoItem"]] = item.get("nomeItem", "")
        logger.info(f"Carregados {len(ITEMS_E4)} items de E4")
    except Exception as e:
        logger.error(f"Erro ao carregar E4: {e}")

def fetch_contratacoes(pagina: int = 1, tamanho: int = 50) -> Dict[str, Any]:
    """Consulta contratações PNCP (tamanho máx 50)"""
    url = f"{BASE_URL}{ENDPOINT}"

    params = {"pagina": pagina, "tamanhoPagina": tamanho}
    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "LicitaGym/Collector"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        logger.error(f"Erro fetch: {e}")
        return {"data": []}

def compute_hash(obj: Dict[str, Any]) -> str:
    json_str = json.dumps(obj, sort_keys=True, separators=(',', ':'))
    return hashlib.md5(json_str.encode()).hexdigest()

def main():
    logger.info("=== COLLECTOR: PNCP Contratações (Fase 3) ===")
    logger.info("Golden rule: items G72/G78 fitness\n")

    load_items_e4()

    precos_encontrados = []
    pagina = 1
    total_processado = 0

    while pagina <= 3:  # Limita primeiras 3 páginas (teste)
        logger.info(f"[Página {pagina}]")
        resp = fetch_contratacoes(pagina=pagina, tamanho=50)

        contratacoes = resp.get("data", [])
        if not contratacoes:
            logger.info("Fim da paginação (vazio)")
            break

        logger.info(f"  {len(contratacoes)} contratações")

        for contrato in contratacoes:
            items_contrato = contrato.get("itens", [])
            numero_licitacao = contrato.get("numero", "")
            modalidade = contrato.get("modalidade", "")
            data_pub = contrato.get("dataPublicacao", "")

            for item in items_contrato:
                codigo_item = item.get("codigoItemCatalogo")

                if codigo_item and codigo_item in ITEMS_E4:
                    fornecedores = item.get("fornecedores", [])

                    for fornecedor in fornecedores:
                        preco = fornecedor.get("preco")
                        if preco and preco > 0:
                            preco_rec = {
                                "codigo_item_catalogo": codigo_item,
                                "ni_fornecedor": fornecedor.get("ni", ""),
                                "nome_fornecedor": fornecedor.get("nome", ""),
                                "preco_unitario": preco,
                                "quantidade_contratada": item.get("quantidade", 1),
                                "numero_licitacao": numero_licitacao,
                                "modalidade_licitacao": modalidade,
                                "data_publicacao": data_pub,
                                "payload_hash": compute_hash({
                                    "codigo_item": codigo_item,
                                    "ni_fornecedor": fornecedor.get("ni", ""),
                                    "preco": preco,
                                    "numero_licitacao": numero_licitacao,
                                })
                            }
                            precos_encontrados.append(preco_rec)

        total_processado += len(contratacoes)
        pagina += 1

    output = {
        "endpoint": "/contratacoes/publicacao",
        "golden_rule": "items G72/G78 fitness",
        "resumo": {
            "total_contratacoes_processadas": total_processado,
            "precos_encontrados": len(precos_encontrados),
            "fornecedores_unicos": len(set(p["ni_fornecedor"] for p in precos_encontrados if p.get("ni_fornecedor"))),
        },
        "dados": precos_encontrados
    }

    with open("collector_pncp_contratacoes_resultado.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    logger.info(f"\n✓ Salvo: collector_pncp_contratacoes_resultado.json")
    logger.info(f"  Preços: {output['resumo']['precos_encontrados']}")
    logger.info(f"  Fornecedores: {output['resumo']['fornecedores_unicos']}")

if __name__ == "__main__":
    main()
