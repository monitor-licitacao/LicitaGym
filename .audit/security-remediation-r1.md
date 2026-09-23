# Security Remediation R1 — Edge Auth + Privileged RPC

| Field | Value |
|-------|--------|
| **Date** | 2026-09-22 |
| **Scope** | SEC-EDGE-002/003/004, SEC-DB-003/004 |
| **Status** | **R1 CLOSED / FROZEN** |
| **Freeze baseline** | `ba7a2bc` |
| **Lifecycle** | `IMPLEMENTED → PRE-DEPLOY PASS → DEPLOYED → VERIFIED → REMEDIATED → FROZEN` |
| **Project** | `ifaiagegyicjzlpskafh` |
| **Not in scope** | SEC-DB-001, SEC-DB-002, L6B, Storage/Auth audit |

**Nomenclature:** REMEDIATED = vulnerability paths closed + remote evidence; **not** full positive E2E.  
**Do not** mutate this baseline retrospectively from R1.1 / Storage-Auth / L6.

```text
SECURITY R1
├─ EDGE-002  REMEDIATED — negative paths verified
├─ EDGE-003  REMEDIATED — auth boundary verified
│             └─ provider/redirect positive E2E pending
├─ EDGE-004  REMEDIATED — unauth/invalid JWT verified
│             └─ authorized-user positive E2E pending
├─ DB-003    REMEDIATED — deployed ACL verified
├─ DB-004    REMEDIATED — deployed ACL verified
├─ DB-001    P2 HARDENING — outside R1
└─ DB-002    P3 INFO CLOSED

Residual verification (R1.1 — not started)
├─ valid deployed cron path          NOT RUN
├─ valid JWT signed_url path         NOT RUN
└─ WebRouter provider/redirect       NOT RUN

L6B                                BLOCKED / NOT RUN
```

**Ops note:** do **not** rotate/align `SYNC_CRON_SECRET` only to make smoke pass. First establish authoritative operational source. Positive-path `401` = config divergence, not proof remote is wrong.

---

## Classification correction (audit)

**SEC-DB-003:** P1 = **CONFIRMED exposure / impact not runtime-tested** (availability/ops *inferred*; REFRESH not executed). Not Source Truth corruption.

---

## SEC-EDGE-002 — POST Bearer fallback — **REMEDIATED — negative paths verified**

| | |
|--|--|
| **BEFORE** | `!validateCronAuth` → allow any `Authorization` starting with `Bearer `; `beginIdempotency` before auth |
| **CHANGE** | `requireCronAuth` (exact `SYNC_CRON_SECRET`); auth **before** idempotency; removed prefix fallback |
| **CODE FIXED** | YES |
| **DEPLOYED** | YES — `api-pncp-pca` v12, `api-pncp-contratacoes` v11, `api-pncp-legislacao` v11 (`verify_jwt=false`) |
| **POST-DEPLOY VERIFIED** | YES — missing/arbitrary/invalid cron → **401**; probe keys `r1-smoke-*` **absent** from `private.idempotency_key` |
| **RESIDUAL** | Legitimate cron positive path → R1.1 (do not rotate secret without SoT) |
| **FINAL** | **REMEDIATED — negative paths verified** (bypass closed; unauth never reaches `beginIdempotency`) |

---

## SEC-EDGE-004 — signed_url — **REMEDIATED — unauth/invalid JWT verified**

| | |
|--|--|
| **BEFORE** | GET `signed_url=true` used service_role with no auth |
| **CHANGE** | `requireUserAuth` before admin/`createSignedUrl` |
| **CODE FIXED** | YES |
| **DEPLOYED** | YES — `api-pncp-legislacao` v11 |
| **POST-DEPLOY VERIFIED** | YES — missing auth → 401; invalid JWT → 401 |
| **RESIDUAL** | Authorized-user positive E2E → R1.1 (**SAFE FIXTURE UNAVAILABLE** this round) |
| **FINAL** | **REMEDIATED — unauth/invalid JWT verified** |

---

## SEC-EDGE-003 — WebRouter open proxy — **REMEDIATED — auth boundary verified**

