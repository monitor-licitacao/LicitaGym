#!/usr/bin/env python3
"""
Teste CATMAT: consolida 7 endpoints para grupos 72 + 78.
Gera dados unificados prontos para tabela icatmat_pdm_completa.

Endpoints:
1. consultarGrupoMaterial -> grupos[72,78]
2. consultarClasseMaterial -> classes por grupo
3. consultarPdmMaterial -> PDMs por grupo
4. consultarItemMaterial -> items por grupo (base)
5. consultarMaterialCaracteristicas -> características por item (agregar)
6. consultarMaterialUnidadeFornecimento -> unidades por PDM (agregar)
7. consultarMaterialNaturezaDespesa -> naturezas por PDM (agregar)

Join: Item (base) <- Grupo/Classe/PDM (1:1) + Características/Unidades/Naturezas (1:N)
"""

import httpx
import json
import hashlib
import logging
from typing import Any, Dict, List
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.compras.gov.br"
GRUPOS = [72, 78]
TIMEOUT = 30

async def fetch(path: str, params: Dict[str, Any] | None = None) -> List[Dict]:
    """Fetch e retorna array resultado"""
    url = f"{BASE_URL}{path}"
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        try:
            resp = await client.get(url, params=params, headers={"User-Agent": "LicitaGym/Test"})
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and "resultado" in data:
                return data.get("resultado", [])
            elif isinstance(data, list):
                return data
            return []
        except Exception as e:
            logger.error(f"Erro {path}: {e}")
            return []

