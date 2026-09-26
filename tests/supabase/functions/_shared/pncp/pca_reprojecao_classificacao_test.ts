/**
 * P0 reprojeção classificacao_catalogo_id — testes de contrato.
 */
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { hashPayload } from "../../../../../supabase/functions/_shared/pncp/hash.ts";
import {
  normalizePcaItem,
  normalizePcaItemLegacy,
} from "../../../../../supabase/functions/_shared/pncp/normalize.ts";
import {
  decideReprojection,
  restorePcaItensSnapshot,
  runPcaReprojecaoClassificacao,
  selectLatestSourceItems,
  takePcaItensSnapshot,
  type PcaItemTarget,
} from "../../../../../supabase/functions/_shared/pncp/pca-reprojecao.ts";

const PLAN = { idPcaPncp: "00000000000191-0-000001/2026" };
const ITEM = {
  numeroItem: 10,
  classificacaoCatalogoId: 1,
  descricaoItem: "Aparelho",
  classificacaoSuperiorCodigo: "7830",
};

function targetWithHash(
  hash: string,
  overrides: Partial<PcaItemTarget> = {},
): PcaItemTarget {
  return {
    id: "item-1",
    pca_plano_id: "plano-1",
    numero_item: 10,
    id_pca_pncp: String(PLAN.idPcaPncp),
    payload_hash: hash,
    classificacao_catalogo_id: null,
    ...overrides,
  };
}

Deno.test("1: hash antigo igual → decide atualizar com hash novo e classificacao", async () => {
  const legacy = {
    ...normalizePcaItemLegacy(ITEM, PLAN),
    pca_plano_id: "plano-1",
  };
  const novo = {
    ...normalizePcaItem(ITEM, PLAN),
    pca_plano_id: "plano-1",
  };
  const hashAntigo = await hashPayload(legacy);
  const hashNovo = await hashPayload(novo);
  const decision = await decideReprojection(
    targetWithHash(hashAntigo),
    {
      idPcaPncp: String(PLAN.idPcaPncp),
      numeroItem: 10,
      plan: PLAN,
      item: ITEM,
      fetchedAt: "2026-09-19T00:00:00Z",
      sourceRecordId: "src-1",
    },
  );
  assertEquals(decision.kind, "atualizar");
  if (decision.kind === "atualizar") {
    assertEquals(decision.classificacaoCatalogoId, "1");
    assertEquals(decision.hashNovo, hashNovo);
  }
});

Deno.test("2: hash divergente → STALE_SOURCE_MISMATCH", async () => {
  const decision = await decideReprojection(
    targetWithHash("hash-que-nao-bate"),
    {
      idPcaPncp: String(PLAN.idPcaPncp),
      numeroItem: 10,
      plan: PLAN,
      item: ITEM,
      fetchedAt: "2026-09-19T00:00:00Z",
      sourceRecordId: "src-1",
    },
  );
  assertEquals(decision.kind, "STALE_SOURCE_MISMATCH");
});

Deno.test("3: 2ª execução (hash já novo) → ja_atualizado", async () => {
  const novo = {
    ...normalizePcaItem(ITEM, PLAN),
    pca_plano_id: "plano-1",
  };
  const hashNovo = await hashPayload(novo);
  const decision = await decideReprojection(
    targetWithHash(hashNovo, { classificacao_catalogo_id: "1" }),
    {
      idPcaPncp: String(PLAN.idPcaPncp),
      numeroItem: 10,
      plan: PLAN,
      item: ITEM,
      fetchedAt: "2026-09-19T00:00:00Z",
      sourceRecordId: "src-1",
    },
  );
  assertEquals(decision.kind, "ja_atualizado");
});

Deno.test("7: duas versões na fonte → selectLatestSourceItems fica com a mais recente", () => {
  const latest = selectLatestSourceItems([
    {
      id: "old",
      fetched_at: "2026-09-18T10:00:00Z",
      payload: {
        data: [{
          idPcaPncp: PLAN.idPcaPncp,
          itens: [{ ...ITEM, classificacaoCatalogoId: 2 }],
        }],
      },
    },
    {
      id: "new",
      fetched_at: "2026-09-19T18:00:00Z",
      payload: {
        data: [{
          idPcaPncp: PLAN.idPcaPncp,
          itens: [{ ...ITEM, classificacaoCatalogoId: 1 }],
        }],
      },
    },
  ]);
  const hit = latest.get(`${PLAN.idPcaPncp}|10`);
  assertEquals(hit?.sourceRecordId, "new");
  assertEquals(hit?.item.classificacaoCatalogoId, 1);
});

