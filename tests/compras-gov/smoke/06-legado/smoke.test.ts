import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";
import { assertSecaoLegislacaoSeed } from "../_shared/assertLegislacao.ts";

Deno.test("smoke seção 06", async () => {
  await runSecaoSmoke("06");
});

Deno.test("legislacao seed FK seção 06", async () => {
  await assertSecaoLegislacaoSeed("06");
});
