import {
  parsePublicMaterialAnalysisRequest,
  PUBLIC_ANALYSIS_TYPE,
} from "./input.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function assertThrows(fn: () => unknown, expectedMessage: string): void {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes(expectedMessage)) return;
    throw new Error(`erro não contém "${expectedMessage}": ${message}`);
  }
  throw new Error("era esperado que a função lançasse erro");
}

Deno.test("aceita item de fonte oficial e normaliza os campos", () => {
  const result = parsePublicMaterialAnalysisRequest({
    analysis_type: PUBLIC_ANALYSIS_TYPE,
    source: {
      name: "pncp",
      record_id: " 10091536000113/2025/190 ",
      url: "https://pncp.gov.br/app/editais/10091536000113/2025/190#item",
    },
    item: {
      codigo_item: "150846",
      description: " Piso modular para quadra ",
      attributes: { material: " polipropileno " },
    },
  });

  assertEquals(result, {
    analysis_type: PUBLIC_ANALYSIS_TYPE,
    source: {
      name: "pncp",
      record_id: "10091536000113/2025/190",
      url: "https://pncp.gov.br/app/editais/10091536000113/2025/190",
    },
    item: {
      codigo_item: "150846",
      description: "Piso modular para quadra",
      attributes: { material: "polipropileno" },
    },
  });
});

Deno.test("rejeita URL que não pertence à fonte pública declarada", () => {
  assertThrows(
    () =>
      parsePublicMaterialAnalysisRequest({
        analysis_type: PUBLIC_ANALYSIS_TYPE,
        source: {
          name: "pncp",
          record_id: "registro-1",
          url: "https://example.com/registro-1",
        },
        item: { description: "Piso para quadra" },
      }),
    "não pertence à fonte oficial",
  );
});

Deno.test("rejeita código CATMAT não numérico", () => {
  assertThrows(
    () =>
      parsePublicMaterialAnalysisRequest({
        analysis_type: PUBLIC_ANALYSIS_TYPE,
        source: {
          name: "compras-gov",
          record_id: "registro-2",
          url: "https://dadosabertos.compras.gov.br/modulo-material/1",
        },
        item: { codigo_item: "CATMAT-150846", description: "Piso" },
      }),
    "somente dígitos",
  );
});