type FakeState = {
  lockBusy: boolean;
  source: Array<{ id: string; fetched_at: string; payload: unknown }>;
  itens: Array<Record<string, unknown>>;
  snapshots: Array<Record<string, unknown>>;
  updates: Array<{ table: string; id: string; patch: Record<string, unknown> }>;
  alteracoesInserts: number;
  syncRuns: Array<Record<string, unknown>>;
};

function fakeClient(state: FakeState) {
  const client = {
    schema(name: string) {
      return {
        from(table: string) {
          if (name === "private" && table === "pncp_sync_run") {
            return {
              select(_cols: string) {
                return {
                  eq(_k: string, _v: unknown) {
                    return this;
                  },
                  async maybeSingle() {
                    if (state.lockBusy) {
                      return {
                        data: {
                          id: "busy-run",
                          iniciada_em: new Date().toISOString(),
                        },
                        error: null,
                      };
                    }
                    return { data: null, error: null };
                  },
                };
              },
              insert(row: Record<string, unknown>) {
                const id = `run-${state.syncRuns.length + 1}`;
                state.syncRuns.push({ ...row, id });
                return {
                  select(_c: string) {
                    return {
                      async single() {
                        return { data: { id }, error: null };
                      },
                    };
                  },
                };
              },
              update(patch: Record<string, unknown>) {
                return {
                  async eq(_k: string, id: string) {
                    const run = state.syncRuns.find((r) => r.id === id);
                    if (run) Object.assign(run, patch);
                    return { error: null };
                  },
                };
              },
            };
          }
          if (name === "private" && table === "source_record") {
            return {
              select(_cols: string) {
                const result = Promise.resolve({
                  data: state.source,
                  error: null,
                });
                const chain = {
                  eq(_k: string, _v: unknown) {
                    return chain;
                  },
                  order(_c: string, _o: unknown) {
                    return result;
                  },
                };
                return chain;
              },
            };
          }
          if (name === "private" && table === "pca_itens_snapshot_p0") {
            return {
              upsert(rows: Record<string, unknown>[]) {
                state.snapshots.push(...rows);
                return Promise.resolve({ error: null });
              },
              select(_cols: string) {
                return {
                  eq(_k: string, snapshotId: string) {
                    return Promise.resolve({
                      data: state.snapshots.filter((s) =>
                        s.snapshot_id === snapshotId
                      ),
                      error: null,
                    });
                  },
                };
              },
            };
          }
          throw new Error(`unexpected private table ${table}`);
        },
      };
    },
    from(table: string) {
      if (table === "pca_alteracoes") {
        return {
          insert(_row: unknown) {
            state.alteracoesInserts += 1;
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === "pca_itens") {
        return {
          select(_cols: string) {
            return Promise.resolve({
              data: state.itens,
              error: null,
            });
          },
          update(patch: Record<string, unknown>) {
            return {
              async eq(_k: string, id: string) {
                state.updates.push({ table, id: String(id), patch });
                const row = state.itens.find((r) => String(r.id) === String(id));
                if (row) Object.assign(row, patch);
                return { error: null };
              },
            };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return client as never;
}

Deno.test("4+5: confirmar grava só classificacao+hash; dry-run não grava; zero pca_alteracoes", async () => {
  const legacy = {
    ...normalizePcaItemLegacy(ITEM, PLAN),
    pca_plano_id: "plano-1",
  };
  const hashAntigo = await hashPayload(legacy);

  const baseState = (): FakeState => ({
    lockBusy: false,
    source: [{
      id: "src",
      fetched_at: "2026-09-19T00:00:00Z",
      payload: { data: [{ idPcaPncp: PLAN.idPcaPncp, itens: [ITEM] }] },
    }],
    itens: [{
      id: "item-1",
      pca_plano_id: "plano-1",
      numero_item: 10,
      payload_hash: hashAntigo,
      classificacao_catalogo_id: null,
      pca_planos: { id_pca_pncp: PLAN.idPcaPncp },
    }],
    snapshots: [],
    updates: [],
    alteracoesInserts: 0,
    syncRuns: [],
  });

  const dry = baseState();
  const dryReport = await runPcaReprojecaoClassificacao(
    fakeClient(dry),
    { dryRun: true, takeSnapshot: false },
  );
  assertEquals(dryReport.atualizados, 1);
  assertEquals(dry.updates.length, 0);
  assertEquals(dry.alteracoesInserts, 0);

  const live = baseState();
  const liveReport = await runPcaReprojecaoClassificacao(
    fakeClient(live),
    { dryRun: false, takeSnapshot: true, snapshotId: "snap-test" },
  );
  assertEquals(liveReport.atualizados, 1);
  assertEquals(live.updates.length, 1);
  assertEquals(live.updates[0].patch.classificacao_catalogo_id, "1");
  assertEquals(typeof live.updates[0].patch.payload_hash, "string");
  assertEquals(live.updates[0].patch.updated_at, undefined);
  assertEquals(live.alteracoesInserts, 0);
  assertEquals(live.snapshots.length, 1);

  // 2ª execução sobre estado já atualizado
  const again = await runPcaReprojecaoClassificacao(
    fakeClient(live),
    { dryRun: false, takeSnapshot: false },
  );
  assertEquals(again.atualizados, 0);
  assertEquals(again.ja_atualizado, 1);
});

Deno.test("6: lock ocupado → erro explícito", async () => {
  const state: FakeState = {
    lockBusy: true,
    source: [],
    itens: [],
    snapshots: [],
    updates: [],
    alteracoesInserts: 0,
    syncRuns: [],
  };
  await assertRejects(
    () =>
      runPcaReprojecaoClassificacao(fakeClient(state), {
        dryRun: true,
        takeSnapshot: false,
      }),
    Error,
    "Lock ocupado",
  );
});

Deno.test("8: rollback restaura exatamente o snapshot", async () => {
  const state: FakeState = {
    lockBusy: false,
    source: [],
    itens: [{
      id: "item-1",
      classificacao_catalogo_id: "1",
      payload_hash: "hash-novo",
      updated_at: "2026-09-26T00:00:00Z",
    }],
    snapshots: [{
      snapshot_id: "snap-1",
      pca_item_id: "item-1",
      classificacao_catalogo_id: null,
      payload_hash: "hash-antigo",
    }],
    updates: [],
    alteracoesInserts: 0,
    syncRuns: [],
  };
  const client = fakeClient(state);
  const n = await restorePcaItensSnapshot(client, "snap-1");
  assertEquals(n, 1);
  assertEquals(state.itens[0].classificacao_catalogo_id, null);
  assertEquals(state.itens[0].payload_hash, "hash-antigo");
  assertEquals(state.alteracoesInserts, 0);
});

Deno.test("snapshot take grava id+hash+classificacao", async () => {
  const state: FakeState = {
    lockBusy: false,
    source: [],
    itens: [{
      id: "item-1",
      classificacao_catalogo_id: null,
      payload_hash: "h1",
      updated_at: "2026-09-19T00:00:00Z",
    }],
    snapshots: [],
    updates: [],
    alteracoesInserts: 0,
    syncRuns: [],
  };
  const n = await takePcaItensSnapshot(fakeClient(state), "snap-x");
  assertEquals(n, 1);
  assertEquals(state.snapshots[0].snapshot_id, "snap-x");
  assertEquals(state.snapshots[0].payload_hash, "h1");
});

Deno.test("normalizePcaItemLegacy omite classificacao_catalogo_id (hash antigo)", () => {
  const full = normalizePcaItem(ITEM, PLAN);
  const legacy = normalizePcaItemLegacy(ITEM, PLAN);
  assertEquals(full.classificacao_catalogo_id, "1");
  assertEquals("classificacao_catalogo_id" in legacy, false);
});
