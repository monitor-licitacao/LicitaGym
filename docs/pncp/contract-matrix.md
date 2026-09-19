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

## Dados Abertos Compras — inventário de módulos (de `compras_gov_schemas.json`)

Levantado de `compras_gov_schemas.json` e de [schemas-consultas.md](./schemas-consultas.md),
não do Swagger ao vivo. Nenhuma linha é `verified`: o gate acima continua valendo.
O mapa campo-da-API → coluna-Postgres está em `schemas-consultas.md` seções 1.x e 3.1 —
**é ele que vale para nome de coluna, não o DTO.**

| módulo | DTOs | relevância |
|--------|------|-----------|
| CATÁLOGO - MATERIAL | `DmMaterialGrupoDTO`, `DmMaterialClasseDTO`, `DmMaterialPDMDTO`, **`DmMaterialItemDTO`**, `DmMaterialUnidadeFornecimentoDTO`, `DmMaterialNaturezaDespesaDTO`, `DmMaterialCaracteristicasDTO` | fonte oficial do CATMAT; `DmMaterialItemDTO` é a entidade de item que falta no banco |
| CATÁLOGO - SERVIÇO (CATSER) | `DmServicoSecaoDTO`, `DmServicoDivisaoDTO`, `DmServicoGrupoDTO`, `DmServicoClasseDTO`, `DmServicoSubClasseDTO`, `DmServicoItemDTO`, `DmServicoUndMedidaDTO`, `DmServicoNaturezaDespesaDTO` | hierarquia de 6 níveis, diferente da de material (3); `catalogo_itens.codigo_catser` existe e está vazio |
| PESQUISA DE PREÇO | `FtPesqPrecoCompraMaterialDTO` + `...DetalheDTO`, `FtPesqPrecoCompraServicoDTO` + `...DetalheDTO` | preço praticado; material implementado em `supabase/sql/precos_praticados.sql`, serviço ainda não |
| PGC / plano de contratações | `FtPgcAgregacaoDTO`, **`FtPgcDetalheDTO`** | `FtPgcDetalheDTO` traz o item do PCA com `codigoPdmMaterial`, `codigoItemCatalogo`, `valorUnitarioItem`, `numeroItemPncp` — **é uma fonte mais rica do PCA que a API Consulta do PNCP que usamos hoje** |
| Espelho PNCP | `VwFtPNCPCompraDTO`, `VwFtPNCPCompraItemDTO`, `VwDmPNCPItemResultadoDTO` | traz `numeroControlePNCP` + `codItemCatalogo` + `codigoPdm` na mesma linha: é a ponte entre Compras.gov e o PNCP |
| ARP (atas) | `VwFtArpDTO`, `VwFtArpItemDTO`, `VwFtArpUnidadesItemDTO`, `VwFtArpAdesoesItemDTO`, `VwArpEmpenhosItemDTO` | atas com saldo de adesão e empenho — não existe equivalente na API Consulta |
| Contratos | `VwFtContratoDTO`, `VwFtContratoItemDTO` | contrato com item e `numeroControlePncpContrato` |
| Licitações / pregões legados | `TbVwLicitacaoDTO`, `TbVwPregaoDTO`, `TbVwItensPregaoDTO`, `TbVwItemLicitacaoDTO`, `TbVwRdcDTO`, `TbVwComprasSemLicitacaoDTO`, `TbVwCompraItensSemLicitacaoDTO` | base SIASG anterior à 14.133 |
| Órgãos e UASG | `DmCorpOrgaoDTO`, `DmCorpUasgDTO` | dimensão oficial para `orgaos`/`unidades`, com `codigoMunicipioIbge` |
| Fornecedores | `VwFtFornecedorDTO` | porte, natureza jurídica, CNAE — enriquece `entidades` |
| OCDS | `VwOCDSApiResponseDTO` e agregados | padrão internacional, formato aninhado |
| Usuários / KPIs | `UsuariosDTO`, `AutenticacaoDTO`, `VwKpis*DTO` | **fora de escopo** (ver abaixo) |

### Achados que valem antes de qualquer ingestão

1. **`idCompra` muda de tipo entre os dois endpoints de preço:** `integer/int64` em
   `FtPesqPrecoCompraMaterialDTO`, `string` em `...DetalheDTO`. Valores de 17 dígitos
   estouram `Number.MAX_SAFE_INTEGER` — `JSON.parse` em Deno perde precisão antes de
   qualquer código nosso rodar. Detalhe em `supabase/sql/precos_praticados.sql`, nota 1.
2. **`codigoPdm` não tem tipo único:** `int64` nos DTOs de material, `string` nos de
   preço, ARP-unidades e espelho PNCP, `int32` em `VwFtArpItemDTO`. Zero à esquerda
   quebra junção em silêncio. Normalizar dos dois lados.
3. **PII espalhada, além do endpoint de usuários.** `UsuariosDTOResponse` expõe `senha`
   em DTO de resposta. `TbVwCompraItensSemLicitacaoDTO` tem `nu_cpf_vencedor` e três
   CPFs de responsáveis; `TbVwItemLicitacaoDTO` tem `cpf_vencedor`; `VwFtFornecedorDTO`
   tem `cpf`; `FtPesqPrecoCompraMaterialDTO.niFornecedor` pode ser CPF de pessoa física.
   A decisão CLA-40 em [security-mvp.md](./security-mvp.md) cobria só `/usuarios` —
   **precisa ser reaberta** para esses campos antes de ingerir esses módulos.
4. `VwKpisGeralDTO` tem uma propriedade literalmente chamada `"2026-04-26"` — bug no
   Swagger deles; ignorar o campo.

## Cruzamentos entre domínios

O mapa de junções entre tabelas (FKs reais, junções polimórficas, candidatas não materializadas e
lacunas de integridade) está em [cruzamentos.md](./cruzamentos.md). A seção *Dados Abertos Compras*
desta matriz ainda não existe: o Swagger não pôde ser lido, e o gate acima vale — sem linha
`verified`, sem migration de domínio.

## Referências

- [Swagger Consulta](https://pncp.gov.br/api/consulta/swagger-ui/index.html)
- [Swagger Integração](https://pncp.gov.br/api/pncp/swagger-ui/index.html)
- [Manual API Consultas v1.0](https://www.gov.br/pncp/pt-br/pncp/copy_of_manuais/ManualPNCPAPIConsultasVerso1.0.pdf)
