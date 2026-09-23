---
applyTo: "supabase/functions/**"
---
# Supabase Edge Functions (Deno/TypeScript)

## Segurança — [BLOQUEANTE]
- O deploy usa `--no-verify-jwt`. **Todo handler protegido** deve chamar logo no início `validateCronAuth(req)` (`_shared/http.ts`) e retornar uma resposta 401 quando o resultado for `false`; se forem necessários handlers de usuário, adicionar antes um helper de validação de sessão/claims e documentá-lo aqui.
- `service_role` / cliente admin (`_shared/pncp/supabase-admin.ts`) só em funções de sync/cron; nunca em endpoint `api-*` chamado pelo usuário sem checar autorização.
- Nenhum secret em código, log ou resposta HTTP. Ler de `Deno.env.get`.
- Não refletir mensagens de erro internas (stack, SQL) para o cliente.

## Função nova
- Deve ser adicionada ao passo de deploy em `.github/workflows/deploy-supabase-functions.yml`, senão nunca é publicada.
- Reutilizar `_shared/` antes de criar código novo: `http.ts`, `pncp/retry.ts`, `pncp/idempotency.ts`, `pncp/upsert.ts`, `pncp/hash.ts`, `pncp/checkpoint.ts`, `pncp/lock.ts`, `compras-gov/*-client.ts`. Para `tamanhoPagina`, usar `clampConsultaPageSize` (`pncp/consulta-client.ts`) ou `clampComprasGovPageSize` (`compras-gov/material-client.ts`) — não criar limitador novo.

## Chamadas às APIs oficiais
- Parâmetros conforme `docs/pncp/schemas-consultas-pncp.md` e `docs/compras-gov/schemas-consultas.md` (nomes exatos, obrigatórios, enums).
- `tamanhoPagina` por família de endpoint (contratações ≤ 50; atas/contratos ≤ 500; PCA tem contrato próprio). Nunca um limite global.
- Timeout explícito; retry limitado com backoff; respeitar `Retry-After` em 429; sem retry em 4xx permanente.
- HTTP 200 não significa payload válido: validar envelope e campos.

## Erro ≠ vazio
Falha de página intermediária deixa o sync como `partial`/`failed`, nunca como sucesso com menos dados. `catch` que devolve `[]`/`null` como se fosse resposta válida é [BLOQUEANTE].

## Sync
- Discovery separado de hydration.
- Upsert idempotente pela chave oficial/natural; `payload_hash` só detecta mudança.
- Registrar sync run com contagens (discovered, inserted, updated, unchanged, failed) e usar checkpoint em fan-out longo.
- Lock para evitar execuções concorrentes do mesmo job.

## Tipos
Sem `any` em fronteiras de API; tipar DTOs (ver `*-types.ts`).
