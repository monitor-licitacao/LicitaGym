# LicitaGym — FASE 0 Repo Inventory

| Field | Value |
|-------|--------|
| **Date** | 2026-09-21 17:39 BRT (America/Sao_Paulo) |
| **Machine target** | VectraCargo `1387942d-3cf9-4054-8227-2070166978ee` (local path `C:\Users\marce\licitagym`) |
| **Inventory source** | `origin/main` @ `37c700d1240a45d3fb0ab591d9db516c1d665457` via GitHub (`n4rch6pjt9-rgb/LicitaGym`) — progressive fetch of headers / directory listings. **Local Windows checkout not re-scanned in this run** (executor Shell bound to box only; machineId tools not exposed to this subagent). |
| **Repo URL** | https://github.com/n4rch6pjt9-rgb/LicitaGym |
| **Branch (remote)** | `main` |
| **Scope** | FASE 0 + FASE 1 — read-only application code; write only under `.audit/` |

## Reference docs

| Doc | Status | Path / notes |
|-----|--------|----------------|
| PLANO_AGENTE_PRECOS_HISTORICOS_LICITAGYM.md | **MISSING on origin/main** | Prior scan cited `docs\agente de analise de preço\…` — **404** on GitHub; verify local VectraCargo |
| PLANO_REFATORACAO_E_AGENTE_EDITAIS_LICITAGYM.md | **MISSING on origin/main** | Prior scan cited `docs\agente-editais\…` — **404** on GitHub; verify local |
| schemas-consultas.md (Compras.gov) | FOUND | `docs/compras-gov/schemas-consultas.md` |
| schemas-consultas-pncp.md | FOUND | `docs/pncp/schemas-consultas-pncp.md` |
| schemas-consultas.md (PNCP) | FOUND | `docs/pncp/schemas-consultas.md` |
| PRD_PIPELINE_DOCUMENTAL_PNCP_LICITAGYM.md | **MISSING** | Alias search under `docs/`, `docs/pncp/`, root — not present on main |
| CATMAT_TAXONOMIA_MODELO_DADOS_CONSOLIDADO.md | **MISSING** | Alias search under `docs/`, `docs/compras-gov/`, `docs/guias/` — not present on main |
| UPSERT_CONSOLIDADO.md | FOUND | `docs/UPSERT_CONSOLIDADO.md` |
| DISCOVER_PISO_SETUP.md | FOUND | repo root |
| AGENTS.md | FOUND | repo root |

### MISSING exact names (confirmed absent on origin/main)

1. `PRD_PIPELINE_DOCUMENTAL_PNCP_LICITAGYM.md`
2. `CATMAT_TAXONOMIA_MODELO_DADOS_CONSOLIDADO.md`
3. `docs/agente de analise de preço/PLANO_AGENTE_PRECOS_HISTORICOS_LICITAGYM.md` (local-only candidate)
4. `docs/agente-editais/PLANO_REFATORACAO_E_AGENTE_EDITAIS_LICITAGYM.md` (local-only candidate)

---

## Project Python inventory (outside venv)

**Count: 38** `.py` files (project only; no `venv` / `node_modules`).

Flags legend: **H**=HTTP · **S**=Supabase · **C**=CSV · **P**=PNCP · **G**=Compras.gov/dadosabertos · **D**=docs/ML · **$**=prices · **E**=entrypoint (`if __name__` / argparse CLI)

### `scripts/` (20)

