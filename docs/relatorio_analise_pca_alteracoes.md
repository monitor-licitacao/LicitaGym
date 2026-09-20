# Relatório: pca_planos × pca_alteracoes

**Data da execução:** 2026-09-19  
**Projeto Supabase:** `ifaiagegyicjzlpskafh`  
**Recorte:** classe `7830` (gate via `EXISTS` em `pca_itens.classe_material_servico`)

---

## Resposta direta

**Quantas alterações existem?** **3.792** registros em `pca_alteracoes`.

| Métrica | Valor |
|---------|------:|
| Total | 3.792 |
| `insert` | 3.719 |
| `update` | 73 |
| Atribuídas ao recorte (join com plano 7830) | 3.279 |
| Órfãs (`pca_plano_id IS NULL`) | 513 |
| `pca_item_id` preenchido | 0 |
| Updates sem `dados_novos` | 73 (= 100% dos updates) |
| Sync runs distintos | 217 |

**Por quê?** Hoje **não dá para responder campo a campo**. Motivos:

1. **513 órfãs** são histórico de upsert em `pca_planos` sem `pca_plano_id` (defeito A — corrigido no código, dados antigos permanecem órfãos).
2. **Todos os 73 updates** gravaram só `payload_hash_anterior` / `payload_hash_novo`, sem `dados_anteriores` / `dados_novos` (defeito B — corrigido no código).
3. **`pca_item_id` nunca foi preenchido** (defeito C — corrigido no código).
4. **`inativacao` / `reativacao` nunca foram gravados** (defeito D — pendente decisão de schema vs. histórico em `inactivateNotSeen`).

Interpretação honesta da pergunta original: **não houve “alteração de negócio” auditável ainda** — o que existe é **registro de ingestão** (`insert` da carga/reprocessamento) mais **73 updates de hash** sem diff. Os 10 planos com mais linas no join têm **só inserts** (84, 83, 71…), todos `apenas_insert_sync`.

---

## Top 10 planos (amostra determinística: mais alterações atribuídas)

| id_pca_pncp | CNPJ | Total | Inserts | Updates | Interpretação |
|-------------|------|------:|--------:|--------:|---------------|
| 46377800000127-0-000073/2026 | 46377800000127 | 84 | 84 | 0 | apenas_insert_sync |
| 76205640000108-0-000002/2026 | 76205640000108 | 83 | 83 | 0 | apenas_insert_sync |
| 42498600000171-0-000012/2026 | 42498600000171 | 71 | 71 | 0 | apenas_insert_sync |
| 92242080000100-0-000001/2026 | 92242080000100 | 61 | 61 | 0 | apenas_insert_sync |
| 46341038000129-0-000001/2026 | 46341038000129 | 55 | 55 | 0 | apenas_insert_sync |
| 29427465000105-0-000001/2026 | 29427465000105 | 54 | 54 | 0 | apenas_insert_sync |
| 08778326000156-0-000001/2026 | 08778326000156 | 52 | 52 | 0 | apenas_insert_sync |
| 42498600000171-0-000004/2026 | 42498600000171 | 44 | 44 | 0 | apenas_insert_sync |
| 00394452000103-0-000074/2026 | 00394452000103 | 40 | 40 | 0 | apenas_insert_sync |
| 00394452000103-0-000175/2026 | 00394452000103 | 40 | 40 | 0 | apenas_insert_sync |

Órfãs (não entram no top 10): **513** linhas — 499 inserts + 14 updates de plano.

Updates por origem:

| tipo | com `pca_plano_id` | órfãs |
|------|-------------------:|------:|
| insert | 3.220 | 499 |
| update | 59 | 14 |

---

## Testes de integridade (executados)

| # | Teste | Resultado | Esperado | Status |
|---|-------|----------:|----------|--------|
| 1 | `count(*)` em `pca_alteracoes` | **3.792** | > 0 | OK |
| 2 | `pca_plano_id IS NULL` | **513** | > 0 (defeito A) | Confirma A |
| 3 | `pca_item_id IS NOT NULL` | **0** | 0 (defeito C) | Confirma C |
| 4 | updates sem `dados_novos` | **73 / 73** | = total updates (defeito B) | Confirma B |
| 5 | `GROUP BY tipo_operacao` | insert 3719, update 73 | só insert/update (defeito D) | Confirma D |
| 6 | plano_id inexistente | **0** | 0 | OK |
| 7 | sync_run inválido | **0** | 0 | OK |
| 8 | por sync_run | 217 runs; maioria insert por run (26–31 linhas/run) | carga incremental multi-run | OK |
| 9 | classes em `pca_itens` | **7830** | só 7830 | OK |
| 10 | planos sem item 7830 | **0** | 0 | OK |
| 11 | itens classe nula | **0** | 0 | OK |

**Gate com vs sem filtro EXISTS:**

| Métrica | Valor |
|---------|------:|
| Total sem filtro | 3.792 |
| Atribuídas ao recorte (join plano) | 3.279 |
| Órfãs não classificáveis pelo gate | 513 |

Hoje **475/475 planos** passam no gate; total “sem gate” = total “com órfãs incluídas” (3.792). Se no futuro `PNCP_PCA_CLASSIFICACOES` misturar classes, o teste #9 e a comparação acima detectam vazamento.

---

## Falha do assistente anterior (regressão)

- Entregou SQL com CTE partido em múltiplos statements (`planos_analisados` fora de escopo) — **nunca executável** como arquivo único.
- Relatório sem números; “motivo” tautológico via `CASE tipo_operacao`.
- Amostra por `created_at DESC` (timestamp de sync, não negócio).
- Ignorou gate 7830 e órfãs.

**Arquivos novos:**

- `supabase/sql/analise_pca_alteracoes_dashboard.sql` — consulta única executável (Dashboard/MCP)
- `supabase/sql/analise_pca_alteracoes.sql` — variante psql + comentários
- `supabase/sql/teste_integridade_pca_alteracoes.sql` — 11 testes + comparação de gate

---

## Fase 3 — correções no pipeline (implementadas)

| Defeito | Correção |
|---------|----------|
| **A** | `sync-pncp-pca`: `historyFields: ({ rowId }) => ({ pca_plano_id: rowId })` no upsert de plano |
| **B** | `upsert.ts`: em update, grava `dados_anteriores` (linha lida) e `dados_novos` (`fullRow`) |
| **C** | `sync-pncp-pca`: `pca_item_id: rowId` no upsert de item |
| **D** | **Pendente:** `inactivateNotSeen` ainda não grava histórico; CHECK ainda lista `inativacao`/`reativacao` |

**Próximo passo de verificação:** deploy de `sync-pncp-pca` + rodar sync duas vezes; na 2ª execução sem mudança de payload, `upsertByHash` deve retornar `inalterado` (sem churn). Com mudança real, novo update deve trazer jsonb diff.

---

## Regras para o prompt do assistente

1. Pergunta com número → **executar** SQL e colar resultado.
2. Antes de “por quê”, verificar se `dados_anteriores`/`dados_novos` existem.
3. “Teste integridade” → rodar `teste_integridade_pca_alteracoes.sql`, não descrever schema.
4. Gate `7830` explícito em toda análise PCA (`EXISTS` em `pca_itens`).
5. Contar órfãs (`pca_plano_id IS NULL`) — não deixar defeito A sumir no join.
