# Schemas para consultas — PNCP Consulta × LicitaGym

Referência para montar queries SQL e validar normalizers das Edge Functions de sync.

- **Base URL:** `https://pncp.gov.br/api/consulta/v1`
- **Matriz de contratos:** [`contract-matrix.md`](./contract-matrix.md)
- **Compras.gov (CATMAT):** [`../compras-gov/schemas-consultas.md`](../compras-gov/schemas-consultas.md)
- **Cruzamentos:** [`cruzamentos.md`](./cruzamentos.md)

---

## Envelope de resposta (endpoints paginados)

| Campo API | Tipo | Descrição |
|-----------|------|-----------|
| `data` | `array` | Itens da página |
| `totalRegistros` | int64 | Total no filtro |
| `totalPaginas` | int64 | Páginas totais |
| `numeroPagina` | int64 | Página atual |
| `paginasRestantes` | int64 | Páginas após a atual |
| `empty` | boolean | Lista vazia |

**Erro de validação:** `RespostaErroValidacaoDTO` — `message`, `path`, `timestamp`, `status`, `error`.

**Query params comuns (Consulta)**

| Param | Endpoints | Observação |
|-------|-----------|------------|
| `pagina` | maioria | Obrigatório |
| `tamanhoPagina` | ver tabela abaixo | **Não** é 500 em todos os GETs — limites por família |
| `dataInicial` / `dataFinal` | atas, contratos, contratações | Janela de vigência/publicação |
| `dataInicio` / `dataFim` | PCA atualização | ⚠️ **não** usar `dataInicial` neste endpoint |

**Limites reais de `tamanhoPagina` (schema + probe 2026-09-19)**

| Família | Endpoints | Mín–máx (schema) | Confirmado com `tamanhoPagina=500` |
|---------|-----------|------------------|-------------------------------------|
| Atas | `/v1/atas`, `/v1/atas/atualizacao` | 10–500 | ✅ aceita 500 |
| Contratos | `/v1/contratos`, `/v1/contratos/atualizacao` | 10–500 | ✅ aceita 500 (1× 500 transitório no backend) |
| PCA | `/v1/pca/usuario`, `/v1/pca/atualizacao` | — | ✅ aceita 500 |
| PCA listagem | `/v1/pca/` | 20–500 | ⚠️ ver hang abaixo — não usar valor inválido em `codigoClassificacaoSuperior` |
| Contratações | `/v1/contratacoes/publicacao`, `/proposta`, `/atualizacao` | 10–**50** | ❌ **400** `"Tamanho de página inválido"` |
| Instrumentos cobrança | `/v1/instrumentoscobranca/inclusao` | — | ❌ **400** — limite real **100** |

Implementação LicitaGym: `clampConsultaPageSize()` em `consulta-client.ts` — defaults no máximo permitido por família (`contratacoes` 50, `pca`/`atasContratos` 500, `instrumentosCobranca` 100). Compras.gov: `clampComprasGovPageSize()` (default 500).

### Teste empírico — `tamanhoPagina=500` (2026-09-19)

Probe direto na API (fetch same-origin, sem CORS). Base: `https://pncp.gov.br/api/consulta`. Todos os GETs paginados testados com `tamanhoPagina=500`, salvo onde o endpoint rejeitou.

| Endpoint | Parâmetros de teste | Resultado com `tamanhoPagina=500` |
|----------|---------------------|-----------------------------------|
| `GET /v1/atas` | `dataInicial=20240101`, `dataFinal=20240110` | **200 OK**, dados retornados. Limite real = **500** (confere com schema). |
| `GET /v1/atas/atualizacao` | idem | **200 OK**. |
| `GET /v1/contratacoes/publicacao` | `dataInicial`/`dataFinal` + `codigoModalidadeContratacao=6` | **400** `"Tamanho de página inválido"`. Limite real = **50** (schema `maximum: 50`). |
| `GET /v1/contratacoes/proposta` | `dataFinal=20261231` + `codigoModalidadeContratacao=6` | **400** mesmo erro. Limite real = **50**. |
| `GET /v1/contratacoes/atualizacao` | idem publicação | **400** mesmo erro. Limite real = **50**. |
| `GET /v1/contratos` | `dataInicial=20240101`, `dataFinal=20240110` | 1ª tentativa: **500** `"Erro na comunicação com o banco de dados"` (transitório). Repetido: **200 OK**. Limite real = **500**. |
| `GET /v1/contratos/atualizacao` | idem | **200 OK**. |
| `GET /v1/instrumentoscobranca/inclusao` | `dataInicial`/`dataFinal` | **400** `"Tamanho de página inválido"`. Limite real = **100**. |
| `GET /v1/pca/usuario` | `anoPca=2024`, `idUsuario=1` (fictício) | **204 No Content** — paginação 500 aceita; sem dados para esse usuário. |
| `GET /v1/pca/atualizacao` | `dataInicio=20240101`, `dataFim=20240110` | **200 OK**. |
| `GET /v1/pca/` (raiz) | `anoPca=2024`, `codigoClassificacaoSuperior=1` (sonda — doc não lista valores válidos) | **Travou** — sem resposta em >180s, mesmo com `tamanhoPagina` menor. Não parece paginação: `codigoClassificacaoSuperior` inválido suspeito de full scan/lock no backend. Hang derrubou conexão do Chrome na sessão. **Reteste pendente** com valor válido (ex.: `7830`). |
| `GET /v1/orgaos/{cnpj}/compras/{ano}/{sequencial}` | recurso único, sem paginação; CNPJ/ano/sequencial reais de contrato | **200 OK**. |

