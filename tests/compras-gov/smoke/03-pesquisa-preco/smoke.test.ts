import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";
import { assertSecaoLegislacaoSeed } from "../_shared/assertLegislacao.ts";

Deno.test("smoke seção 03", async () => {
  await runSecaoSmoke("03");
});

Deno.test("legislacao seed FK seção 03", async () => {
  await assertSecaoLegislacaoSeed("03");
});
