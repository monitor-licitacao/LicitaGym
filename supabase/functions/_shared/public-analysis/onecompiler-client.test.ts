import { executeOneCompiler, OneCompilerError } from "./onecompiler-client.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

async function assertRejects(
  promise: Promise<unknown>,
  code: OneCompilerError["code"],
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof OneCompilerError && error.code === code) return;
    throw error;
  }
  throw new Error("era esperado que a promise fosse rejeitada");
}

Deno.test("aceita somente execução sem erro e devolve métricas", async () => {
  const fetchImpl: typeof fetch = (_input, init) => {
    const headers = new Headers(init?.headers);
    assertEquals(headers.get("X-API-Key"), "test-key");
    return Promise.resolve(
      new Response(
        JSON.stringify({
          status: "success",
          stdout: JSON.stringify({ ok: true }),
          stderr: null,
          exception: null,
          compilationTime: 0,
          executionTime: 12,
          memoryUsed: 9000,
          limitPerMonthRemaining: 99,
        }),
        { status: 200 },
      ),
    );
  };

  const execution = await executeOneCompiler({
    apiKey: "test-key",
    language: "nodejs",
    filename: "main.js",
    source: "process.stdout.write('{}')",
    stdin: "{}",
    parseOutput: (value) => value as { ok: boolean },
    fetchImpl,
  });

  assertEquals(execution, {
    output: { ok: true },
    metrics: {
      compilation_time_ms: 0,
      execution_time_ms: 12,
      memory_used_kb: 9000,
      quota_remaining: 99,
    },
  });
});

Deno.test("trata timeout declarado como falha mesmo com status success", async () => {
  const fetchImpl: typeof fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          status: "success",
          error: "E001: operation timed out",
        }),
        { status: 200 },
      ),
    );

  await assertRejects(
    executeOneCompiler({
      apiKey: "test-key",
      language: "nodejs",
      filename: "main.js",
      source: "",
      stdin: "{}",
      parseOutput: (value) => value,
      fetchImpl,
    }),
    "provider_failure",
  );
});
