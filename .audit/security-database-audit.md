# LicitaGym — Security Database / Data API Audit (READ-ONLY)

| Field | Value |
|-------|--------|
| **Date** | 2026-09-22 (updated — RPC/Edge handoff round) |
| **Policy** | READ-ONLY — no config/migration/code changes |
| **Secrets** | Never pasted in full |
| **Projects** | Primary: `ifaiagegyicjzlpskafh` (LicitaGym) |
| **Pair with** | `.audit/security-edge-audit.md` |

---

## Board

```text
SECURITY AUDIT (DB) — R1 CLOSED
├─ SEC-DB-001 private/Data API         🟡 P2 HARDENING — outside R1
├─ SEC-DB-002 try_acquire_sync_lock    🟢 P3 INFO CLOSED
├─ SEC-DB-003 refresh_catmat_item_completo  🟢 REMEDIATED — deployed ACL verified
│    migration 20260922144759 sec_r1_refresh_rpc_matview_acl
├─ SEC-DB-004 matview ACL              🟢 REMEDIATED — deployed ACL verified
├─ Edge findings                       → security-edge-audit.md (R1 CLOSED)
├─ Storage                             ⏸ separate gate
└─ Auth remoto                         ⏸ separate gate
```

---

## SEC-DB-001 — `private` / Data API — CLOSED

| Layer | Result |
|-------|--------|
| LOCAL CONFIG | `private` in `[api].schemas` |
| MIGRATION | REVOKE anon/auth; expose via `014` for Edge |
| DEPLOYED | `pgrst.db_schemas` includes `private` |
| ACTUAL ACCESS | anon/auth USAGE=false; table DML=false |

**Severity:** P2 HARDENING. **Do not remove from API** while Edge uses `client.schema("private")` + service_role.

---

## SEC-DB-002 — `private.try_acquire_sync_lock` — CLOSED

| Layer | Fact |
|-------|------|
| CONFIG / MIGRATION | SECURITY DEFINER; `SET search_path = private`; GRANT EXECUTE to service_role; no REVOKE FROM PUBLIC |
| DEPLOYED PRIVILEGE | ACL `{=X/postgres, postgres=X, service_role=X}` → PUBLIC EXECUTE; `has_function_privilege(anon)=true` |
| POSTGREST EXPOSURE | Schema `private` is in `db_schemas`, **but** anon/auth **USAGE=false** |
| ACTUAL CALLABILITY | **REFUTED** for anon/auth — no schema USAGE; **no public wrapper** (`prosrc` search empty) |
| IMPACT | N/A for anon escalation today |

| Question | Answer |
|----------|--------|
| Exposed to PostgREST catalog conceptually? | Schema listed — yes |
| USAGE blocks resolution/call? | **Yes** — ACTUAL ACCESS blocked |
| public wrapper / intermediate RPC/view? | **None found** |
| Expected caller? | service_role / Edge admin |
| search_path safe? | **Yes** — fixed `private` |
| Caller-controlled input? | yes (`p_lock_key`, `p_resource_type`, `p_parametros`) — only matters if reachable |

**Reclassification:** PUBLIC EXECUTE alone ≠ privilege escalation.  
**Final:** **P3 INFO / hardening** (optional `REVOKE EXECUTE FROM PUBLIC`).  
Was provisional P2 → **CLOSED P3**.

Runtime call as anon: **NOT EXECUTED** (unnecessary; USAGE already refutes).

---

## SEC-DB-003 — `public.refresh_catmat_item_completo` — CHARACTERIZED

Advisor warned “executable by anon”. Advisor ≠ severity. Full stack:

### Definition (deployed)

| Attribute | Value |
|-----------|--------|
| schema | `public` |
| signature | `refresh_catmat_item_completo()` — **no args** |
| owner | postgres |
| security | **SECURITY DEFINER** |
| proconfig | `search_path=public, pg_temp` (**fixed — safe**) |
| body | `REFRESH MATERIALIZED VIEW CONCURRENTLY public.catmat_item_completo` with fallback non-concurrent |

### Layers

