import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";
import { assertSecaoLegislacaoSeed } from "../_shared/assertLegislacao.ts";

Deno.test("smoke seção 04", async () => {
  await runSecaoSmoke("04");
});

Deno.test("legislacao seed FK seção 04", async () => {
  await assertSecaoLegislacaoSeed("04");
});
