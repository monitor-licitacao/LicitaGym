import {
  MATERIAL_RULE_SOURCE,
  type MaterialRuleOutput,
  parseMaterialRuleOutput,
} from "./material-rule.ts";

type Listener = (chunk?: string) => void;

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `esperado ${JSON.stringify(expected)}, recebido ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function executeStaticRule(input: unknown): MaterialRuleOutput {
  const listeners: Record<string, Listener> = {};
  let stdout = "";
  let stderr = "";
  const fakeProcess = {
    stdin: {
      setEncoding: (_encoding: string) => undefined,
      on: (event: string, listener: Listener) => {
        listeners[event] = listener;
      },
    },
    stdout: { write: (value: string) => stdout += value },
    stderr: { write: (value: string) => stderr += value },
    exitCode: 0,
  };

  const run = new Function("process", MATERIAL_RULE_SOURCE) as (
    process: typeof fakeProcess,
  ) => void;
  run(fakeProcess);
  listeners.data(JSON.stringify(input));
  listeners.end();

  if (stderr) throw new Error(stderr);
  return parseMaterialRuleOutput(JSON.parse(stdout));
}

Deno.test("classifica piso de quadra sem confundir com piso de borracha", () => {
  const output = executeStaticRule({
    item: {
      description:
        "Piso modular para quadra em polipropileno, 100 x 100 cm, espessura 40 mm, não borracha.",
      attributes: {},
    },
    catalog_reference: {
      descricao: "Piso de borracha para academia",
      taxonomias: { material: "borracha" },
    },
    catmat_characteristics: [],
  });

  assertEquals(output.classification, {
    category: "piso_quadra",
    observed_materials: ["polipropileno"],
  });
  assertEquals(output.consistency, "divergent");
  assertEquals(output.conflicts[0]?.field, "material");
  assertEquals(output.conflicts[0]?.expected, ["borracha"]);
  assertEquals(output.conflicts[0]?.observed, ["polipropileno"]);
});

Deno.test("não inventa consistência quando a referência CATMAT está ausente", () => {
  const output = executeStaticRule({
    item: {
      description: "Piso para quadra em polipropileno, placa 100x100 cm, 50 mm",
      attributes: {},
    },
    catalog_reference: null,
    catmat_characteristics: [],
  });

  assertEquals(output.consistency, "not_verifiable");
  assertEquals(output.reference_found, false);
  assertEquals(output.conflicts, []);
});
