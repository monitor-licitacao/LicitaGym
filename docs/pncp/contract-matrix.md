# Matriz de contratos PNCP (CLA-34)

Fonte definitiva: Swagger e manual oficial. Status `verified` = confirmado no OpenAPI ou manual v1.0.

| recurso | camada | método | path | auth | params obrigatórios | paginação | chave natural | lacunas |
|---------|--------|--------|------|------|---------------------|-----------|---------------|---------|
| PCA listagem (itens por classificação) | consulta | GET | `/api/consulta/v1/pca/` | nenhuma | `anoPca`, `codigoClassificacaoSuperior`, `pagina` | `tamanhoPagina` (20–500; omitir = ~200); retorno `paginasRestantes`, `totalRegistros`, `data[]` com `idPcaPncp` + `itens[]` | `idPcaPncp` (`{CNPJ14}-0-{seq6}/{ano}`) | CATMAT grupo/classe ou CATSER seção |
| PCA órgão (índice Search) | search | GET | `/api/search/` | nenhuma | `tipos_documento=pcaorgao`, `pagina` | `tam_pagina`, `anos`, `ordenacao=-data` | `orgao_cnpj` + `ano` | **Lastro de período:** `data_publicacao_pncp`, `data_atualizacao_pncp` — decide se roda carga anual |
| PCA atualização global | consulta | GET | `/api/consulta/v1/pca/atualizacao` | nenhuma | `dataInicio`, `dataFim`, `pagina` | ⚠️ params `dataInicio`/`dataFim` (não `dataInicial`) | `idPcaPncp` | alternativa incremental por janela |
| PCA por usuário | consulta | GET | `/api/consulta/v1/pca/usuario` | nenhuma | `anoPca`, `idUsuario`, `pagina` | idem | `idPcaPncp` | `idUsuario` é portal PNCP, não usuário Monitor |
| PCA detalhe órgão | integração | GET | `/api/pncp/v1/orgaos/{cnpj}/pca/{ano}/{sequencial}` | credencial órgão | `cnpj`, `ano`, `sequencial` | — | `cnpj` + `ano` + `sequencial` | uso para enriquecimento, não listagem global |
| PCA itens | integração | GET | `/api/pncp/v1/orgaos/{cnpj}/pca/{ano}/{sequencial}/itens` | credencial órgão | path + `pagina` | `pagina`, `tamanhoPagina` | `(idPcaPncp, numeroItem)` | — |
| Contratações publicação | consulta | GET | `/api/consulta/v1/contratacoes/publicacao` | nenhuma | `dataInicial`, `dataFinal`, `codigoModalidadeContratacao`, `pagina` | `pagina`, `tamanhoPagina` (10–50) | `numeroControlePNCP` / `cnpj`+`ano`+`sequencial` | exige modalidade por consulta |
| Contratações proposta | consulta | GET | `/api/consulta/v1/contratacoes/proposta` | nenhuma | `dataFinal`, `pagina` | idem | idem | — |
| Contratações atualização | consulta | GET | `/api/consulta/v1/contratacoes/atualizacao` | nenhuma | `dataInicial`, `dataFinal`, `codigoModalidadeContratacao`, `pagina` | idem | idem | preferível para incremental |
| Contratação detalhe | consulta | GET | `/api/consulta/v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` | nenhuma | path | — | `cnpj`+`anoCompra`+`sequencialCompra` | — |
| Atas vigência | consulta | GET | `/api/consulta/v1/atas` | nenhuma | `dataInicial`, `dataFinal`, `pagina` | `pagina`, `tamanhoPagina` (10–500) | `numeroControlePNCP` ata | — |
| Atas atualização | consulta | GET | `/api/consulta/v1/atas/atualizacao` | nenhuma | `dataInicial`, `dataFinal`, `pagina` | idem | idem | — |
| Contratos publicação | consulta | GET | `/api/consulta/v1/contratos` | nenhuma | `dataInicial`, `dataFinal`, `pagina` | idem | `numeroControlePNCP` contrato | — |
| Contratos atualização | consulta | GET | `/api/consulta/v1/contratos/atualizacao` | nenhuma | `dataInicial`, `dataFinal`, `pagina` | idem | idem | — |
| IRP listagem global | consulta | — | — | — | — | — | — | **LACUNA**: manual consulta v1.0 não expõe listagem IRP |
| IRP detalhe | integração | GET | `/api/pncp/v1/orgaos/{cnpj}/irp/{ano}/{sequencial}` | credencial órgão | path | — | `cnpj`+`ano`+`sequencial` | ingestão exige descoberta por órgão monitorado |
| IRP itens | integração | GET | `/api/pncp/v1/orgaos/{cnpj}/irp/{ano}/{sequencial}/itens` | credencial órgão | path + `pagina` | `pagina`, `tamanhoPagina` | `(irp_key, numeroItem)` | — |
| Órgãos | integração | GET | `/api/pncp/v1/orgaos/{cnpj}` | variável | `cnpj` | — | `cnpj` (14 dígitos) | — |
| Unidades | integração | GET | `/api/pncp/v1/orgaos/{cnpj}/unidades/{codigoUnidade}` | variável | path | — | `cnpj`+`codigoUnidade` | — |
| Catálogos | integração | GET | `/api/pncp/v1/catalogos`, `/v1/catalogos/{id}` | variável | — | — | `id` | — |
| Categoria PCA | integração | GET | `/api/pncp/v1/categoriaItemPcas`, `/{id}` | variável | — | — | `id` | — |
| Usuário PNCP | integração | GET/POST | `/api/pncp/v1/usuarios`, `/login` | credencial | `login` ou `cpfCnpj` | — | `id` usuário PNCP | **MVP: não ingerir** (PII/CPF — CLA-40) |
| Legislação | scrape | GET | `https://www.gov.br/pncp/pt-br/pncp/legislacao` | nenhuma | — | — | `url_canonica` + `sha256` | sem API REST; hash de página + arquivos |

