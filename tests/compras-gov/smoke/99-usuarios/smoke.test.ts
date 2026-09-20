import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";


Deno.test("smoke seção 99", async () => {
  await runSecaoSmoke("99");
});

