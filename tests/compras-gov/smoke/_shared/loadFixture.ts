import { dirname, fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";

export interface FixturePayload {
  endpointHint: string;
  sourceFile: string;
  dtoInterface: string;
  interfaceKeys: string[];
  sample: Record<string, unknown>[];
}

export function repoRootFromSmoke(): string {
  // _shared/loadFixture.ts → smoke → compras-gov → tests → root
  const here = dirname(fromFileUrl(import.meta.url));
  return join(here, "..", "..", "..", "..");
}

export async function loadFixture(
  fixturesRoot: string,
  relativePath: string,
): Promise<FixturePayload> {
  const path = join(fixturesRoot, ...relativePath.split("/"));
  const text = await Deno.readTextFile(path);
  const data = JSON.parse(text) as FixturePayload;
  if (!Array.isArray(data.sample) || data.sample.length === 0) {
    throw new Error(`fixture vazia: ${relativePath}`);
  }
  return data;
}