**Achado principal:** nem todo GET aceita `tamanhoPagina=500`. Os três endpoints de `contratacoes/*` capam em **50**; `instrumentoscobranca/inclusao` capa em **100**. Só `atas*`, `contratos*`, `pca/usuario` e `pca/atualizacao` suportam **500** de fato.

**Pendência:** domínio de valores válidos de `codigoClassificacaoSuperior` em `/v1/pca/` — Swagger não documenta; LicitaGym usa `7830` (CATMAT classe academia). Retestar `/v1/pca/` isoladamente após reabrir aba/extensão para separar hang de parâmetro vs. instabilidade do endpoint.

---

## 1. PCA — `PlanoContratacaoComItensDoUsuarioDTO`

**GET** `/v1/pca/` — LicitaGym filtra `codigoClassificacaoSuperior=7830`  
**GET** `/v1/pca/usuario` — mesmo DTO (não usado no sync atual)

Envelope: `PaginaRetornoPlanoContratacaoComItensDoUsuarioDTO`

### 1.1 Plano → `pca_planos`

| Campo API | Tipo | Postgres | Sync |
|-----------|------|----------|------|
| `idPcaPncp` | string | `id_pca_pncp` | ✅ |
| `anoPca` | int | `ano_exercicio` | ✅ |
| `orgaoEntidadeCnpj` | string | `orgao_cnpj` | ✅ |
| `codigoUnidade` | string | `unidade_codigo` | ✅ |
| `nomeUnidade` | string | `titulo` | ✅ |
| `orgaoEntidadeRazaoSocial` | string | `descricao` | ✅ |
| `dataPublicacaoPNCP` | date-time | `data_publicacao` | ✅ |
| `dataAtualizacaoGlobalPCA` | date-time | `data_atualizacao_origem` | ✅ |

**Chave natural:** `id_pca_pncp` = `{CNPJ14}-{segmento}-{seqPad}/{ano}`

### 1.2 Item → `pca_itens`

| Campo API | Tipo | Postgres | Sync |
|-----------|------|----------|------|
| `numeroItem` | int | `numero_item` | ✅ |
| `descricaoItem` | string | `descricao` | ✅ |
| `categoriaItemPcaNome` | string | `categoria` | ✅ |
| `classificacaoSuperiorCodigo` | string | `classe_material_servico` + `codigo_classe_catmat` | ✅ |
| `quantidadeEstimada` | number | `quantidade` | ✅ |
| `unidadeFornecimento` | string | `unidade_medida` | ✅ |
| `valorUnitario` | number | `valor_unitario_estimado` | ✅ |
| `valorTotal` | number | `valor_total_estimado` | ✅ |
| `dataDesejada` | date | `data_prevista_contratacao` | ✅ |
| `pdmCodigo` | string | `pdm_codigo_origem` | ✅ → `pca_item_pdm` se PDM existir |
| `codigoItem` | string | `codigo_item_origem` | ✅ → `catalogo_ponte` se item existir |
| `pdmDescricao` | string | — | payload bruto |
| `grupoContratacaoCodigo/Nome` | string | — | v2 |
| `classificacaoCatalogoId` | int64 | — | id interno PNCP |

**Chave natural:** `(pca_plano_id, numero_item)`

---

## 2. Edital/compra — `RecuperarCompraDTO`

**GET** `/v1/contratacoes/publicacao`, `/proposta`, `/atualizacao`  
**Tabela:** `contratacoes_editais` — `normalizeEdital()`

| Campo API | Tipo | Postgres | Sync |
|-----------|------|----------|------|
| `numeroControlePNCP` | string | `numero_controle_pncp` | ✅ |
| `orgaoEntidade.cnpj` | string | `orgao_cnpj` | ✅ |
| `anoCompra` / `sequencialCompra` | int | `ano` / `sequencial` | ✅ |
| `processo` | string | `numero_processo` | ✅ |
| `modalidadeId` | int64 | `modalidade_codigo` | ✅ |
| `objetoCompra` | string | `objeto` | ✅ |
| `informacaoComplementar` | string | `descricao` | ✅ |
| `valorTotalEstimado` | number | `valor_estimado` | ✅ |
| `dataPublicacaoPncp` | date-time | `data_publicacao` | ✅ |
| `dataAberturaProposta` | date-time | `data_abertura` | ✅ |
| `dataEncerramentoProposta` | date-time | `data_encerramento` | ✅ |
| `dataAtualizacaoGlobal` | date-time | `data_atualizacao_origem` | ✅ |
| `situacaoCompraNome` | string | `status` | ✅ |
| `srp` | boolean | — | v2 (prioriza sync de atas) |
| `valorTotalHomologado` | number | — | v2 |
| `unidadeOrgao` / `orgaoEntidade` | object | `unidade_id` / `orgao_id` | FK não resolvida |

