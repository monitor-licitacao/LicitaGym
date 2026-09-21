#!/usr/bin/env python3
"""
Extrai schema OpenAPI completo (77 endpoints) e salva como JSON.
Roda uma vez, depois renomeia pra schema.json
"""

import urllib.request
import json
from collections import defaultdict

BASE_URL = "https://dadosabertos.compras.gov.br/v3/api-docs"

print("Extraindo schema OpenAPI completo...")

with urllib.request.urlopen(BASE_URL, timeout=30) as resp:
    openapi = json.loads(resp.read().decode())

paths = openapi.get("paths", {})
endpoints_por_modulo = defaultdict(list)

# Agrupa por módulo
for path in sorted(paths.keys()):
    if "modulo-" not in path:
        continue

    parts = path.split("/")
    if len(parts) < 2:
        continue

    modulo_name = parts[1]  # e.g., "modulo-pgc"
    methods = paths[path]

    for method in ["get", "post", "put", "delete"]:
        if method in methods:
            op = methods[method]
            endpoints_por_modulo[modulo_name].append({
                "metodo": method.upper(),
                "path": path,
                "operationId": op.get("operationId", ""),
                "summary": op.get("summary", "")[:100]
            })

# Mapeia módulo_name -> numero + nome
MODULO_NOMES = {
    "modulo-material": ("01", "CATÁLOGO - MATERIAL"),
    # "modulo-servico": ("02", "CATÁLOGO - SERVIÇO"),  # Excluído: não usa serviços
    "modulo-pesquisa-preco": ("03", "PESQUISA DE PREÇO"),
    "modulo-pgc": ("04", "PGC"),
    "modulo-uasg": ("05", "UASG"),
    "modulo-legado": ("06", "LEGADO"),
    "modulo-contratacoes": ("07", "CONTRATAÇÕES"),
    "modulo-arp": ("08", "ARP"),
    "modulo-contratos": ("09", "CONTRATOS"),
    "modulo-fornecedor": ("10", "FORNECEDOR"),
    "modulo-ocds": ("11", "OCDS"),
    "modulo-indicadores": ("97", "INDICADORES"),
}

modulos_resultado = []

for modulo_key in sorted(endpoints_por_modulo.keys()):
    if modulo_key not in MODULO_NOMES:
        continue

    numero, nome = MODULO_NOMES[modulo_key]
    endpoints = endpoints_por_modulo[modulo_key]

    modulos_resultado.append({
        "modulo": f"{numero} - {nome}",
        "descricao": f"Módulo {numero}: {nome}",
        "total_endpoints": len(endpoints),
        "endpoints": endpoints
    })

resultado = {
    "fonte_documentacao": "https://documenter.getpostman.com/view/13166820/2sA3XJjPpR",
    "fonte_openapi": "https://dadosabertos.compras.gov.br/v3/api-docs",
    "swagger_ui": "https://dadosabertos.compras.gov.br/swagger-ui/index.html",
    "titulo_api": "API Compras.gov.br",
    "descricao_api": "Compras Públicas em Dados Abertos",
    "base_url": "https://dadosabertos.compras.gov.br",
    "total_endpoints": len(paths),
    "total_modulos": len(modulos_resultado),
    "modulos": modulos_resultado
}

# Salva
with open("docs/compras-gov/comprasgov_schema_77endpoints.json", "w", encoding="utf-8") as f:
    json.dump(resultado, f, indent=2, ensure_ascii=False)

print(f"✓ Schema salvo: comprasgov_schema_77endpoints.json")
print(f"  Total: {len(paths)} endpoints em {len(modulos_resultado)} módulos")
