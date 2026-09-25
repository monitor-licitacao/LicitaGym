/**
 * Regression: Compras.gov material-client uses withRetry(fn, 6, 2_500).
 * Timeout must be allowed across all 6 attempts when no RequestBudget is bound
 * (commit 13e4624 + PR #47 item 2 — do not force maxTimeoutRetries: 1 on legacy overload).
 */
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { withRetry } from "../../../../../supabase/functions/_shared/pncp/retry.ts";

Deno.test(
  "material-client numeric overload withRetry(fn, 6, delay) allows 6 timeouts",
  async () => {
    let attempts = 0;
    await assertRejects(
      () =>
        withRetry(
          async () => {
            attempts += 1;
            throw new DOMException(
              "The operation was aborted due to timeout",
              "TimeoutError",
            );
          },
          6,
          1,
        ),
      DOMException,
    );
    assertEquals(attempts, 6);
  },
);

Deno.test(
  "material-client equivalent options (no budget) allow 6 timeout attempts",
  async () => {
    let attempts = 0;
    const sleeps: number[] = [];
    await assertRejects(
      () =>
        withRetry(
          async () => {
            attempts += 1;
            throw new Error("Compras.gov timeout (60s)");
          },
          {
            maxAttempts: 6,
            baseDelayMs: 2_500,
            random: () => 0,
            sleep: async (ms) => {
              sleeps.push(ms);
            },
          },
        ),
      Error,
      "timeout",
    );
    assertEquals(attempts, 6);
    assertEquals(sleeps.length, 5);
  },
);
