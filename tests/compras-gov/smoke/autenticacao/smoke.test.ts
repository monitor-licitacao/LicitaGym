import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";


Deno.test("smoke seção AUTENTICACAO", async () => {
  await runSecaoSmoke("AUTENTICACAO");
});

