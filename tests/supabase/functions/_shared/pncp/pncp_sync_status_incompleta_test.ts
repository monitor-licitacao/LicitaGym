/**
 * Item 1 — status `incompleta` must be a legal terminal value.
 * Migration CHECK + syncTerminalStatus contract.
 */
import { assertEquals } from "jsr:@std/assert@1";
import {
  rootSlices,
  runCappedDateSync,
  syncTerminalStatus,
  type DateSlice,
} from "../../../../../supabase/functions/_shared/pncp/pagination-budget.ts";

const MIGRATION =
  "supabase/migrations/20260923203037_pncp_sync_run_status_incompleta.sql";

Deno.test("migration CHECK allows incompleta", async () => {
  const sql = await Deno.readTextFile(MIGRATION);
  assertEquals(sql.includes("'incompleta'"), true);
  assertEquals(sql.includes("pncp_sync_run_status_check"), true);
  assertEquals(sql.includes("DROP CONSTRAINT"), true);
});

Deno.test("syncTerminalStatus: pending slices → incompleta (not concluida)", () => {
  const pending: DateSlice[] = [
    { dataInicial: "20260101", dataFinal: "20260101", nextPage: 201 },
  ];
  assertEquals(syncTerminalStatus(pending, 0), "incompleta");
  assertEquals(syncTerminalStatus(pending, 3), "incompleta");
  assertEquals(syncTerminalStatus([], 0), "concluida");
  assertEquals(syncTerminalStatus([], 1), "concluida_com_erros");
});

Deno.test("capped run with remaining slices ends incompleta", async () => {
  const slices = rootSlices("20260101", "20260101");
  const result = await runCappedDateSync({
    cap: 2,
    slices,
    fetchPage: async (_slice, pagina) => ({
      paginasRestantes: pagina === 1 ? 10 : 9,
      status: 200,
      elapsedMs: 1,
      body: { data: [] },
    }),
    onPage: async () => {},
  });
  assertEquals(result.status, "incompleta");
  assertEquals(result.pending.length > 0, true);
  assertEquals(syncTerminalStatus(result.pending, 0), "incompleta");
});

/** incompleta is never treated as success by mayInactivate / terminal helpers. */
Deno.test("incompleta is not a success terminal for mayInactivateNotSeen", async () => {
  const { mayInactivateNotSeen } = await import(
    "../../../../../supabase/functions/_shared/pncp/pagination-budget.ts"
  );
  assertEquals(mayInactivateNotSeen("completo", "incompleta"), false);
  assertEquals(mayInactivateNotSeen("completo", "concluida"), true);
});
