import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";
import { assertSecaoLegislacaoSeed } from "../_shared/assertLegislacao.ts";

Deno.test("smoke seção 09", async () => {
  await runSecaoSmoke("09");
});

Deno.test("legislacao seed FK seção 09", async () => {
  await assertSecaoLegislacaoSeed("09");
});