| | |
|--|--|
| **BEFORE** | Unauthenticated POST; env URL only control |
| **CHANGE** | `requireCronOrUserAuth`; host allowlist; payload forbids proxy keys; `redirect: "error"` |
| **CODE FIXED** | YES |
| **DEPLOYED** | YES — `calculate-distance-webrouter` v9 |
| **POST-DEPLOY VERIFIED** | YES — unauthenticated → 401; arbitrary Bearer → 401 |
| **RESIDUAL** | provider/redirect positive E2E → R1.1 (no localhost/RFC1918/metadata probes) |
| **FINAL** | **REMEDIATED — auth boundary verified** |

---

## SEC-DB-003 — refresh RPC EXECUTE — **REMEDIATED**

| | |
|--|--|
| **BEFORE** | anon/auth EXECUTE = true |
| **CHANGE** | Migration revokes PUBLIC/anon/authenticated; GRANT EXECUTE to `service_role` |
| **CODE FIXED** | YES (migration file) |
| **DEPLOYED** | YES — `sec_r1_refresh_rpc_matview_acl` version `20260922144759` |
| **POST-DEPLOY VERIFIED** | YES — see ACL AFTER |
| **FINAL** | **REMEDIATED — deployed ACL verified** |
| **NOT DONE** | `REFRESH MATERIALIZED VIEW` — intentionally not executed |

### ACL BEFORE → AFTER (deployed)

| Probe | BEFORE | AFTER |
|-------|--------|-------|
| PUBLIC EXECUTE | false | false |
| anon EXECUTE | **true** | **false** |
| authenticated EXECUTE | **true** | **false** |
| service_role EXECUTE | true | true |
| SECURITY DEFINER | true | true (no drift) |
| search_path | `public, pg_temp` | `public, pg_temp` (no drift) |

Migration file SHA256: `A605D48E105C8329C9715D19BC8596FF86ADCAC0253AE0E1CBE080DC25DCF20C`

---

## SEC-DB-004 — matview ACL — **REMEDIATED**

| | |
|--|--|
| **BEFORE** | authenticated SELECT+INSERT+UPDATE+DELETE+TRUNCATE |
| **CHANGE** | REVOKE ALL; GRANT SELECT to authenticated; GRANT ALL to service_role |
| **CODE FIXED** | YES |
| **DEPLOYED** | YES (same migration) |
| **POST-DEPLOY VERIFIED** | YES — authenticated **SELECT only**; write privileges false |
| **FINAL** | **REMEDIATED — deployed ACL verified** |
|------|------------------------------|
| anon | F/F/F/F/F |
| authenticated | **T**/F/F/F/F |
| service_role | T/T/T/T/T |

---

## Test results

### NEW SECURITY TESTS — ACTUAL PASS

```text
deno test --no-check --allow-env --allow-read \
  tests/supabase/functions/_shared/http_auth_sec_edge_002.ts \
  tests/supabase/functions/_shared/webrouter_sec_edge_003.ts \
  tests/supabase/functions/_shared/api_pncp_auth_order_sec_edge.ts

ok | 17 passed | 0 failed
```

### EXISTING TESTS

| Suite | Status |
|-------|--------|
| L6B pagination (`tests/.../pncp_*.ts`) | **NOT RUN** (L6B remains BLOCKED independently) |
| Other Deno suites | **NOT RUN** this round |

### FAILURES

None in new security suite.

---

## Files changed

```text
supabase/functions/_shared/pncp/hash.ts                     (type-check fix for BufferSource)
supabase/functions/_shared/http.ts                          (auth helpers)
supabase/functions/_shared/webrouter.ts                     (NEW allowlist/validation)
supabase/functions/api-pncp-pca/index.ts
supabase/functions/api-pncp-contratacoes/index.ts
supabase/functions/api-pncp-legislacao/index.ts
supabase/functions/calculate-distance-webrouter/index.ts
supabase/migrations/202609221200_sec_r1_refresh_rpc_matview_acl.sql
tests/supabase/functions/_shared/http_auth_sec_edge_002.ts
tests/supabase/functions/_shared/webrouter_sec_edge_003.ts
tests/supabase/functions/_shared/api_pncp_auth_order_sec_edge.ts
.audit/security-remediation-r1.md                           (this file)
.audit/security-database-audit.md                           (severity + R1 pointer)
```

---

## Diff summary

