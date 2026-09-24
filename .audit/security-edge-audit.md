# LicitaGym — Security Edge Audit (READ-ONLY)

| Field | Value |
|-------|--------|
| **Date** | 2026-09-22 |
| **Policy** | READ-ONLY — no Edge/config/grant changes |
| **Scope** | `api-pncp-*`, `sync-pncp-*`, related deploy flags |
| **Pair with** | `.audit/security-database-audit.md` |

---

## Board (post R1 CLOSED)

```text
SECURITY R1
├─ EDGE-002  REMEDIATED — negative paths verified
├─ EDGE-003  REMEDIATED — auth boundary verified
│             └─ provider/redirect positive E2E pending
├─ EDGE-004  REMEDIATED — unauth/invalid JWT verified
│             └─ authorized-user positive E2E pending
├─ DB-003/004 → security-database-audit.md REMEDIATED
├─ DB-001    P2 HARDENING — outside R1
├─ DB-002    P3 INFO CLOSED
└─ Storage/Auth                       ⏸ separate gate (not started)

Residual verification → R1.1 (authorized separately)
L6B → BLOCKED / NOT RUN (R1 does not unblock)
```

---

## A. `api-pncp-legislacao` — characterization

**File:** `supabase/functions/api-pncp-legislacao/index.ts`  
**Deploy:** `--no-verify-jwt` (workflow)

### Request flows

#### GET (list)

```text
request GET
  → getUserClient(anon + forwarded Authorization)
  → SELECT legislacao_documentos (RLS of caller)
  → no service_role
```

#### GET (`documento_id` + `signed_url=true`) — separate finding SEC-EDGE-004

```text
request GET?signed_url=true
  → NO validateCronAuth / NO JWT check
  → SUPABASE_SERVICE_ROLE_KEY client
  → read legislacao_* + storage.createSignedUrl
  → privileged signed URL returned
```

#### POST (sync trigger) — same root cause as SEC-EDGE-002

```text
request POST
  → require Idempotency-Key (else 400)
  → service_role admin
  → beginIdempotency → INSERT private.idempotency_key   ← BEFORE AUTH
  → validateCronAuth?
       YES → continue
       NO  → if Authorization startsWith "Bearer " → continue
             else 401
  → fetch sync-pncp-legislation with Bearer SYNC_CRON_SECRET (server-side)
  → finishIdempotency
```

Gateway JWT verify is off. Manual auth is prefix-only fallback when cron fails.

### Case matrix (POST) — static code path, no live mutation

Assumes `Idempotency-Key` present (required for privileged path). Without it: 400, no privilege.

| Case | Auth header | EXPECTED (secure) | ACTUAL (code) | AUTH DECISION | PRIVILEGED PATH? | MUTATION CAPABILITY? |
|------|-------------|-------------------|---------------|---------------|------------------|----------------------|
| A1 | absent | 401 before side effects | After `beginIdempotency`, 401 | DENY late | **YES** (idempotency insert already) | **YES** (idempotency write); sync **NO** |
| A2 | empty `""` | 401 | same as A1 | DENY late | YES (idempotency) | YES idempotency / NO sync |
| A3 | `"Bearer"` (no space+token) | 401 | `startsWith("Bearer ")` false → 401 | DENY | YES idempotency first | YES idempotency / NO sync |
| A4 | `Bearer arbitrary` | 401 | fallback **ALLOW** | ALLOW | **YES** | **YES** sync trigger + idempotency |
| A5 | `Bearer` malformed JWT junk | 401 | same as A4 — **ALLOW** | ALLOW | YES | YES |
| A6 | Bearer anon JWT | 401 unless cron | **ALLOW** via fallback | ALLOW | YES | YES |
| A7 | Bearer authenticated JWT | 401 unless cron/role | **ALLOW** via fallback | ALLOW | YES | YES |
| A8 | Bearer `SYNC_CRON_SECRET` | ALLOW | ALLOW via `validateCronAuth` | ALLOW | YES | YES |

**Evidence:** lines 76–115 of `api-pncp-legislacao/index.ts`; `validateCronAuth` in `_shared/http.ts` (fail-closed if secret missing); `beginIdempotency` writes `private.idempotency_key` via service_role.

**Privileged path reached with arbitrary Bearer:** YES → sync fan-out to `sync-pncp-legislation`.  
**P1 CONFIRMED** for legislacao — same root as PCA/contratações.

**Extra:** auth runs **after** idempotency write → even A1 causes privileged write if Idempotency-Key set (abuse / fill `private.idempotency_key`).

---

## B. Family matrix — SEC-EDGE-002 scope

