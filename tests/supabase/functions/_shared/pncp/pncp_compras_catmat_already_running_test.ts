/**
 * Item 10 — already_running / non-terminal child runs must not look like success.
 */
import { assertEquals } from "jsr:@std/assert@1";

Deno.test("sync-compras-catmat aggregate treats already_running as partial failure", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/sync-compras-catmat/index.ts",
  );
  assertEquals(src.includes('run.status === "already_running"'), true);
  assertEquals(src.includes("nonTerminal"), true);
  assertEquals(src.includes("aggregateStatus"), true);
});