| Path | Responsibility | E? | Key imports | Flags |
|------|----------------|----|-------------|-------|
| `scripts/collector_grupo_material.py` | CATMAT E1 grupos (72/78) | Y | `urllib`, `logging`, `json` | H G |
| `scripts/collector_classe_material.py` | CATMAT E2 classes | Y | `urllib`, `logging` | H G |
| `scripts/collector_pdm_material.py` | CATMAT E3 PDMs | Y | `urllib`, `logging` | H G |
| `scripts/collector_item_material.py` | CATMAT E4 items | Y | `urllib`, `logging` | H G |
| `scripts/collector_natureza_despesa.py` | CATMAT E5 natureza | Y | `urllib`, `logging` | H G |
| `scripts/collector_unidade_fornecimento.py` | CATMAT E6 unidade | Y | `urllib`, `logging`, `time` | H G |
| `scripts/collector_caracteristica_material.py` | CATMAT E7 características | Y | `urllib`, `logging`, `time` | H G |
| `scripts/collector_pesquisa_preco.py` | Pesquisa de preço material/detalhe | Y | `urllib`, `logging`, `time` | H G $ |
| `scripts/collector_pncp_contratacoes.py` | PNCP contratações (publicação) | Y | `urllib`, `hashlib`, `datetime` | H P |
| `scripts/comprasgov_consulta_collector.py` | Async collector 77 endpoints Compras.gov | Y | `httpx`, `asyncio`, `argparse` | H G E |
| `scripts/upsert_icatmat_consolidado.py` | Upsert iCATMAT → Supabase local | Y | `supabase.create_client`, `hashlib` | S G |
| `scripts/upsert_icatmat_remoto.py` | Upsert iCATMAT via REST remoto | Y | `urllib`, `os.getenv` | H S G |
| `scripts/inspeciona_item.py` | Ad-hoc inspect first E4 item JSON | N | `json` only; hardcodes Windows path | G |
| `scripts/test_e7_50items.py` | Probe E7 for 50 items | N* | `urllib`, `logging` | H G |
| `scripts/test_e7_real.py` | Probe E7 single item | N* | `urllib`, `logging` | H G |
| `scripts/test_upsert_dryrun.py` | Dry-run hash/enrich without DB | N* | `hashlib`, `pathlib` | G |
| `scripts/teste_catmat_grupos_72_78.py` | Consolidated CATMAT smoke (72/78) | Y | `urllib`, `hashlib` | H G |
| `scripts/teste_legado_contratos.py` | Legado + contratos smoke | Y | `urllib`, `datetime` | H G |
| `scripts/teste_legado_contratos_correto.py` | Legado/contratos/ARP corrected | Y | `urllib`, `datetime` | H G |
| `scripts/teste_pgc_uasg.py` | PGC + UASG smoke | Y | `urllib` | H G |

\*No `if __name__` in first pass; runnable as scripts with top-level calls.

### `docs/compras-gov/` (1)

| Path | Responsibility | E? | Key imports | Flags |
|------|----------------|----|-------------|-------|
| `docs/compras-gov/comprasgov_consulta_schema_completo.py` | One-shot OpenAPI → JSON schema dump | Y (top-level) | `urllib`, `json` | H G D |

### `docs/agente-juridico-ml/` (17)

| Path | Responsibility | E? | Key imports | Flags |
|------|----------------|----|-------------|-------|
| `docs/agente-juridico-ml/agente.py` | Agente jurídico orchestration | Y | `IngestorLegislacao`, Supabase env | S D P |
| `docs/agente-juridico-ml/ingestor.py` | Fetch/store legislação | Y | `requests`, `supabase` | H S D P |
| `docs/agente-juridico-ml/modelo_ml.py` | Embeddings + vector search | Y | torch/ML + optional Supabase | S D |
| `docs/agente-juridico-ml/embeddings_backend.py` | Torch/ONNX/TRT backends | lib | (imported by modelo/benchmark) | D |
| `docs/agente-juridico-ml/scripts/discover_pncp_links.py` | Scrape PNCP legis URLs | Y | `requests`, `bs4` | H P D |
| `docs/agente-juridico-ml/scripts/ingest_pncp.py` | Ingest PNCP links via agente | Y | `dotenv`, `AgenteJuridico` | S P D |
| `docs/agente-juridico-ml/scripts/ingest_pncp_local.py` | Local ingest variant | Y | (same family) | S P D |
| `docs/agente-juridico-ml/scripts/reindex_chunks.py` | Chunk/reindex long docs | Y | `AgenteJuridico`, Supabase | S D |
| `docs/agente-juridico-ml/scripts/reindex_embeddings.py` | Reindex embeddings | Y | same | S D |
| `docs/agente-juridico-ml/scripts/benchmark_encode.py` | Encode latency CLI | Y | `argparse`, `ModeloJuridicoML` | D E |
| `docs/agente-juridico-ml/scripts/export_onnx.py` | Export ONNX | Y | ML | D |
| `docs/agente-juridico-ml/scripts/parity_onnx.py` | ONNX parity check | Y | ML | D |
| `docs/agente-juridico-ml/scripts/warmup_embeddings.py` | Warmup | Y | ML | D |
| `docs/agente-juridico-ml/scripts/smoke_fase4.py` | Fase4 smoke | Y | ML/agente | D |
| `docs/agente-juridico-ml/scripts/write_artifact_manifest.py` | Artifact manifest | Y | pathlib/json | D |
| `docs/agente-juridico-ml/exemplos/consulta.py` | Example consulta | Y | agente | D |
| `docs/agente-juridico-ml/exemplos/ingestao.py` | Example ingestão | Y | ingestor | D |

