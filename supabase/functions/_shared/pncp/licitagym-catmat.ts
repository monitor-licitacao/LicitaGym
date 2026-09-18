/** Recorte CATMAT LicitaGym — grupo 78 / classe 7830 (ginástica e recreação). */
export const LICITAGYM_CATMAT_GRUPO = "78";
export const LICITAGYM_CATMAT_CLASSE = "7830";

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
