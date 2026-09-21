#!/usr/bin/env python3
"""
Collector: PNCP /v1/contratacoes/publicacao
Fase 3: Coleta contratações com items G72/G78 fitness
PARÂMETROS (via schemas-consultas-pncp.md):
- pagina: obrigatório
- tamanhoPagina: máximo 50 (não 500!)
- dataInicial/dataFinal: YYYYMMDD (obrigatório)
- codigoModalidadeContratacao: 6 (licitações)
"""

import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List
from scripts.lib.http_fetch import fetch_json, HttpFetchError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://pncp.gov.br/api/consulta/v1"
ENDPOINT = "/contratacoes/publicacao"
TIMEOUT = 30

ITEMS_E4 = {}

def load_items_e4():
    try:
        with open("collector_item_material_resultado.json", encoding="utf-8") as f:
            data = json.load(f)
        for grupo_key in ["grupo_72", "grupo_78"]:
            for item in data["data"].get(grupo_key, []):
                ITEMS_E4[item["codigoItem"]] = item.get("nomeItem", "")
        logger.info(f"✓ {len(ITEMS_E4)} items carregados de E4")
    except Exception as e:
        logger.error(f"✗ Erro ao carregar E4: {e}")

def fetch_contratacoes(pagina: int, data_inicial: str, data_final: str) -> Dict[str, Any]:
    """GET /v1/contratacoes/publicacao com parâmetros corretos"""
    url = f"{BASE_URL}{ENDPOINT}"

    params = {
        "pagina": pagina,
        "tamanhoPagina": 50,  # MÁXIMO: 50 (não 500)
        "dataInicial": data_inicial,  # YYYYMMDD
        "dataFinal": data_final,      # YYYYMMDD
        "codigoModalidadeContratacao": 6,  # Licitações
    }

    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    return fetch_json(
        url,
        timeout=TIMEOUT,
        user_agent="LicitaGym/Collector",
        raise_for_status=True,
        legacy_empty_envelope_key="data",
    )

def compute_hash(obj: Dict[str, Any]) -> str:
    json_str = json.dumps(obj, sort_keys=True, separators=(',', ':'))
    return hashlib.md5(json_str.encode()).hexdigest()

def main():
    logger.info("=== COLLECTOR: PNCP Contratações (Fase 3) ===\n")

    load_items_e4()

    # Período: últimos 90 dias
    data_fim = datetime.now()
    data_inicio = data_fim - timedelta(days=90)

    data_inicio_str = data_inicio.strftime("%Y%m%d")
    data_fim_str = data_fim.strftime("%Y%m%d")

    logger.info(f"Período: {data_inicio_str} a {data_fim_str}")
    logger.info(f"Modalidade: 6 (licitações)")
    logger.info(f"TamanhoPagina: 50 (máximo)\n")

    precos_encontrados = []
    pagina = 1
    total_processado = 0

    while pagina <= 5:  # Primeiras 5 páginas (teste)
        logger.info(f"[Página {pagina}]")
        resp = fetch_contratacoes(pagina, data_inicio_str, data_fim_str)

        contratacoes = resp.get("data", [])
        if not contratacoes:
            logger.info("✓ Fim da paginação (vazio)")
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
        "endpoint": "/v1/contratacoes/publicacao",
        "periodo": f"{data_inicio_str} a {data_fim_str}",
        "parametros": {
            "tamanhoPagina": 50,
            "codigoModalidadeContratacao": 6,
        },
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