1. Central `authenticateCron` / `requireCronAuth` / `authenticateUserJwt` / `requireCronOrUserAuth` — fail-closed; no prefix auth.
2. Three api-pncp POST handlers: cron-only; auth before idempotency.
3. Legislacao signed_url: user JWT required before service_role.
4. WebRouter: auth + host allowlist + payload denylist.
5. New migration for RPC + matview ACL (IF EXISTS, no REFRESH).

---

## Findings status matrix

| ID | CODE FIXED | DEPLOYED | POST-DEPLOY VERIFIED | FINAL |
|----|------------|----------|----------------------|-------|
| SEC-EDGE-002 | YES | YES | YES (reject + no idempotency write) | **REMEDIATED — negative paths verified** |
| SEC-EDGE-003 | YES | YES | YES (unauth/arbitrary reject) | **REMEDIATED — auth boundary verified** |
| SEC-EDGE-004 | YES | YES | YES (missing/invalid JWT reject) | **REMEDIATED — unauth/invalid JWT verified** |
| SEC-DB-003 | YES | YES | YES (ACL AFTER) | **REMEDIATED — deployed ACL verified** |
| SEC-DB-004 | YES | YES | YES (ACL AFTER) | **REMEDIATED — deployed ACL verified** |
| SEC-DB-001 | unchanged | n/a | n/a | P2 HARDENING — outside R1 |
| SEC-DB-002 | unchanged | n/a | n/a | P3 INFO CLOSED |

---

## Rollback

**Edge:** prefer forward-fix; redeploy prior known version if needed.  
**DB:** **do not** re-GRANT anon/authenticated EXECUTE on refresh RPC to “restore”. Forward corrective migration only.

---

## STOP GATE

- [x] Code changes  
- [x] Migration created  
- [x] New tests PASS  
- [x] Pre-deploy gate PASS  
- [x] Edge deploy (4 functions only)  
- [x] Edge smoke negatives PASS; hard-stop not triggered  
- [x] Remote migration applied + ACL verified  
- [x] Secrets not printed  
- [x] `private` not removed from api.schemas  
- [x] L6B untouched  
- [x] **STOP after verification — no next phase auto-started**

---

## CONTROLLED DEPLOY R1 (2026-09-22) — EXECUTED

### Phase 1 — Edge deploy ACTUAL

| FUNCTION | RESULT | VERSION | verify_jwt | ezbr_sha256 (prefix) |
|----------|--------|---------|------------|----------------------|
| api-pncp-pca | ok | 12 | false | b13498c251d2… |
| api-pncp-contratacoes | ok | 11 | false | 4690169a4acd… |
| api-pncp-legislacao | ok | 11 | false | a1fa466f7020… |
| calculate-distance-webrouter | ok | 9 | false | 0b717e2be1d2… |

Mechanism: Supabase MCP `deploy_edge_function` (CLI Management API returned 403 earlier). No deploy-all.

### Phase 1B — Edge smoke ACTUAL

Evidence file: `.audit/_r1_edge_smoke_results.json`

| Case family | ACTUAL |
|-------------|--------|
| EDGE-002 missing/arbitrary/invalid (3 fns) | **401 PASS** (9/9) |
| EDGE-002 legitimate cron boundary | **NOT RUN** — remote returned 401 (local cron secret ≠ deployed; no secret printed) |
| EDGE-002 beginIdempotency reach | **PASS** — `SELECT … WHERE idempotency_key LIKE 'r1-smoke-%'` → **[]** |
| EDGE-004 missing/invalid JWT | **401 PASS** |
| EDGE-004 valid JWT | **NOT RUN — SAFE FIXTURE UNAVAILABLE** |
| EDGE-003 unauth / arbitrary Bearer | **401 PASS** |
| EDGE-003 auth + forbidden keys / provider / redirect | **NOT RUN** (cron mismatch / no unsafe probe) |

**Edge STOP GATE:** no negative test reached privileged op → **continue Phase 2**.

### Phase 2 — Database ACTUAL

| Item | Value |
|------|--------|
| Project | ifaiagegyicjzlpskafh |
| Migration file | `supabase/migrations/202609221200_sec_r1_refresh_rpc_matview_acl.sql` |
| File SHA256 | A605D48E105C8329C9715D19BC8596FF86ADCAC0253AE0E1CBE080DC25DCF20C |
| Applied as | `20260922144759_sec_r1_refresh_rpc_matview_acl` |
| REFRESH MV | **NOT EXECUTED** |

