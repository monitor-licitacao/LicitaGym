# ini-04 — Syncs LicitaGym (Kuib Harness)

Painel desktop para inventário, invoke manual e observação de sync jobs PNCP/CATMAT.

## Escopo MVP

- Inventário `SYNC_INVENTORY` espelhando Edge Functions do monorepo LicitaGym
- Invoke via `POST /functions/v1/<function>` com `Authorization: Bearer SYNC_CRON_SECRET` (main only)
- Polling `private.pncp_sync_run` a cada 5s (Opção C)
- Colunas backlog / doing / done / blocked
- Idempotência: se já `executando`, observa lock existente sem re-POST
- Alertas ao terminal (`concluida`, `concluida_com_erros`, `falhou`)

## Pipeline escopo fitness (78/7830)

1. `sync-compras-catmat`
2. `sync-pncp-pca`
3. `link-catmat-pca`
4. `sync-pncp-orgaos`
5. `sync-pncp-contratacoes-editais`

## Setup cards

Ver `SYNC_SETUP_CARDS` em `src/shared/sync-inventory.ts`.
