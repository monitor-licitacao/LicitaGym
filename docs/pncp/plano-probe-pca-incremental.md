# Plano — probe segmentado e carga incremental do PCA

> Status: **proposto**, não implementado. Escrito em 2026-09-19 a partir de uma execução real
> de `sync-pncp-pca` com `somente_verificacao: true`. Complementa
> [contract-matrix.md](./contract-matrix.md) (contratos de API) e
> [cruzamentos.md](./cruzamentos.md) (junções entre tabelas).

## Contexto

O sync do PCA decide se roda uma carga anual comparando o índice Search do PNCP contra um
lastro em `private.pncp_period_anchor`. Uma execução real com `somente_verificacao: true`
(2026-09-19 15:34) devolveu `status: ignorado`, motivo `periodo_inalterado_desde_ultima_carga`
— comportamento correto. Mas a resposta expôs um descompasso de escopo:

| | endpoint | filtro de classe |
|---|---|---|
| **Probe** (decide se roda) | `/api/search?tipos_documento=pcaorgao` | **não existe** |
| **Carga** (o que roda) | `/api/consulta/v1/pca/` | sim, `codigoClassificacaoSuperior=7830` |

O índice Search é de **PCA por órgão**. `fetchPcaOrgaoPage`
(`supabase/functions/_shared/pncp/search-client.ts`) manda apenas `q=""`,
`tipos_documento=pcaorgao`, `anos` e `ordenacao=-data` — não há onde encaixar grupo 78 / classe
7830. Os `total_indexado: 3948` são todos os órgãos com PCA 2026; a carga filtrada rendeu
**28 planos**. O probe observa ~3.948 órgãos para decidir sobre uma fatia de 28: mais de 99% do
sinal é ruído para um produto segmentado em material de academia.

Consequências, em direções opostas:

- **Falso positivo crônico** — qualquer órgão mexendo em qualquer item move
  `max_data_atualizacao`, o probe diz "mudou", a carga anual roda inteira e não acha nada novo
  em 7830.
- **Cegueira ao que importa** — o probe não sabe responder "mudou algo *em 7830*?". Só sabe
  "mudou algo em algum lugar". Nunca será o gatilho preciso que o produto precisa.

Resultado pretendido: gatilho no mesmo escopo da carga, carga incremental por janela em vez de
tudo-ou-nada anual, e as correções de robustez que a mesma execução revelou.

## O que já está certo (não mexer)

Confirmado no payload real, para não ser "corrigido" por engano:

- **A ordenação do Search é por data de atualização.** `max_data_atualizacao` é idêntico ao
  `data_atualizacao_pncp` do primeiro item da amostra, e os 10 vêm em ordem decrescente. Pegar o
  máximo dos 50 primeiros dá mesmo o máximo global.
- **A âncora é gravada de forma conservadora.** `markPeriodLoadComplete` usa o `summary`
  calculado *antes* da carga; quem atualizar durante a carga fica acima do gravado e dispara a
  próxima. Erra para o lado seguro.
- **Nanossegundos não são problema.** A API devolve `max_data_publicacao` com 9 casas
  (`...641557131`) e o Postgres trunca para 6, mas `Date.parse` corta em milissegundos dos dois
  lados da comparação.

## Fase 1 — Correções pontuais (baratas, independentes)

Arquivos: `_shared/pncp/period-anchor.ts`, `_shared/pncp/search-client.ts`.

1. **`total_indexado` é gravado e nunca comparado.** `shouldSkipAnnualLoad` só olha
   `ultima_data_atualizacao`. Órgãos novos com `data_atualizacao` retroativa fazem o total saltar
   sem mover o máximo — e o sync pula. Guarda de uma linha, estritamente mais conservadora:

   ```ts
   if (summary.total_indexado > (anchor.total_indexado ?? 0)) {
     return { skip: false, reason: "total_indexado_cresceu" };
   }
   ```

2. **Timestamp sem fuso.** A API devolve `"2026-09-18T22:35:08.461614"` — sem `Z`, sem offset.
   `Date.parse` de string assim interpreta como **hora local**. Hoje funciona porque Deno e
   Postgres estão em UTC, mas são duas suposições independentes: em `America/Sao_Paulo` o mesmo
   texto vira um instante 3 h diferente e o skip erra em silêncio, nos dois sentidos. Em
   `parseTs`, normalizar antes de parsear — anexar `Z` quando não houver offset.

3. **`min_data_publicacao` no metadata induz a erro.** É o mínimo *dentro dos 50 da amostra*, não
   da base de 3.948. Renomear para `min_data_publicacao_amostra` ou remover.

4. **Travar a premissa de ordenação.** Se `max_data_atualizacao` não for igual ao
   `data_atualizacao_pncp` do primeiro item da amostra, a ordenação mudou e a premissa caiu.
   Falhar alto (`reason: "ordenacao_inesperada"`, sem pular) em vez de pular carga em silêncio.

## Fase 2 — Probe no escopo da carga

Como a carga já é filtrada, usar o próprio endpoint filtrado como sonda. O envelope da Consulta
devolve `totalRegistros`, então **uma requisição** com
`pagina=1&tamanhoPagina=20&codigoClassificacaoSuperior=7830` dá a contagem exata de planos com
item de academia — sinal no escopo certo, contra os 3.948 órgãos de hoje.