### Phase 2B — ACL AFTER (verified)

refresh EXECUTE: public=F anon=F authenticated=F service_role=T  
matview authenticated: SELECT=T write=F  
DEFINER/search_path: unchanged

---

## PRE-DEPLOY GATE (2026-09-22) — historical

| Attribute | Value |
|-----------|--------|
| **Result** | **PASS** |
| **Remote changes** | **NONE** (no Edge deploy, no db push, no migration apply) |
| **Baseline HEAD (pre-R1 commit)** | `542cbf8483ad4bc63cdc9737d22a1b60a06fadd5` |
| **R1 code** | uncommitted working tree (see git status) |

### UNIT / SECURITY TESTS

| Item | ACTUAL |
|------|--------|
| Command | `deno test --no-check --allow-env --allow-read` (3 R1 test files) |
| Exit | **0** |
| Result | **17 passed / 0 failed** |
| Note | `--no-check` ≠ type-check (see TYPE/BUILD) |

### TYPE / BUILD

| Item | ACTUAL |
|------|--------|
| Command | `deno check` on R1 Edge sources (`http.ts`, `webrouter.ts`, `hash.ts`, 3× api-pncp, webrouter function) |
| First run EXIT | **1** — pre-existing `TS2345` in `_shared/pncp/hash.ts` (BufferSource) via `idempotency` import |
| Gate fix | copy into fresh `Uint8Array` before `digest` (indispensable for type-check) |
| Re-run EXIT | **0** |
| Result | **PASS** |
| Checkov / IaC | **NOT RUN — tooling unavailable** (Checkov ENOENT). Not treated as PASS. |

### AUTH FAIL-CLOSED (static review)

**EDGE-002 — PASS**

- Exact match: `token === secret` in `authenticateCron`
- Secret absent/blank → `REJECTED`
- Arbitrary Bearer → `REJECTED`
- No `startsWith("Bearer ")` remaining under `supabase/functions/`
- `requireCronAuth` precedes `beginIdempotency` in pca / contratacoes / legislacao
- All three POST sync assets covered

**EDGE-004 — PASS**

- Single `signed_url=true` branch; `requireUserAuth` before `SERVICE_ROLE` / `createSignedUrl`
- `getUser` failure → `REJECTED` (catch + error/null user)
- No second unsigned signed_url path

**EDGE-003 — PASS**

- Destination from `WEBROUTER_API` env only + host allowlist + https + path suffix
- Payload cannot supply `url`/`host`/`endpoint`/etc.
- Gate fix: `fetch(..., { redirect: "error" })` — redirects cannot retarget off allowlist
- Client never chooses destination

### MIGRATION REVIEW

File: `supabase/migrations/202609221200_sec_r1_refresh_rpc_matview_acl.sql` — **NOT APPLIED**

| Check | Result |
|-------|--------|
| REVOKE EXECUTE PUBLIC/anon/authenticated | **YES** |
| GRANT EXECUTE service_role | **YES** |
| Matview: authenticated ≤ SELECT | **YES** (REVOKE ALL then GRANT SELECT) |
| service_role ALL on matview | **YES** |
| Alters `catmat_*` Source Truth | **NO** |
| DROP/recreate | **NO** |
| Executes REFRESH | **NO** |
| Remote-safe | **YES** — `IF to_regprocedure` / `IF to_regclass` |

| Object | BEFORE ACL (deployed) | MIGRATION DELTA | EXPECTED AFTER |
|--------|----------------------|-----------------|----------------|
| `refresh_catmat_item_completo()` | postgres, anon, authenticated, service_role EXECUTE | REVOKE PUBLIC/anon/auth; GRANT service_role | service_role (+owner) EXECUTE only |
| `catmat_item_completo` | postgres ALL; authenticated ALL; service_role ALL | REVOKE PUBLIC/anon/auth; GRANT SELECT auth; GRANT ALL service_role | authenticated SELECT; service_role ALL |

**Do not** `supabase db push` blindly — other pending migrations may exist. Prefer applying **only** this file after human approval.

### DEPLOY MANIFEST (Edge — exact list)

Redeploy **only** these four (shared `_shared/*` ships with them). **No deploy-all.**

