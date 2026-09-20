import type { EndpointContract } from "../../../../docs/compras-gov/contracts/index.ts";

export interface AssertResult {
  ok: boolean;
  missingRequired: string[];
  unknownKeys: string[];
}

export function assertDtoKeys(
  item: Record<string, unknown>,
  contract: EndpointContract,
): AssertResult {
  const keys = Object.keys(item);
  const missingRequired = contract.requiredKeys.filter((k) => !(k in item));
  const known = new Set(contract.knownKeys);
  const unknownKeys = keys.filter((k) => !known.has(k));
  return {
    ok: missingRequired.length === 0,
    missingRequired,
    unknownKeys,
  };
}

export function assertEnvelope(payload: Record<string, unknown>): void {
  for (const key of [
    "resultado",
    "totalRegistros",
    "totalPaginas",
    "paginasRestantes",
  ]) {
    if (!(key in payload)) {
      throw new Error(`envelope sem campo ${key}`);
    }
  }
  if (!Array.isArray(payload.resultado)) {
    throw new Error("envelope.resultado deve ser array");
  }
}