## Chaves naturais confirmadas

- **PCA órgão (Search):** portal `https://pncp.gov.br/app/pca/{CNPJ14}/{ano}` (`item_url` vem como `/pca/...` — prefixar `/app`)
- **PCA plano (Consulta):** `idPcaPncp` = `{CNPJ14}-{segmento}-{seqPad}/{ano}` (ex.: `06740278000181-0-000005/2026`); portal `https://pncp.gov.br/app/pca/{CNPJ14}-{segmento}-{seqPad}/{ano}`; integração `GET /orgaos/{cnpj}/pca/{ano}/{sequencial}/itens` com `sequencial` = parte numérica de `seqPad` (ex.: `5`)
- **PCA item:** `(id_pca_pncp, numero_item)`
- **Compra/edital:** `numeroControlePNCP` = `{CNPJ14}-1-{seqCompraPad}/{anoCompra}`; portal `https://pncp.gov.br/app/editais/{cnpj}/{anoCompra}/{sequencialCompra}` (`sequencialCompra` = numérico de `seqCompraPad`, ex.: `000015` → `15`)
- **Ata:** `numeroControlePNCPAta` = `{CNPJ14}-1-{seqCompraPad}/{anoCompra}-{seqAtaPad}`; portal `https://pncp.gov.br/app/atas/{cnpj}/{anoCompra}/{sequencialCompra}/{sequencialAta}` (4 segmentos — **não** 3)
- **Contrato:** `numeroControlePNCP` = `{CNPJ14}-2-{seqContratoPad}/{anoContrato}`; portal `https://pncp.gov.br/app/contratos/{cnpj}/{anoContrato}/{sequencialContrato}` (`sequencialContrato` alinha com campo homônimo da Consulta)
- **IRP:** `{cnpj, ano, sequencial}` — sem listagem consulta; gate ativo até endpoint público existir

## Gate de migrations

Migrations de domínio (`pca_*`, `irp_*`, `contratacoes_*`) só avançam com linha `verified` acima. IRP sync permanece desabilitado até estratégia de descoberta documentada.

## Cruzamentos entre domínios

O mapa de junções entre tabelas (FKs reais, junções polimórficas, candidatas não materializadas e
lacunas de integridade) está em [cruzamentos.md](./cruzamentos.md). A seção *Dados Abertos Compras*
desta matriz ainda não existe: o Swagger não pôde ser lido, e o gate acima vale — sem linha
`verified`, sem migration de domínio.

## Referências

- [Swagger Consulta](https://pncp.gov.br/api/consulta/swagger-ui/index.html)
- [Swagger Integração](https://pncp.gov.br/api/pncp/swagger-ui/index.html)
- [Manual API Consultas v1.0](https://www.gov.br/pncp/pt-br/pncp/copy_of_manuais/ManualPNCPAPIConsultasVerso1.0.pdf)