| FUNCTION | FINDING | CODE CHANGE | SECRET/ENV REQUIRED | POST-DEPLOY TEST |
|----------|---------|-------------|---------------------|------------------|
| `api-pncp-pca` | EDGE-002 | `requireCronAuth` before idempotency | `SYNC_CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | auth boundary only (below) |
| `api-pncp-contratacoes` | EDGE-002 | same | same | same |
| `api-pncp-legislacao` | EDGE-002 + EDGE-004 | cron POST + `requireUserAuth` on signed_url | same + `SUPABASE_ANON_KEY` (getUser) | auth + signed_url reject paths |
| `calculate-distance-webrouter` | EDGE-003 | auth + allowlist + `redirect:error` | `WEBROUTER_API` (+ optional WEBROUTER_AUTH_*), cron or user JWT | unauth reject; payload/url reject |

Also bundled: `_shared/http.ts`, `_shared/webrouter.ts`, `_shared/pncp/hash.ts` (type fix).

Suggested order after approval:

1. Deploy 4 Edge functions → smoke auth tests  
2. Apply **only** R1 migration → verify ACL via catalog (no REFRESH)

### POST-DEPLOY TEST PLAN (**NOT EXECUTED**)

**EDGE-002** (prefer auth-only; avoid full sync if possible):

- missing Authorization → 401  
- `Bearer arbitrary` → 401  
- wrong cron → 401  
- correct `SYNC_CRON_SECRET` → past auth (stop before large sync if feasible)

**EDGE-004:**

- unauthenticated `signed_url=true` → 401  
- invalid JWT → 401  
- valid authenticated user → allow signed URL for permitted doc (log only presence/expiry, **never** full URL)

**EDGE-003:**

- unauthenticated → 401  
- authenticated/cron + allowed payload → 200/provider path  
- payload with `url`/`endpoint` → 400  

**DB-003 / DB-004** (after migration only):

```sql
-- privileges only; do NOT call refresh_catmat_item_completo()
SELECT has_function_privilege('anon','public.refresh_catmat_item_completo()','EXECUTE');
SELECT has_function_privilege('authenticated','public.refresh_catmat_item_completo()','EXECUTE');
SELECT has_function_privilege('service_role','public.refresh_catmat_item_completo()','EXECUTE');
SELECT has_table_privilege('authenticated','public.catmat_item_completo','SELECT') AS sel,
       has_table_privilege('authenticated','public.catmat_item_completo','INSERT') AS ins;
```

Expect: anon/auth EXECUTE false; service_role true; authenticated SELECT true, INSERT false.

### ROLLBACK READINESS

| Item | Status |
|------|--------|
| Prior commit hash | `542cbf8483ad4bc63cdc9737d22a1b60a06fadd5` (last committed; R1 still uncommitted — discard/checkout files if needed) |
| Redeploy prior Edge | `supabase functions deploy <fn> --no-verify-jwt` from clean tree at `542cbf8` (or dashboard previous revision if already published) |
| Reverse SQL | **Documented; NOT executed.** Must **not** re-GRANT anon/auth EXECUTE as “rollback success”. Prefer forward-fix. If emergency reverse of matview SELECT-only is needed, restore SELECT for authenticated only — never restore authenticated ALL / anon EXECUTE. |

Emergency reverse (ACL only — still insecure for RPC; avoid unless emergency):

```sql
-- EMERGENCY ONLY — reopens SEC-DB-003; prefer forward-fix
-- GRANT EXECUTE ON FUNCTION public.refresh_catmat_item_completo() TO anon, authenticated;
-- Prefer instead: keep revoke; fix callers to service_role
```

### PRE-DEPLOY GATE SUMMARY

| Track | Result |
|-------|--------|
| UNIT/SECURITY TESTS | **PASS** (17/17) |
| TYPE/BUILD | **PASS** (`deno check` EXIT 0 after hash + redirect fixes) |
| MIGRATION REVIEW | **PASS** (static; not applied) |
| DEPLOY MANIFEST | **READY** (4 functions) |
| POST-DEPLOY PLAN | **READY** (not run) |
| ROLLBACK | **READY** (documented) |
| Checkov | **NOT RUN — tooling unavailable** |
| **OVERALL** | **PASS** — still **NO-GO remote** until human authorizes staged deploy |

### Gate-only code deltas (indispensable)

1. `calculate-distance-webrouter`: `redirect: "error"`  
2. `_shared/pncp/hash.ts`: Uint8Array copy for `deno check`  