**Chave natural:** `(orgao_cnpj, ano, sequencial)` ou `numero_controle_pncp`

---

## 3. Ata — item em `PaginaRetornoAtaRegistroPrecoPeriodoDTO`

**GET** `/v1/atas`, `/v1/atas/atualizacao`  
**Tabela:** `contratacoes_atas` — `normalizeAta()`

| Campo API | Tipo | Postgres | Sync |
|-----------|------|----------|------|
| `numeroControlePNCPAta` | string | `numero_controle_pncp` | ✅ |
| `cnpjOrgao` | string | `orgao_cnpj` | ✅ |
| `numeroControlePNCPCompra` | string | `processo_origem` | ✅ |
| `objetoContratacao` | string | `objeto` | ✅ |
| `dataAssinatura` | date-time | `data_assinatura` | ✅ (date) |
| `vigenciaInicio` / `vigenciaFim` | date-time | `vigencia_inicio` / `vigencia_fim` | ✅ (date) |
| `dataPublicacaoPncp` | date-time | `data_publicacao` | ✅ |
| `cancelado` | boolean | `status` | ✅ (`ativa` / `cancelada`) |
| `possibilidadeAdesao` | boolean | — | v2 / participantes |
| `numeroAtaRegistroPreco` | string | — | v2 |
| `edital_id` | — | FK | candidata via `processo_origem` |

**Chave natural:** `numeroControlePNCPAta` = `{CNPJ14}-1-{seqCompraPad}/{anoCompra}-{seqAtaPad}`  
**Índice:** `(orgao_cnpj, ano, sequencial_ata)` — migration `202609180017`

---

## 4. Contrato — `RecuperarContratoDTO`

**GET** `/v1/contratos`, `/v1/contratos/atualizacao`  
**Tabela:** `contratacoes_contratos` — `normalizeContrato()`

| Campo API | Tipo | Postgres | Sync |
|-----------|------|----------|------|
| `numeroControlePNCP` | string | `numero_controle_pncp` | ✅ |
| `orgaoEntidade.cnpj` | string | `orgao_cnpj` | ✅ |
| `anoContrato` / `sequencialContrato` | int | `ano` / `sequencial` | ✅ |
| `processo` | string | `processo_origem` | ✅ |
| `objetoContrato` | string | `objeto` | ✅ |
| `valorInicial` | number | `valor_inicial` | ✅ |
| `valorGlobal` | number | `valor_atual` | ✅ |
| `dataAssinatura` | date | `data_assinatura` | ✅ |
| `dataVigenciaInicio` / `dataVigenciaFim` | date | `vigencia_inicio` / `vigencia_fim` | ✅ |
| `dataPublicacaoPncp` | date-time | `data_publicacao` | ✅ |
| `numeroControlePncpCompra` | string | `edital_id` | FK candidata |
| `numeroControlePncpAta` | string | `ata_id` | FK candidata |
| `niFornecedor` | string | `fornecedor_id` | FK candidata |
| `identificadorCipi` / `urlCipi` | string | — | v2 |

---

## 5. Instrumento de cobrança — `ConsultarInstrumentoCobrancaDTO`

**Sem sync v1.** Inclui NFe (`notaFiscalEletronica`), empenho e `recuperarContratoDTO` aninhado.

Candidato futuro: `contratacoes_instrumentos_cobranca` ligado por `(cnpj, ano, sequencialContrato)`.

---

## Datas e tipos Postgres

| Uso | Tipo API | Coluna Postgres | Normalizer |
|-----|----------|-----------------|------------|
| Vigência / assinatura | date-time ou date | `date` | `readOptionalDate()` → `YYYY-MM-DD` |
| Publicação / atualização | date-time | `timestamptz` | pass-through |
| PCA data desejada | date | `date` | pass-through |

---

## Normalizers (`supabase/functions/_shared/pncp/normalize.ts`)

| Função | DTO origem |
|--------|------------|
| `normalizePcaPlano` / `normalizePcaItem` | `PlanoContratacaoComItensDoUsuarioDTO` |
| `normalizeEdital` | `RecuperarCompraDTO` |
| `normalizeAta` | item de `PaginaRetornoAtaRegistroPrecoPeriodoDTO` |
| `normalizeContrato` | `RecuperarContratoDTO` |

Vínculo automático PCA→CATMAT quando o PNCP informa códigos: `pca-origem-link.ts` (chamado por `sync-pncp-pca`).
