import { runSecaoSmoke } from "../_shared/runSecaoSmoke.ts";


Deno.test("smoke seção 10", async () => {
  await runSecaoSmoke("10");
});

