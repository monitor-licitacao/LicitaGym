# Runbook P0 — reprojeção `classificacao_catalogo_id` (PCA)

Data: 2026-09-26. Parent: `.audit/30-pncp-l6g-p0-pca-scope-resolvable.md` §1b + `.audit/34-pca-source-projection-reconciliation.md`.

## Decisões (EXEC 02 / revisão)

- Sem UPDATE SQL derivado do dry-run (hash é TypeScript).
- Sem `upsertByHash` (evita `pca_alteracoes`).
- Snapshot obrigatório antes de gravar.
- Stream B (98 `SOURCE_DISCOVERED_BUT_NOT_PERSISTED`) **fora** deste job — só contado como `fonte_sem_projecao`.

## Snapshot: tabela `private.pca_itens_snapshot_p0`

**Escolha:** migration `20260926120000_pca_itens_snapshot_p0.sql` (não JSON no git).

**Por quê:** rollback SQL atômico; sem CSV versionado; sobrevive wipe do Cloud Shell; só `service_role`.

## `updated_at`

Não há trigger em `pca_itens.updated_at`. O job **não** altera `updated_at` — só `classificacao_catalogo_id` e `payload_hash`.

## Lock

Mesmo padrão de `sync-pncp-pca`: `lock_key` default `pca-sync:2026:7830`. Se ocupado → erro explícito (exit 1), sem esperar.

## Sequência operacional

### 0. Snapshot

```bash
# aplicar migration (local/remoto)
supabase db push   # ou sql editor com 20260926120000_pca_itens_snapshot_p0.sql

deno run --allow-net --allow-env --allow-read \
  scripts/ops/reprojetar-pca-classificacao.ts --snapshot-only
# anotar snapshot_id do JSON
```

### 1. Conferir workflows agendados

```bash
rg -n "sync-pncp-pca" .github/workflows
```

Deploy em push `main` **existe** (`.github/workflows/deploy-supabase-functions.yml`) — isso é desejável para publicar o mapper. **Não** há cron GitHub para sync PCA; o cron é Supabase (`pg_cron`). Confirmar que nenhum job PCA está ativo antes do passo 6:

```sql
select jobid, schedule, command from cron.job where command ilike '%pca%';
```

Desativar se houver.

### 2. Merge

Merge do PR P0 (normalize + job) em `main`. Aguardar deploy Edge Functions.

### 3. Dry-run

```bash
deno run --allow-net --allow-env --allow-read \
  scripts/ops/reprojetar-pca-classificacao.ts --dry-run
```

Esperado: `atualizados` ≈ 3331 (planejados), `STALE`/`erros` baixos, **zero** writes.

### 4. Lote de teste

```bash
deno run --allow-net --allow-env --allow-read \
  scripts/ops/reprojetar-pca-classificacao.ts --limite 50 --confirmar \
  --snapshot-id <id-do-passo-0>
```

### 5. Validação (leitura)

```sql
select count(*) filter (where classificacao_catalogo_id is null) as vazios,
       count(*) filter (where classificacao_catalogo_id = '1') as material,
       count(*) filter (where classificacao_catalogo_id = '2') as servico,
       (select count(*) from public.pca_alteracoes) as alteracoes
from public.pca_itens;
-- alteracoes deve permanecer 3948
```

### 6. Confirmar todos

```bash
deno run --allow-net --allow-env --allow-read \
  scripts/ops/reprojetar-pca-classificacao.ts --confirmar \
  --snapshot-id <id-do-passo-0>
```

### 7. Validação final

Mesmo SQL do passo 5. Esperado: vazios = 0 (ou = STALE), material ≈ 3330, serviço = 1, alteracoes = 3948.

### 8. Reativar sync

Reativar cron / jobs PCA pausados no passo 1.

## Rollback

```bash
deno run --allow-net --allow-env --allow-read \
  scripts/ops/reprojetar-pca-classificacao.ts --rollback --snapshot-id <id>
```

Restaura `classificacao_catalogo_id` + `payload_hash`. **Não** grava `pca_alteracoes`.

## Relatório

JSON stdout: `alvo`, `atualizados`, `ja_atualizado`, `STALE_SOURCE_MISMATCH`, `sem_fonte`, `fonte_sem_projecao`, `valor_1`, `valor_2`, `outros`, `erros`, `duracao_s`, `snapshot_id`, `sync_run_id`.
