/**
 * Edge request budget + retry contracts for PNCP consulta.
 *
 * Cause (24/09 16:02 UTC): 45s × 3 ≈ 138s > Edge wall → EarlyDrop 503 (139.653ms).
 */
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import {
  BudgetExhaustedError,
  CONSULTA_PAGE_SIZE,
  createRequestBudget,
  PncpConsultaClient,
} from "../../../../../supabase/functions/_shared/pncp/consulta-client.ts";
import {
  EDGE_REQUEST_DEADLINE_MS,
  EmptyBodyAnomalyError,
  fetchWithTimeout,
  isTimeoutError,
  PermanentHttpError,
  retryDelayWithJitter,
  withRetry,
} from "../../../../../supabase/functions/_shared/pncp/retry.ts";
import { PncpSearchClient } from "../../../../../supabase/functions/_shared/pncp/search-client.ts";

function hangingFetchOnAbort(): typeof fetch {
  return ((_input, init) =>
    new Promise((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error("expected AbortSignal"));
        return;
      }
      if (signal.aborted) {
        reject(
          signal.reason instanceof Error
            ? signal.reason
            : new DOMException("Aborted", "AbortError"),
        );
        return;
      }
      signal.addEventListener("abort", () => {
        reject(
          signal.reason instanceof Error
            ? signal.reason
            : new DOMException(
              "The operation was aborted due to timeout",
              "TimeoutError",
            ),
        );
      }, { once: true });
    })) as typeof fetch;
}

Deno.test("CONSULTA_PAGE_SIZE.pca stays 500 (C4 deferred)", () => {
  assertEquals(CONSULTA_PAGE_SIZE.pca.min, 20);
  assertEquals(CONSULTA_PAGE_SIZE.pca.max, 500);
  assertEquals(CONSULTA_PAGE_SIZE.pca.default, 500);
});

Deno.test("retryDelayWithJitter grows 1s, 2s, 4s without jitter", () => {
  const random = () => 0;
  assertEquals(retryDelayWithJitter(1, 1000, random), 1000);
  assertEquals(retryDelayWithJitter(2, 1000, random), 2000);
  assertEquals(retryDelayWithJitter(3, 1000, random), 4000);
});

Deno.test("timeouts: at most one retry then stop before deadline", async () => {
  const sleeps: number[] = [];
  let attempts = 0;
  const start = 1_000_000;
  let now = start;
  const budget = createRequestBudget(20_000, start);

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
        {
          maxAttempts: 5,
          maxTimeoutRetries: 1,
          baseDelayMs: 1000,
          budget,
          random: () => 0,
          now: () => now,
          sleep: async (ms) => {
            sleeps.push(ms);
            now += ms;
          },
        },
      ),
    BudgetExhaustedError,
  );

  assertEquals(attempts, 2);
  assertEquals(sleeps.length, 1);
  assertEquals(now - start < EDGE_REQUEST_DEADLINE_MS, true);
  assertEquals(now - start <= 20_000, true);
});

Deno.test("BUDGET_EXHAUSTED when remaining cannot fit another attempt", async () => {
  const start = 5_000_000;
  let now = start;
  const budget = createRequestBudget(5_000, start);
  let attempts = 0;

  await assertRejects(
    () =>
      withRetry(
        async () => {
          attempts += 1;
          now += 2_000;
          throw new DOMException("timeout", "TimeoutError");
        },
        {
          maxAttempts: 5,
          maxTimeoutRetries: 1,
          baseDelayMs: 1000,
          budget,
          random: () => 0,
          now: () => now,
          sleep: async (ms) => {
            now += ms;
          },
        },
      ),
    BudgetExhaustedError,
  );
  assertEquals(attempts >= 1, true);
});

Deno.test("400/422 are permanent — no retry", async () => {
  let attempts = 0;
  await assertRejects(
    () =>
      withRetry(async () => {
        attempts += 1;
        throw new PermanentHttpError("PNCP consulta HTTP 422");
      }, { maxAttempts: 5, maxTimeoutRetries: 1 }),
    PermanentHttpError,
  );
  assertEquals(attempts, 1);
});

Deno.test("isTimeoutError recognizes AbortError and message", () => {
  assertEquals(isTimeoutError(new DOMException("x", "TimeoutError")), true);
  assertEquals(isTimeoutError(new DOMException("x", "AbortError")), true);
  assertEquals(
    isTimeoutError(new Error("PNCP consulta timeout (45000ms)")),
    true,
  );
  assertEquals(isTimeoutError(new Error("boom")), false);
});

