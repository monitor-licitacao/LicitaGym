import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { SECOES_COM_LEGISLACAO } from "../../../../docs/compras-gov/contracts/index.ts";
import { repoRootFromSmoke } from "./loadFixture.ts";

interface SeedRow {
  secao_codigo: string;
  titulo: string;
  url_canonica: string;
  papel: string;
}

export async function assertSecaoLegislacaoSeed(
  secao: string,
): Promise<void> {
  const meta = SECOES_COM_LEGISLACAO[secao];
  if (!meta) {
    console.log(`[skip] seção ${secao} sem legislação mapeada`);
    return;
  }

  const path = join(
    repoRootFromSmoke(),
    "fixtures",
    "compras-gov",
    "legislacao",
    "secao-legislacao.seed.json",
  );
  const rows = JSON.parse(await Deno.readTextFile(path)) as SeedRow[];
  const forSecao = rows.filter((r) => r.secao_codigo === secao);
  if (forSecao.length === 0) {
    throw new Error(
      `seção ${secao} exige legislação (${meta.normas.join(", ")}) mas seed vazio`,
    );
  }
  for (const row of forSecao) {
    if (!row.url_canonica.startsWith("https://")) {
      throw new Error(`url_canonica inválida: ${row.url_canonica}`);
    }
    if (row.papel !== meta.papel) {
      throw new Error(
        `papel seed=${row.papel} esperado=${meta.papel} seção=${secao}`,
      );
    }
  }
  console.log(
    `[ok] legislação seed seção ${secao}: ${
      forSecao.map((r) => r.titulo).join("; ")
    }`,
  );
}