---

## SQL / migrations / Edge Functions

### Migrations (`supabase/migrations/**`)

**Count: 32 SQL migration files** (+ docs `CLAUDE.md`, `SCHEMA_STANDARDS.md`, `VALIDATION_REPORT.md`, `MIGRATIONS_CONSOLIDATED.sql`).

Key paths:

- Foundation PNCP: `202609180001` … `202609180018` (entidades, legislação, PCA, contratações, IRP, catálogo, cron, RLS, CATMAT curadoria/compras, indexes)
- Bridge/PISO: `20260919151254`, `20260919151344`, `202609192015`, `202609192030`, `20260919233512`
- iCATMAT: `202609202030_icatmat_pdm_completa.sql`, `202609211000` … `202609211006` (grupo→característica)
- Prices: `20260921_fase3_precos_praticados.sql`
- Consolidated: `MIGRATIONS_CONSOLIDATED.sql`

### Ad-hoc SQL (`supabase/sql/**`) — **7**

- `analise_pca_alteracoes.sql`, `analise_pca_alteracoes_dashboard.sql`
- `catalogo_perguntas.sql`, `catmat_item_completo.sql`
- `inventario_dados.sql`, `precos_praticados.sql`
- `teste_integridade_pca_alteracoes.sql`

Also: `docs/agente-juridico-ml/supabase_schema.sql`, `supabase_hnsw_migration.sql`; `scripts/find-piso-anywhere.sql`.

### Edge Functions (`supabase/functions/**`) — Deno/TypeScript (**18** function dirs + `_shared`)

Non-Python heavy ingestion consumers:

| Function | Role (apparent) |
|----------|-----------------|
| `_shared` | Shared TS helpers |
| `api-pncp-contratacoes` | API surface PNCP contratações |
| `api-pncp-irp` | API IRP |
| `api-pncp-legislacao` | API legislação |
| `api-pncp-pca` | API PCA |
| `calculate-distance-webrouter` | Distance util |
| `discover-piso-pdm` | PISO/PDM discovery |
| `import-catmat-curadoria` | CATMAT curadoria import |
| `link-catmat-pca` | Link CATMAT↔PCA |
| `sync-compras-catmat` | Sync CATMAT Compras |
| `sync-comprasgov-consulta` | Sync consulta Compras.gov |
| `sync-pncp-catalogo` | Sync catálogo PNCP |
| `sync-pncp-contratacoes-atas` | Sync atas |
| `sync-pncp-contratacoes-contratos` | Sync contratos |
| `sync-pncp-contratacoes-editais` | Sync editais |
| `sync-pncp-irp` | Sync IRP |
| `sync-pncp-legislation` | Sync legislation |
| `sync-pncp-orgaos` | Sync órgãos |
| `sync-pncp-pca` | Sync PCA |

### `requirements*.txt`

- `docs/agente-juridico-ml/requirements.txt`
- `docs/agente-juridico-ml/requirements.docker.txt`
- (no root `requirements.txt` on main)

---

## Test locations (project only)

| Location | Notes |
|----------|-------|
| `scripts/test_e7_*.py`, `test_upsert_dryrun.py` | Manual probes, not pytest package |
| `scripts/teste_*.py` | Smoke/integration against live APIs |
| `docs/agente-juridico-ml/scripts/smoke_fase4.py`, `parity_onnx.py` | ML smoke/parity |
| `supabase/sql/teste_integridade_pca_alteracoes.sql` | SQL integrity |
| **No** `tests/`, `pytest.ini`, or `*_test.py` package tree on main | Automated test domain thin |

---

## Caveats for parent

1. Inventory reflects **GitHub `main` @ 37c700d**, not a live `Get-ChildItem` of `C:\Users\marce\licitagym`. Prior local-only docs may still exist on disk.
2. This executor could not bind Shell/Read to machineId `1387942d-…` (tools ran on the Linux box). Delivery of `.audit/*.md` to Windows may require parent `CopyFromBox` or re-run with machine binding.
3. Full audit markdown also committed under repo `.audit/` on `main` for pull onto VectraCargo.