async def test_catmat():
    """Consolida 7 endpoints em records unificados"""

    logger.info(f"=== TESTE CATMAT GRUPOS {GRUPOS} ===")

    # 1. Fetch grupos
    logger.info("Carregando grupos...")
    grupos = await fetch("/modulo-material/1_consultarGrupoMaterial", {"pagina": 1, "tamanhoPagina": 500})
    grupos_dict = {g["codigoGrupo"]: g for g in grupos if g["codigoGrupo"] in GRUPOS}
    logger.info(f"  {len(grupos_dict)} grupos encontrados")

    if not grupos_dict:
        logger.error("Nenhum grupo 72 ou 78 encontrado!")
        return

    # 2. Fetch classes por grupo
    logger.info("Carregando classes...")
    classes_dict = {}
    for grupo_id in GRUPOS:
        classes = await fetch("/modulo-material/2_consultarClasseMaterial",
                             {"codigoGrupo": grupo_id, "pagina": 1, "tamanhoPagina": 500})
        for c in classes:
            key = (c["codigoGrupo"], c["codigoClasse"])
            classes_dict[key] = c
    logger.info(f"  {len(classes_dict)} classes encontradas")

    # 3. Fetch PDMs por grupo
    logger.info("Carregando PDMs...")
    pdms_dict = {}
    for grupo_id in GRUPOS:
        pdms = await fetch("/modulo-material/3_consultarPdmMaterial",
                          {"codigoGrupo": grupo_id, "pagina": 1, "tamanhoPagina": 500})
        for p in pdms:
            pdms_dict[p["codigoPdm"]] = p
    logger.info(f"  {len(pdms_dict)} PDMs encontrados")

    # 4. Fetch items por grupo (base chave)
    logger.info("Carregando itens...")
    items = []
    for grupo_id in GRUPOS:
        grupo_items = await fetch("/modulo-material/4_consultarItemMaterial",
                                 {"codigoGrupo": grupo_id, "pagina": 1, "tamanhoPagina": 500})
        items.extend(grupo_items)
    logger.info(f"  {len(items)} itens encontrados")

    if not items:
        logger.error("Nenhum item encontrado!")
        return

    # 5. Fetch características por item
    logger.info("Carregando características...")
    caracteristicas_dict = {}  # codigo_item -> [...]
    for item in items[:10]:  # Teste com primeiros 10
        caract = await fetch("/modulo-material/7_consultarMaterialCaracteristicas",
                            {"codigoItem": item["codigoItem"], "pagina": 1, "tamanhoPagina": 500})
        if caract:
            caracteristicas_dict[item["codigoItem"]] = caract
    logger.info(f"  {len(caracteristicas_dict)} itens com características")

    # 6. Fetch unidades por PDM
    logger.info("Carregando unidades de fornecimento...")
    unidades_dict = {}  # codigo_pdm -> [...]
    for pdm_id in list(pdms_dict.keys())[:5]:  # Teste com primeiros 5 PDMs
        unidades = await fetch("/modulo-material/6_consultarMaterialUnidadeFornecimento",
                              {"codigoPdm": pdm_id, "pagina": 1, "tamanhoPagina": 500})
        if unidades:
            unidades_dict[pdm_id] = unidades
    logger.info(f"  {len(unidades_dict)} PDMs com unidades")

    # 7. Fetch naturezas por PDM
    logger.info("Carregando naturezas de despesa...")
    naturezas_dict = {}  # codigo_pdm -> [...]
    for pdm_id in list(pdms_dict.keys())[:5]:  # Teste com primeiros 5 PDMs
        naturezas = await fetch("/modulo-material/5_consultarMaterialNaturezaDespesa",
                               {"codigoPdm": pdm_id, "pagina": 1, "tamanhoPagina": 500})
        if naturezas:
            naturezas_dict[pdm_id] = naturezas
    logger.info(f"  {len(naturezas_dict)} PDMs com naturezas")

    # Consolidação: JOIN item (base) + grupo + classe + pdm + características + unidades + naturezas
    logger.info("\nConsolidando registros unificados...")
    consolidated = []

    for item in items[:10]:  # Teste com primeiros 10 itens
        grupo_id = item["codigoGrupo"]
        classe_id = item["codigoClasse"]
        pdm_id = item["codigoPdm"]
        item_id = item["codigoItem"]

        grupo = grupos_dict.get(grupo_id, {})
        classe = classes_dict.get((grupo_id, classe_id), {})
        pdm = pdms_dict.get(pdm_id, {})
        caracteristicas = caracteristicas_dict.get(item_id, [])
        unidades = unidades_dict.get(pdm_id, [])
        naturezas = naturezas_dict.get(pdm_id, [])

        payload = {
            "codigo_grupo": grupo_id,
            "nome_grupo": grupo.get("nomeGrupo"),
            "status_grupo_ep1": grupo.get("statusGrupo"),
            "codigo_classe": classe_id,
            "nome_classe": classe.get("nomeClasse"),
            "codigo_pdm": pdm_id,
            "nome_pdm": pdm.get("nomePdm"),
            "codigo_item": item_id,
            "descricao_item": item.get("descricaoItem"),
            "status_item_ep4": item.get("statusItem"),
            "item_sustentavel": item.get("itemSustentavel"),
            "codigo_ncm": item.get("codigo_ncm"),
            "descricao_ncm": item.get("descricao_ncm"),
            "caracteristicas": caracteristicas,
            "unidades_fornecimento": unidades,
            "naturezas_despesa": naturezas,
            "data_sincronizacao": datetime.now().isoformat(),
        }

        # Hash para detect duplicatas
        hash_input = f"{grupo_id}:{item_id}:{item.get('descricaoItem', '')}"
        payload["payload_hash"] = hashlib.md5(hash_input.encode()).hexdigest()

        consolidated.append(payload)

    logger.info(f"  {len(consolidated)} registros consolidados (teste com 10 primeiros itens)")

    # Salva resultado
    output_file = "teste_catmat_consolidado.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(consolidated, f, indent=2, ensure_ascii=False)

    logger.info(f"\nResultado salvo em: {output_file}")
    logger.info(f"Estrutura: {len(consolidated[0]) if consolidated else 0} campos por record")

    # Resumo
    print("\n" + "="*60)
    print("RESUMO CONSOLIDAÇÃO CATMAT")
    print("="*60)
    print(f"Grupos processados: {list(grupos_dict.keys())}")
    print(f"Itens encontrados: {len(items)}")
    print(f"Registros consolidados: {len(consolidated)}")
    print(f"Arquivo de saída: {output_file}")
    print("="*60)

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_catmat())
