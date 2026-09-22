#!/usr/bin/env python3
"""
Collector: Endpoint 5 — consultarMaterialNaturezaDespesa
Golden rule: apenas classes 7220 (G72) e 7830 (G78)
Coleta Naturezas de Despesa associadas a items de material.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from scripts.lib.http_fetch import fetch_json, HttpFetchError
from scripts.lib.sync_state import SyncStateManager, is_sync_resume_enabled

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
ENDPOINT = "/modulo-material/5_consultarMaterialNaturezaDespesa"
TIMEOUT = 30

CLASSES_PERMITIDAS = {72: 7220, 78: 7830}

def fetch_naturezas(
    codigo_grupo: Optional[int] = None,
    codigo_classe: Optional[int] = None,
    codigo_item: Optional[int] = None,
    codigo_natureza: Optional[int] = None,
    pagina: int = 1,
    tamanho_pagina: int = 500
) -> Dict[str, Any]:
    """Consulta Naturezas de Despesa"""
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
    if codigo_natureza is not None:
        params["codigoNatureza"] = codigo_natureza

    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{url}?{query_str}"

    return fetch_json(
        url,
        timeout=TIMEOUT,
        user_agent="LicitaGym/Collector",
        raise_for_status=True,
        legacy_empty_envelope_key="resultado",
    )

def collect_naturezas_por_grupo_classe(
    codigo_grupo: int,
    codigo_classe: int,
    max_pages: Optional[int] = None,
    resume: Optional[bool] = None,
    sync_manager: Optional[SyncStateManager] = None,
) -> List[Dict]:
    """Coleta todas naturezas de despesa de um grupo/classe específico com suporte a checkpoint e resume."""
    logger.info(f"\nColetando Naturezas Despesa: G{codigo_grupo} classe {codigo_classe}...")

    if sync_manager is None:
        endpoint_key = f"5_consultarMaterialNaturezaDespesa_G{codigo_grupo}_C{codigo_classe}"
        sync_manager = SyncStateManager(endpoint_key)

    should_resume = is_sync_resume_enabled() if resume is None else resume
    state = sync_manager.start_run(
        resume=should_resume,
        metadata={"grupo": codigo_grupo, "classe": codigo_classe},
    )

    todas_naturezas: List[Dict] = []
    if should_resume and state.last_page > 0:
        if isinstance(state.cursor, dict) and "naturezas" in state.cursor:
            todas_naturezas = list(state.cursor["naturezas"])
        else:
            acc = sync_manager.load_accumulated_data()
            if isinstance(acc, list):
                todas_naturezas = list(acc)
            else:
                out_path = Path("collector_natureza_despesa_resultado.json")
                if out_path.exists():
                    try:
                        with open(out_path, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        key = f"grupo_{codigo_grupo}"
                        if isinstance(data, dict) and isinstance(data.get("data", {}).get(key), list):
                            todas_naturezas = list(data["data"][key])
                    except Exception as e:
                        logger.warning(f"Não foi possível reconstituir naturezas de {out_path}: {e}")

        logger.info(f"Reconstituídas {len(todas_naturezas)} natureza(s) de execuções anteriores")

    pagina = (state.last_page + 1) if (should_resume and state.last_page > 0) else 1
    pages_coletadas = 0

    while True:
        try:
            resp = fetch_naturezas(
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
                cursor={"naturezas": todas_naturezas},
            )
            sync_manager.save_accumulated_data(todas_naturezas)
            raise

        naturezas = resp.get("resultado", [])

        logger.info(f"  Página {pagina}: {len(naturezas)} naturezas")
        todas_naturezas.extend(naturezas)
        pages_coletadas += 1
        sync_manager.record_page_success(
            page=pagina,
            records_in_page=len(naturezas),
            cursor={"naturezas": todas_naturezas},
        )
        sync_manager.save_accumulated_data(todas_naturezas)

        if max_pages and pages_coletadas >= max_pages:
            break

        if resp.get("paginasRestantes", 0) == 0:
            break

        pagina += 1

    total_records = len(todas_naturezas)
    sync_manager.record_completed(total_records=total_records, metadata_update={"total_records": total_records})
    logger.info(f"  Total: {len(todas_naturezas)} naturezas")
    return todas_naturezas

def main():
    logger.info("=== COLLECTOR: Endpoint 5 — Natureza Despesa ===")
    logger.info("Golden rule: apenas 7220 (G72) e 7830 (G78)\n")

    try:
        resultado = {}

        for grupo, classe in CLASSES_PERMITIDAS.items():
            key = f"grupo_{grupo}"
            naturezas = collect_naturezas_por_grupo_classe(grupo, classe)
            resultado[key] = naturezas

        output = {
            "endpoint": "5_consultarMaterialNaturezaDespesa",
            "golden_rule": "apenas 7220 (G72) e 7830 (G78)",
            "data": resultado,
            "resumo": {
                "total_grupo_72": len(resultado.get("grupo_72", [])),
                "total_grupo_78": len(resultado.get("grupo_78", [])),
            }
        }

        with open("collector_natureza_despesa_resultado.json", "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        logger.info(f"\n✓ Salvo: collector_natureza_despesa_resultado.json")
        logger.info(f"  G72: {output['resumo']['total_grupo_72']} naturezas")
        logger.info(f"  G78: {output['resumo']['total_grupo_78']} naturezas")
        return 0
    except Exception as e:
        logger.error(f"Falha na coleta de naturezas: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
