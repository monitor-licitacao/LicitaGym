import {
  isPolicyPair,
  TRANSITIONAL_FITNESS_SCOPE,
} from "./catmat-scope-resolver.ts";

const core = TRANSITIONAL_FITNESS_SCOPE.find((rule) => rule.priority === "CORE");
if (!core) {
  throw new Error("Escopo transitório sem classe CORE");
}

/** Par CORE da política transitória. Não é uma segunda lista de escopo. */
export const LICITAGYM_CATMAT_GRUPO = core.grupo;
export const LICITAGYM_CATMAT_CLASSE = core.classe;

/** Derivado da política transitória. Não editar como lista independente. */
export const LICITAGYM_CATMAT_CATALOGO: ReadonlyArray<{
  grupo: string;
  classe: string;
}> = TRANSITIONAL_FITNESS_SCOPE.map((rule) => ({
  grupo: rule.grupo,
  classe: rule.classe,
}));

export function isCatalogoCatmatClasseAllowed(
  codigoGrupo: number,
  codigoClasse: number,
): boolean {
  return isPolicyPair(codigoGrupo, codigoClasse);
}

/** Classes CORE do PCA por padrão (7830). 7220 fica no catálogo, não no seed PCA.
 * `PNCP_PCA_CLASSIFICACOES` (CSV) sobrescreve explicitamente quando setado.
 */
export function defaultPcaClassificacoes(): string[] {
  const fromEnv = Deno.env.get("PNCP_PCA_CLASSIFICACOES")?.trim();
  if (fromEnv) {
    return [
      ...new Set(
        fromEnv.split(",").map((part) => part.trim()).filter(Boolean),
      ),
    ];
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
