#!/usr/bin/env python3
"""
Collector: Endpoint 6 — consultarMaterialUnidadeFornecimento
Golden rule: apenas classes 7220 (G72) e 7830 (G78)
Coleta Unidades de Fornecimento com retry exponencial para rate-limiting.
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional
from scripts.lib.http_fetch import fetch_json, HttpFetchError
from scripts.lib.sync_state import SyncStateManager, is_sync_resume_enabled

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/6_consultarMaterialUnidadeFornecimento"
TIMEOUT = 30

CLASSES_PERMITIDAS = {72: 7220, 78: 7830}

def fetch_unidades(
    codigo_grupo: Optional[int] = None,
    codigo_classe: Optional[int] = None,
    codigo_item: Optional[int] = None,
    codigo_unidade: Optional[int] = None,
    pagina: int = 1,
    tamanho_pagina: int = 500,
    max_retries: int = 3
) -> Dict[str, Any]:
    """Consulta Unidades de Fornecimento com retry exponencial"""
    url = f"{BASE_URL}{ENDPOINT}"

    params = {
        "pagina": pagina,
        "tamanhoPagina": tamanho_pagina,
    }

    if codigo_grupo is not None:
        params["codigoGrupo"] = codigo_grupo
    if codigo_classe is not None:
        params["codigoClasse"] = codigo_classe
    if codigo_item is not None:
        params["codigoItem"] = codigo_item
    if codigo_unidade is not None:
        params["codigoUnidade"] = codigo_unidade

    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    return fetch_json(
        url,
        timeout=TIMEOUT,
        max_retries=max_retries,
        user_agent="LicitaGym/Collector",
        raise_for_status=True,
        legacy_empty_envelope_key="resultado",
    )

def collect_unidades_por_grupo_classe(
    codigo_grupo: int,
    codigo_classe: int,
    max_pages: Optional[int] = None,
    resume: Optional[bool] = None,
    sync_manager: Optional[SyncStateManager] = None,
) -> List[Dict]:
    """Coleta todas unidades de fornecimento de um grupo/classe específico com suporte a checkpoint e resume."""
    logger.info(f"\nColetando Unidades Fornecimento: G{codigo_grupo} classe {codigo_classe}...")

    if sync_manager is None:
        endpoint_key = f"6_consultarMaterialUnidadeFornecimento_G{codigo_grupo}_C{codigo_classe}"
        sync_manager = SyncStateManager(endpoint_key)

    should_resume = is_sync_resume_enabled() if resume is None else resume
    state = sync_manager.start_run(
        resume=should_resume,
        metadata={"grupo": codigo_grupo, "classe": codigo_classe},
    )

    todas_unidades = []
    pagina = (state.last_page + 1) if (should_resume and state.last_page > 0) else 1
    pages_coletadas = 0

    while True:
        try:
            resp = fetch_unidades(
                codigo_grupo=codigo_grupo,
                codigo_classe=codigo_classe,
                pagina=pagina,
                tamanho_pagina=500
            )
        except Exception as e:
            sync_manager.record_partial_failure(
                e,
                page=pagina,
                error_details={"grupo": codigo_grupo, "classe": codigo_classe},
            )
            raise

        unidades = resp.get("resultado", [])

        if not unidades:
            logger.info(f"  Página {pagina}: vazio")
            break

        logger.info(f"  Página {pagina}: {len(unidades)} unidades")
        todas_unidades.extend(unidades)
        pages_coletadas += 1
        sync_manager.record_page_success(page=pagina, records_in_page=len(unidades))

        if max_pages and pages_coletadas >= max_pages:
            break

        if resp.get("paginasRestantes", 0) == 0:
            break

        pagina += 1
        time.sleep(0.5)

    total_records = state.total_records
    sync_manager.record_completed(total_records=total_records)
    logger.info(f"  Total: {len(todas_unidades)} unidades (esta execução)")
    return todas_unidades

def main():
    logger.info("=== COLLECTOR: Endpoint 6 — Unidade Fornecimento ===")
    logger.info("Golden rule: apenas 7220 (G72) e 7830 (G78)\n")

    try:
        resultado = {}

        for grupo, classe in CLASSES_PERMITIDAS.items():
            key = f"grupo_{grupo}"
            unidades = collect_unidades_por_grupo_classe(grupo, classe)
            resultado[key] = unidades

        output = {
            "endpoint": "6_consultarMaterialUnidadeFornecimento",
            "golden_rule": "apenas 7220 (G72) e 7830 (G78)",
            "data": resultado,
            "resumo": {
                "total_grupo_72": len(resultado.get("grupo_72", [])),
                "total_grupo_78": len(resultado.get("grupo_78", [])),
            }
        }

        with open("collector_unidade_fornecimento_resultado.json", "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        logger.info(f"\n✓ Salvo: collector_unidade_fornecimento_resultado.json")
        logger.info(f"  G72: {output['resumo']['total_grupo_72']} unidades")
        logger.info(f"  G78: {output['resumo']['total_grupo_78']} unidades")
        return 0
    except Exception as e:
        logger.error(f"Falha na coleta de unidades: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