| Layer | Observation |
|-------|-------------|
| **CONFIG / SQL intent** (`supabase/sql/catmat_item_completo.sql`) | `REVOKE ALL … FROM PUBLIC`; `GRANT EXECUTE … TO service_role` only |
| **MIGRATION** | Function lives in SQL helper file — **deployed grants drifted** from that intent |
| **DEPLOYED PRIVILEGE** | ACL includes `anon=X`, `authenticated=X`, `service_role=X` |
| **POSTGREST EXPOSURE** | `public` is default exposed schema → `/rest/v1/rpc/refresh_catmat_item_completo` |
| **ACTUAL CALLABILITY** | Privilege: **CONFIRMED** (`anon_refresh_exec=true`, `auth_refresh_exec=true`, `anon_public_usage=true`). Runtime invoke: **NOT EXECUTED — SIDE EFFECT AVOIDED** (would REFRESH) |

### C1–C10

| # | Question | Answer |
|---|----------|--------|
| C1 | anon resolve/see function? | **YES** — public schema + USAGE |
| C2 | anon EXECUTE? | **YES** |
| C3 | authenticated EXECUTE? | **YES** |
| C4 | call exceeds caller privs? | **YES** — DEFINER runs as owner; refreshes MV caller may not own |
| C5 | expensive? | **YES** — `REFRESH MATERIALIZED VIEW CONCURRENTLY` |
| C6 | Source Truth or read model? | **READ MODEL only** — refreshes `public.catmat_item_completo` (matview). Does **not** write `catmat_*` canonical tables. `icatmat_*` untouched. |
| C7 | repeated call DoS? | **YES** — CPU/IO/locks on refresh |
| C8 | lock/concurrency? | CONCURRENTLY still heavy; fallback full refresh locks more |
| C9 | search_path safe? | **YES** |
| C10 | caller input? | **NO** — empty signature |

### Architecture note (CATMAT)

```text
catmat_*              = CANÔNICO / Source Truth
catmat_item_completo  = read model (materialized view)
icatmat_*             = staging / transition
```

Comment in SQL calling matview “fonte da verdade” is **documentation drift** vs consolidated model — function still only refreshes the MV.

### Classification

| Dimension | Result |
|-----------|--------|
| EXPOSURE | CONFIRMED (public RPC) |
| PRIVILEGE | CONFIRMED (anon/auth EXECUTE) |
| ACTUAL ACCESS | CONFIRMED at privilege layer; runtime **NOT EXECUTED** |
| IMPACT | Operational DoS / resource abuse on read model refresh — **not** corruption of `catmat_*` Source Truth |

**Severity:** **P1 CONFIRMED exposure / impact not runtime-tested**  
(availability/operational abuse *inferred* from `REFRESH MATERIALIZED VIEW CONCURRENTLY` + anon EXECUTE; refresh **not** executed in audit).  
**Not** P1 data-integrity breach of canonical CATMAT Source Truth.

**Remediation R1:** migration `202609221200_sec_r1_refresh_rpc_matview_acl.sql` — **not applied to remote yet**.

**Remediation direction (later):** align deployed ACL with SQL intent — `REVOKE EXECUTE FROM anon, authenticated, PUBLIC`; keep `service_role`.

---

## SEC-DB-004 — matview ACL drift (related)

Deployed `public.catmat_item_completo` ACL: `authenticated=arwdDxtm` (full DML), `anon` no SELECT.

SQL intent: `REVOKE ALL FROM anon`; `GRANT SELECT TO authenticated`.

| Fact | Value |
|------|--------|
| anon SELECT | false |
| authenticated SELECT | true |
| authenticated INSERT | **true** (unexpected vs intent) |

**P2** privilege drift on read model (not Source Truth tables). Separate from SEC-DB-003.

---

## Edge summary pointer

See `.audit/security-edge-audit.md`:

- **SEC-EDGE-002** P1 — Bearer fallback on `api-pncp-pca|contratacoes|legislacao` POST  
- **SEC-EDGE-003** P1 — webrouter open proxy (no expand)  
- **SEC-EDGE-004** P1 — legislacao GET signed_url via service_role, no auth  

---

## Next (after human review)

1. Remediate SEC-EDGE-002 (+ move auth before idempotency).  
2. Remediate SEC-EDGE-004 signed_url gate.  
3. REVOKE EXECUTE on `refresh_catmat_item_completo` from anon/auth.  
4. Optional P3: REVOKE PUBLIC on `try_acquire_sync_lock`.  
5. Storage / Auth remoto inventory.  

**No L6B interaction. No migrations this round.**
