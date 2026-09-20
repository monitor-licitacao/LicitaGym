/**
 * Runner compartilhado: cruza fixture com contrato da seção.
 */
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import {
  CONTRACTS,
  type EndpointContract,
} from "../../../../docs/compras-gov/contracts/index.ts";
import { assertDtoKeys } from "./assertDtoKeys.ts";
import { loadFixture, repoRootFromSmoke } from "./loadFixture.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

export async function runSecaoSmoke(secao: string): Promise<void> {
  const contracts = CONTRACTS.filter((c) => c.secao === secao);
  assert(contracts.length > 0, `sem contratos para seção ${secao}`);

  const fixturesRoot = join(repoRootFromSmoke(), "fixtures", "compras-gov");

  let live = false;
  try {
    live = Deno.env.get("COMPRAS_SMOKE_LIVE") === "1";
  } catch {
    live = false;
  }
  let ran = 0;

  for (const contract of contracts) {
    if (contract.status === "nao-testado" || contract.status === "live-only") {
      if (!live) {
        console.log(
          `[skip] ${secao}/${contract.endpoint} status=${contract.status}`,
        );
        continue;
      }
    }

    if (!contract.fixtureFile) {
      console.log(`[skip] ${secao}/${contract.endpoint} sem fixture`);
      continue;
    }

    await assertFixtureAgainstContract(fixturesRoot, contract);
    ran++;
  }

  if (ran === 0 && contracts.every((c) => c.status === "nao-testado")) {
    console.log(`[ok-skip] seção ${secao} inteira nao-testado`);
    return;
  }

  assert(
    ran > 0 || contracts.every((c) => c.status !== "fixture-ok"),
    `seção ${secao}: nenhum smoke fixture-ok executado`,
  );
}

async function assertFixtureAgainstContract(
  fixturesRoot: string,
  contract: EndpointContract,
): Promise<void> {
  const fixture = await loadFixture(fixturesRoot, contract.fixtureFile!);
  assert(fixture.sample.length > 0, "sample vazio");

  for (const [i, raw] of fixture.sample.entries()) {
    const item = raw as Record<string, unknown>;
    const result = assertDtoKeys(item, contract);
    assert(
      result.ok,
      `${contract.endpoint}[${i}] faltam required: ${
        result.missingRequired.join(", ")
      }`,
    );
    if (result.unknownKeys.length > 0) {
      console.warn(
        `[warn] ${contract.endpoint}[${i}] keys fora do contrato: ${
          result.unknownKeys.join(", ")
        }`,
      );
    }
  }
  console.log(
    `[ok] ${contract.secao}/${contract.endpoint} n=${fixture.sample.length}`,
  );
}
