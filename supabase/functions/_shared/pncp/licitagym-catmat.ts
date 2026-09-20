/** Recorte CATMAT fitness — grupo 78 / classe 7830 (ginástica e recreação). */
export const LICITAGYM_CATMAT_GRUPO = "78";
export const LICITAGYM_CATMAT_CLASSE = "7830";

/**
 * Pares grupo/classe oficiais aceitos no catálogo LicitaGym.
 * PCA, `PNCP_PCA_CLASSIFICACOES` e perguntas canônicas continuam só 78/7830.
 * 72/7220 entra para curadoria (REVESTIMENTOS PARA PISOS).
 */
export const LICITAGYM_CATMAT_CATALOGO: ReadonlyArray<{
  grupo: string;
  classe: string;
}> = [
  { grupo: LICITAGYM_CATMAT_GRUPO, classe: LICITAGYM_CATMAT_CLASSE },
  { grupo: "72", classe: "7220" },
];

export function isCatalogoCatmatClasseAllowed(
  codigoGrupo: number,
  codigoClasse: number,
): boolean {
  const grupo = String(codigoGrupo);
  const classe = String(codigoClasse);
  return LICITAGYM_CATMAT_CATALOGO.some((par) =>
    par.grupo === grupo && par.classe === classe
  );
}

export function defaultPcaClassificacoes(): string[] {
  const fromEnv = Deno.env.get("PNCP_PCA_CLASSIFICACOES")?.trim();
  if (fromEnv) {
    return fromEnv.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [LICITAGYM_CATMAT_CLASSE];
}

export function resolvePcaClassificacoes(body: {
  codigos_classificacao?: string[];
  codigo_classificacao_superior?: string;
}): string[] {
  const fromList = body.codigos_classificacao
    ?.map((c) => String(c).trim())
    .filter(Boolean);
  if (fromList?.length) return [...new Set(fromList)];

  const single = body.codigo_classificacao_superior?.trim();
  if (single) return [single];

  return defaultPcaClassificacoes();
}
