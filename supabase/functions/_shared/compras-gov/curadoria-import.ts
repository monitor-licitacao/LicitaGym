export type CuradoriaItemFlat = {
  codigo_catmat: string;
  codigo_pdm?: string;
  descricao?: string;
  categoria_licitagym?: string | null;
  candidato_fitness?: boolean;
  taxonomias?: Record<string, string | number | null>;
};

type CuradoriaPdmBlock = {
  codigoPdm?: number;
  itens?: Record<string, {
    grupo?: string;
    ordem?: number;
    categoria?: string;
    subcategoria?: string | null;
    origem?: string;
  }>;
};

type CuradoriaExportV2 = {
  curadoriaInicialPorCodigoPdm?: Record<string, CuradoriaPdmBlock>;
  excecoesPorCodigoItem?: Record<string, {
    categoria?: string;
    subcategoria?: string | null;
    grupo?: string;
    ordem?: number;
    origem?: string;
  }>;
};

type LegacyImportBody = {
  itens?: CuradoriaItemFlat[];
  items?: CuradoriaItemFlat[];
};

const CATEGORIAS = new Set(["musculacao", "cardio", "acessorios"]);

export function normalizeCategoria(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return CATEGORIAS.has(normalized) ? normalized : null;
}

function itemFromCuradoriaEntry(
  codigoCatmat: string,
  codigoPdm: string,
  entry: NonNullable<CuradoriaPdmBlock["itens"]>[string],
): CuradoriaItemFlat {
  const taxonomias: Record<string, string | number | null> = {};
  if (entry.grupo) taxonomias.grupo_licitagym = entry.grupo;
  if (entry.ordem != null) taxonomias.ordem_grupo = entry.ordem;
  if (entry.subcategoria) taxonomias.subcategoria_licitagym = entry.subcategoria;
  if (entry.origem) taxonomias.origem_curadoria = entry.origem;

  return {
    codigo_catmat: codigoCatmat,
    codigo_pdm: codigoPdm,
    categoria_licitagym: normalizeCategoria(entry.categoria),
    candidato_fitness: true,
    taxonomias,
  };
}

/** Aceita export plano (itens[]) ou export v2 (curadoriaInicialPorCodigoPdm). */
export function expandCuradoriaPayload(body: LegacyImportBody & CuradoriaExportV2): CuradoriaItemFlat[] {
  const flat = [...(body.itens ?? body.items ?? [])];

  for (const [pdmKey, block] of Object.entries(body.curadoriaInicialPorCodigoPdm ?? {})) {
    const codigoPdm = String(block.codigoPdm ?? pdmKey);
    for (const [codigoCatmat, entry] of Object.entries(block.itens ?? {})) {
      flat.push(itemFromCuradoriaEntry(codigoCatmat, codigoPdm, entry));
    }
  }

  for (const [codigoCatmat, entry] of Object.entries(body.excecoesPorCodigoItem ?? {})) {
    flat.push(itemFromCuradoriaEntry(codigoCatmat, "", entry));
  }

  return flat;
}