- Novo método em `_shared/pncp/consulta-client.ts`, reusando `getJson` e
  `clampConsultaPageSize("pca", …)` (mínimo 20 — abaixo disso a API devolve 400).
- `total_registros_classe` por classe no `metadata` da âncora, uma entrada por código de
  `resolvePcaClassificacoes` (`_shared/pncp/licitagym-catmat.ts`), não um número solto — o recorte
  é parametrizável e pode passar a ter mais de uma classe.
- **`totalRegistros` pega inclusão e remoção, não edição no lugar** (mudar valor estimado sem
  mudar a contagem). Por isso é sinal primário, e o `max_data_atualizacao` do Search **permanece**
  como secundário: roda a carga se qualquer um dos dois mover. O probe Search não sai.

## Fase 3 — Carga incremental por janela

[contract-matrix.md](./contract-matrix.md) registra `GET /api/consulta/v1/pca/atualizacao` com
`dataInicio`/`dataFim` (⚠️ não `dataInicial`), feito para incremental. O
`consulta-client.ts` tem `fetchContratacoesAtualizacao` mas **não tem o equivalente para PCA** —
endpoint documentado e nunca implementado.

- `fetchPcaAtualizacao({ dataInicio, dataFim, pagina, tamanhoPagina })`, espelhando
  `fetchContratacoesAtualizacao`; datas via `formatPncpDate`.
- Janela = `anchor.ultima_carga_completa` → agora, com margem de segurança para trás (a âncora
  guarda o máximo pré-carga, então sobrepor é barato e evita buraco).
- **Não aceita filtro de classe** — o recorte 7830 fica do lado de cá, descartando o que não
  interessa depois de receber. Ainda assim muito mais barato que recarregar 2026 inteiro.
- `modo: "completo"` (inativação por `last_seen_sync_id`) continua exigindo carga anual cheia:
  uma janela não enxerga o que sumiu. Manter `forcar: true` como caminho da carga anual.

## Fora do escopo central — não deve se perder

Achado enquanto montava os testes da function, **não** faz parte desta mudança e pede PR próprio:

Todas as functions sobem com `--no-verify-jwt`
(`.github/workflows/deploy-supabase-functions.yml:53`), então a plataforma não valida token. E o
POST de `api-pncp-pca`, quando `validateCronAuth` falha, cai em:

```ts
if (!auth?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
```

Só checa se a string **começa** com `Bearer `. Somados, qualquer um que saiba a URL dispara um
sync com `Authorization: Bearer x` e um `Idempotency-Key`. Correção: exigir `SYNC_CRON_SECRET` de
fato, ou validar o JWT com `admin.auth.getUser(token)`.

## Verificação

1. **Fuso (Fase 1.2)** — rodar `parseTs` com `TZ=UTC` e `TZ=America/Sao_Paulo` sobre
   `"2026-09-18T22:35:08.461614"`. Antes da correção os dois divergem em 3 h; depois, iguais.
   É o teste que prova a correção, não só que ela compila.
2. **`total_indexado` (Fase 1.1)** — âncora com `total_indexado` menor e mesmo
   `ultima_data_atualizacao`: `shouldSkipAnnualLoad` tem que devolver `skip: false`,
   `reason: "total_indexado_cresceu"`.
3. **Probe segmentado (Fase 2)** — invocar com `somente_verificacao: true` e conferir
   `total_registros_classe["7830"]` contra `select count(*) from pca_planos where ativo` após uma
   carga completa. Divergência aqui significa que o filtro do probe e o da carga não batem.
4. **Incremental (Fase 3)** — rodar a janela, depois `forcar: true` com carga anual, e comparar
   contagem e `payload_hash` dos itens. Devem convergir; se o incremental perder linha, a janela
   está curta.
5. **Não regredir** — `somente_verificacao: true` continua devolvendo `carga_necessaria` e
   `motivo`, e `upsertByHash` continua marcando `inalterado` na segunda execução seguida.

## Riscos e limites

- Nada disto está `verified` contra o Swagger ao vivo: o ambiente onde o plano foi escrito bloqueia
  `pncp.gov.br` e `dadosabertos.compras.gov.br`. `totalRegistros` no envelope do
  `/pca/` e os parâmetros de `/pca/atualizacao` vêm de `contract-matrix.md`, não de chamada
  minha. **Confirmar antes de mergear** — o gate do contract-matrix continua valendo.
- O probe Search **não sai**: vira sinal secundário. Remover trocaria um probe impreciso por um
  cego a edições no lugar.
- Fases 1 e 2 são independentes e podem ir em PRs separados; a Fase 3 muda o modelo de carga e
  merece PR próprio com a Fase 2 já mergeada.

## Pendente do plano anterior (não perder)

- **Drift de schema** — `catmat_*` e `pca_item_pdm` existem no banco e em nenhuma migration.
  Bloqueia `supabase/sql/catmat_item_completo.sql` e `precos_praticados.sql` virarem migration.
  Depende do MCP Supabase autenticado (`scripts/introspect-catmat.sql`).
- **113 itens de PCA sem PDM** — medir antes se o código de catálogo já está no payload bruto
  (`select jsonb_object_keys(payload) … from private.source_record where resource_type like 'pca%'`).
  Se estiver, é backfill determinístico, não similaridade textual.
- **`scripts/probe-compras-api.ps1`** — os três testes decisivos do Dados Abertos seguem sem rodar.
