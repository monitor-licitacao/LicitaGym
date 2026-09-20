import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";


Deno.test("smoke seção 01", async () => {
  await runSecaoSmoke("01");
});

