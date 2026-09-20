import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";
import { assertSecaoLegislacaoSeed } from "../_shared/assertLegislacao.ts";

Deno.test("smoke seção 08", async () => {
  await runSecaoSmoke("08");
});

Deno.test("legislacao seed FK seção 08", async () => {
  await assertSecaoLegislacaoSeed("08");
});
