/**
 * Item 6 — sync-compras-catmat must not hide partial failures behind HTTP 200.
 */
import { assertEquals } from "jsr:@std/assert@1";

Deno.test("sync-compras-catmat returns non-200 when erros > 0", async () => {
  const src = await Deno.readTextFile(
    "supabase/functions/sync-compras-catmat/index.ts",
  );
  assertEquals(src.includes("stats.erros > 0 ? 500 : 200"), true);
  assertEquals(
    src.includes(
      'const terminalStatus = stats.erros > 0 ? "concluida_com_erros" : "concluida"',
    ),
    true,
  );
  // Must not hardcode success status on the response body while ignoring erros.
  const hardcodedSuccessOnBody =
    /return jsonResponse\(\{[\s\S]*?status:\s*"concluida"[\s\S]*?\}\);/;
  assertEquals(hardcodedSuccessOnBody.test(src), false);
});
