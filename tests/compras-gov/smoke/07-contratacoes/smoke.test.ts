import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";
import { assertSecaoLegislacaoSeed } from "../_shared/assertLegislacao.ts";

Deno.test("smoke seção 07", async () => {
  await runSecaoSmoke("07");
});

Deno.test("legislacao seed FK seção 07", async () => {
  await assertSecaoLegislacaoSeed("07");
});
