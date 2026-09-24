/**
 * Item 5 — PostgREST range pagination does not truncate at 1000.
 */
import { assertEquals } from "jsr:@std/assert@1";
import {
  chunkValues,
  fetchAllByRange,
  POSTGREST_PAGE_SIZE,
} from "../../../../../supabase/functions/_shared/pncp/postgrest-paginate.ts";

Deno.test("fetchAllByRange walks until short page", async () => {
  const calls: Array<[number, number]> = [];
  const { rows, pages } = await fetchAllByRange<number>(async (from, to) => {
    calls.push([from, to]);
    if (from === 0) {
      return { data: Array.from({ length: POSTGREST_PAGE_SIZE }, (_, i) => i), error: null };
    }
    return { data: [POSTGREST_PAGE_SIZE, POSTGREST_PAGE_SIZE + 1], error: null };
  });
  assertEquals(pages, 2);
  assertEquals(rows.length, POSTGREST_PAGE_SIZE + 2);
  assertEquals(calls[0], [0, POSTGREST_PAGE_SIZE - 1]);
  assertEquals(calls[1], [POSTGREST_PAGE_SIZE, POSTGREST_PAGE_SIZE * 2 - 1]);
});

Deno.test("fetchAllByRange propagates query errors", async () => {
  let threw = false;
  try {
    await fetchAllByRange(async () => ({ data: null, error: { message: "boom" } }));
  } catch (error) {
    threw = true;
    assertEquals(error instanceof Error && error.message === "boom", true);
  }
  assertEquals(threw, true);
});

Deno.test("chunkValues splits large .in() lists", () => {
  const values = Array.from({ length: 2500 }, (_, i) => i);
  const chunks = chunkValues(values, 1000);
  assertEquals(chunks.length, 3);
  assertEquals(chunks[0].length, 1000);
  assertEquals(chunks[1].length, 1000);
  assertEquals(chunks[2].length, 500);
});

Deno.test("orgaos sync source uses fetchAllByRange with stable order", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/sync-pncp-orgaos/index.ts",
  );
  assertEquals(src.includes("fetchAllByRange"), true);
  assertEquals(src.includes("pca_itens_lidos"), true);
  assertEquals(src.includes('.order("id")'), true);
  assertEquals(src.includes("async (from, to)"), false);
});

Deno.test("catmat-scope-resolver pages with stable order keys", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/_shared/pncp/catmat-scope-resolver.ts",
  );
  assertEquals(src.includes("fetchAllByRange"), true);
  assertEquals(src.includes('.order("codigo_pdm")'), true);
  assertEquals(src.includes('.order("codigo_item")'), true);
  assertEquals(src.includes(".range(from, to)"), true);
  assertEquals(src.includes("async (from, to)"), false);
});

Deno.test("fetchAllByRange documents mandatory .order() before .range()", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/_shared/pncp/postgrest-paginate.ts",
  );
  assertEquals(src.includes("MUST apply `.order("), true);
  assertEquals(src.includes("PromiseLike<PageResult<T>>"), true);
});