| FUNCTION | VERIFY_JWT | MANUAL AUTH | CRON SECRET | BEARER FALLBACK | SERVICE_ROLE | PRIVILEGED WRITE | STATUS |
|----------|------------|-------------|-------------|-----------------|--------------|------------------|--------|
| `api-pncp-pca` | off (deploy) | POST only | yes | **YES** | yes | sync + idempotency | **SEC-EDGE-002** |
| `api-pncp-contratacoes` | off | POST only | yes | **YES** | yes | sync + idempotency | **SEC-EDGE-002** |
| `api-pncp-legislacao` | off | POST only | yes | **YES** | yes | sync + idempotency | **SEC-EDGE-002** |
| `api-pncp-legislacao` GET signed_url | off | **none** | n/a | n/a | yes | signed URL mint | **SEC-EDGE-004** |
| `api-pncp-irp` | off | none | no | no | no | POST 423 only | separate / low |
| `sync-pncp-pca` | off | `validateCronAuth` only | yes | **no** | yes | sync | OK pattern |
| `sync-pncp-legislation` | off | cron only | yes | no | yes | sync | OK |
| `sync-pncp-contratacoes-editais` | off | cron only | yes | no | yes | sync | OK |
| `sync-pncp-contratacoes-atas` | off | cron only | yes | no | yes | sync | OK |
| `sync-pncp-contratacoes-contratos` | off | cron only | yes | no | yes | sync | OK |
| `sync-pncp-catalogo` | off | cron only | yes | no | yes | sync | OK |
| `sync-pncp-irp` | off | cron only | yes | no | yes | sync | OK |
| `sync-pncp-orgaos` | off | cron only | yes | no | yes | sync | OK (not in all deploy lists) |
| `import-catmat-curadoria` | off | cron only | yes | no | yes | import | OK |
| `sync-compras-catmat` | off | cron only | yes | no | yes | sync | OK |
| `link-catmat-pca` | off | cron only | yes | no | yes | link | OK |
| `calculate-distance-webrouter` | off | **none** | no | n/a | no | external proxy | **SEC-EDGE-003** |

Static search: no `getUser` / `getClaims` in these handlers. Auth = cron exact match or Bearer prefix fallback (three APIs only).

### SEC-EDGE-002 — consolidated

| Attribute | Value |
|-----------|--------|
| **Severity** | **P1 CONFIRMED** |
| **EXPOSURE** | Functions deployed with `--no-verify-jwt` |
| **PRIVILEGE** | Handler holds `SUPABASE_SERVICE_ROLE_KEY`; triggers sync with cron secret server-side |
| **ACTUAL ACCESS** | Any `Authorization: Bearer <non-empty-after-space>` passes when cron secret check fails |
| **IMPACT** | Unauthenticated (or weakly authenticated) caller can trigger PNCP sync jobs + write idempotency rows |

**Affected assets:**

- `api-pncp-pca` (POST)
- `api-pncp-contratacoes` (POST)
- `api-pncp-legislacao` (POST)

**Not in this finding:** `sync-pncp-*` (strict cron); `api-pncp-irp` (no fallback / POST blocked).

---

## SEC-EDGE-003 — preserve only

| Attribute | Value |
|-----------|--------|
| **Severity** | **P1 CONFIRMED** |
| **Asset** | `calculate-distance-webrouter` |
| **Facts** | `--no-verify-jwt`; no `validateCronAuth`; POST body forwarded to WebRouter env URL |
| **This phase** | No SSRF probing (localhost/metadata/private net). Detailed open-proxy analysis = later phase |

---

## SEC-EDGE-004 — signed URL without auth (NEW)

| Attribute | Value |
|-----------|--------|
| **Severity** | **P1 CONFIRMED** |
| **Asset** | `api-pncp-legislacao` GET `?documento_id=&signed_url=true` |
| **EXPOSURE** | `--no-verify-jwt` |
| **PRIVILEGE** | Uses service_role for DB + Storage |
| **ACTUAL ACCESS** | No Authorization check on this branch |
| **IMPACT** | Anyone who can hit the function URL and guess/know `documento_id` can mint 1h signed URLs for `pncp-legislation` objects |

Separate from SEC-EDGE-002 (different method/path; no Bearer fallback — **absence** of auth).

---

## Stop condition

- [x] legislacao characterized  
- [x] api/sync family triaged  
- [x] refresh → DB audit  
- [x] SEC-DB-002 → DB audit close  
- [ ] No remediation this round  

**Await human review before fix.**

---

## Remediation R1 (2026-09-22)

Code + migration prepared — see `.audit/security-remediation-r1.md`.  
**Not deployed.** Findings remain open operationally until Edge deploy + migration apply.
