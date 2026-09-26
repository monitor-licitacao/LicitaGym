import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { installFetch, PncpConsultaClient } from "./_harness.ts";

function installFastRetrySleep(): { restore: () => void; retryDelays: number[] } {
  const originalSetTimeout = globalThis.setTimeout;
  const retryDelays: number[] = [];
  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const delay = Number(timeout ?? 0);
    if (delay <= 5_000) {
      retryDelays.push(delay);
      if (typeof handler === "function") {
        handler(...args);
      }
      return 0;
    }
    return originalSetTimeout(handler, timeout, ...args);
  }) as typeof setTimeout;
  return {
    retryDelays,
    restore: () => {
      globalThis.setTimeout = originalSetTimeout;
    },
  };
}

Deno.test("B3b HTTP 500 is retried 3 times on the same pagina then throws", async () => {
  const mock = installFetch(() => new Response("boom", { status: 500 }));
  const retrySleep = installFastRetrySleep();
  try {
    const client = new PncpConsultaClient("https://pncp.test/api/consulta/v1");
    await assertRejects(
      () =>
        client.fetchAtas({
          dataInicial: "20260101",
          dataFinal: "20260102",
          pagina: 5,
        }),
      Error,
      "PNCP consulta HTTP 500",
    );
    assertEquals(mock.urls.length, 3);
    for (const url of mock.urls) {
      assertEquals(new URL(url).searchParams.get("pagina"), "5");
    }
    assertEquals(retrySleep.retryDelays.length, 2);
    assert(retrySleep.retryDelays[0] >= 1000 && retrySleep.retryDelays[0] <= 1250);
    assert(retrySleep.retryDelays[1] >= 2000 && retrySleep.retryDelays[1] <= 2250);
  } finally {
    retrySleep.restore();
    mock.restore();
  }
});

Deno.test("B3b HTTP 503 success on second attempt returns that body", async () => {
  let n = 0;
  const mock = installFetch(() => {
    n++;
    if (n === 1) return new Response("unavailable", { status: 503 });
    return new Response(JSON.stringify({ data: [{ id: 1 }], paginasRestantes: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  const retrySleep = installFastRetrySleep();
  try {
    const client = new PncpConsultaClient("https://pncp.test/api/consulta/v1");
    const result = await client.fetchContratos({
      dataInicial: "20260101",
      dataFinal: "20260102",
      pagina: 5,
    });
    assertEquals(result.status, 200);
    assertEquals(mock.urls.length, 2);
    assertEquals(client.extractList(result.body), [{ id: 1 }]);
    assertEquals(retrySleep.retryDelays.length, 1);
    assert(retrySleep.retryDelays[0] >= 1000 && retrySleep.retryDelays[0] <= 1250);
  } finally {
    retrySleep.restore();
    mock.restore();
  }
});