Deno.test("fetchWithTimeout clears timer on success (no leak)", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("{}", { status: 200 })) as typeof fetch;
  try {
    const res = await fetchWithTimeout("https://example.test/", {}, 5_000);
    assertEquals(res.status, 200);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("fetchWithTimeout clears timer on abort timeout (no leak)", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = hangingFetchOnAbort();
  try {
    await assertRejects(
      () => fetchWithTimeout("https://example.test/", {}, 30),
      DOMException,
    );
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("fetchWithTimeout mantém timeout até consumir body", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    const signal = init?.signal;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{"));
        signal?.addEventListener("abort", () => {
          controller.error(
            signal.reason instanceof Error
              ? signal.reason
              : new DOMException("The operation was aborted due to timeout", "TimeoutError"),
          );
        }, { once: true });
      },
    });
    return new Response(stream, { status: 200 });
  }) as typeof fetch;
  try {
    await assertRejects(
      () => fetchWithTimeout("https://example.test/", {}, 30),
      DOMException,
    );
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("consulta: HTTP 204 is valid empty", async () => {
  const original = globalThis.fetch;
  globalThis.fetch =
    (async () => new Response(null, { status: 204 })) as typeof fetch;
  try {
    const client = new PncpConsultaClient("https://example.test/v1");
    const result = await client.getJson("/pca/", { anoPca: 2026 });
    assertEquals(result.status, 204);
    assertEquals(result.body, {});
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("consulta: HTTP 200 empty → anomaly → one retry → permanent", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("", { status: 200 });
  }) as typeof fetch;
  try {
    const client = new PncpConsultaClient("https://example.test/v1");
    await assertRejects(
      () => client.getJson("/pca/", { anoPca: 2026 }),
      PermanentHttpError,
      "after retry",
    );
    assertEquals(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("consulta: HTTP 200 empty then body → recovers on retry", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) return new Response("", { status: 200 });
    return new Response(
      JSON.stringify({ data: [], totalRegistros: 0, paginasRestantes: 0 }),
      { status: 200 },
    );
  }) as typeof fetch;
  try {
    const client = new PncpConsultaClient("https://example.test/v1");
    const result = await client.getJson("/pca/", { anoPca: 2026 });
    assertEquals(result.status, 200);
    assertEquals(calls, 2);
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("EmptyBodyAnomalyError is retryable once via withRetry", async () => {
  let attempts = 0;
  await assertRejects(
    () =>
      withRetry(
        async () => {
          attempts += 1;
          throw new EmptyBodyAnomalyError();
        },
        {
          maxAttempts: 5,
          maxEmptyBodyRetries: 1,
          baseDelayMs: 1,
          random: () => 0,
          sleep: async () => {},
        },
      ),
    PermanentHttpError,
    "after retry",
  );
  assertEquals(attempts, 2);
});

Deno.test("withRetry overload numérico preserva tentativas explícitas", async () => {
  let attempts = 0;
  await assertRejects(
    () =>
      withRetry(async () => {
        attempts += 1;
        throw new DOMException("timeout", "TimeoutError");
      }, 6, 1),
    DOMException,
  );
  assertEquals(attempts, 6);
});

Deno.test("search client respeita budget compartilhado", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = hangingFetchOnAbort();
  try {
    const budget = createRequestBudget(8_000);
    const client = new PncpSearchClient("https://example.test/search").withBudget(budget);
    await assertRejects(
      () => client.summarizePcaPeriod(2026),
      BudgetExhaustedError,
    );
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test("consulta: HTTP 422 does not retry", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response("bad", { status: 422 });
  }) as typeof fetch;
  try {
    const client = new PncpConsultaClient("https://example.test/v1");
    await assertRejects(
      () => client.getJson("/pca/", { anoPca: 2026 }),
      PermanentHttpError,
      "HTTP 422",
    );
    assertEquals(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

/**
 * Scenario 24/09: /v1/pca/ times out every attempt.
 * Old policy 45×3 ≈ 138s → EarlyDrop. New: ≤1 timeout retry + 110s budget
 * → BudgetExhaustedError and wall clock < 110s.
 *
 * Uses compressed attempt cap via short budget so CI stays fast; the production
 * path is the same code with EDGE_REQUEST_DEADLINE_MS + 45s cap.
 */
Deno.test({
  name:
    "scenario 24/09: /v1/pca/ all timeouts → BUDGET_EXHAUSTED before 110s",
  sanitizeOps: true,
  sanitizeResources: true,
  async fn() {
    const original = globalThis.fetch;
    globalThis.fetch = hangingFetchOnAbort();
    const wallStart = Date.now();
    try {
      // Soft deadline mirrors production EDGE_REQUEST_DEADLINE_MS shape, but
      // attemptTimeoutMs is capped by remaining−margin. Use 8s budget + hang
      // so two attempts finish well under 110s wall (proves no 45×3 path).
      const budget = createRequestBudget(8_000);
      const client = new PncpConsultaClient("https://example.test/v1")
        .withBudget(budget);

      await assertRejects(
        () => client.fetchPcaPage(2026, 1, "7830"),
        BudgetExhaustedError,
      );

      const elapsed = Date.now() - wallStart;
      assertEquals(elapsed < EDGE_REQUEST_DEADLINE_MS, true);
      // Must not approach old 138s failure mode.
      assertEquals(elapsed < 110_000, true);
    } finally {
      globalThis.fetch = original;
    }
  },
});

/**
 * Production-constant path: 45s cap × 2 attempts under 110s budget.
 * Slow (~90s). Enable by changing `ignore` to false locally when needed.
 */
Deno.test({
  name:
    "scenario 24/09 slow: production 45s×2 under 110s → BUDGET_EXHAUSTED",
  ignore: true,
  sanitizeOps: true,
  sanitizeResources: true,
  async fn() {
    const original = globalThis.fetch;
    globalThis.fetch = hangingFetchOnAbort();
    const wallStart = Date.now();
    try {
      const budget = createRequestBudget(EDGE_REQUEST_DEADLINE_MS);
      const client = new PncpConsultaClient("https://example.test/v1")
        .withBudget(budget);

      await assertRejects(
        () => client.fetchPcaPage(2026, 1, "7830"),
        BudgetExhaustedError,
      );

      const elapsed = Date.now() - wallStart;
      assertEquals(elapsed < 110_000, true);
      // At least one full attempt ran (not instant budget reject).
      assertEquals(elapsed > 40_000, true);
    } finally {
      globalThis.fetch = original;
    }
  },
});
