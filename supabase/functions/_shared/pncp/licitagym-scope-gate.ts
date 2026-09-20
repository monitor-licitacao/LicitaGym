import { jsonResponse } from "../http.ts";
import {
  defaultPcaClassificacoes,
  LICITAGYM_CATMAT_CLASSE,
  LICITAGYM_CATMAT_GRUPO,
} from "./licitagym-catmat.ts";

/** Escopo v1: CATMAT/PCA classe 7830 + link. Syncs nacionais exigem override explícito. */
export function isStrictLicitagymScope(): boolean {
  return Deno.env.get("LICITAGYM_SCOPE_GATE") !== "off";
}

export function isNationalPncpSyncEnabled(): boolean {
  return Deno.env.get("PNCP_NATIONAL_SYNC_ENABLED") === "true";
}

export function assertPcaClassificacoesInScope(codigos: string[]): string | null {
  if (!isStrictLicitagymScope()) return null;
  const allowed = new Set(defaultPcaClassificacoes());
  const out = codigos.filter((c) => !allowed.has(c));
  if (!out.length) return null;
  return `Classificacao PCA fora do escopo LicitaGym: ${out.join(", ")}`;
}

export function assertCatmatClasseInScope(codigoGrupo: number, codigoClasse: number): string | null {
  if (!isStrictLicitagymScope()) return null;
  const grupoOk = String(codigoGrupo) === LICITAGYM_CATMAT_GRUPO;
  const classeOk = String(codigoClasse) === LICITAGYM_CATMAT_CLASSE;
  if (grupoOk && classeOk) return null;
  return `CATMAT fora do escopo (${LICITAGYM_CATMAT_GRUPO}/${LICITAGYM_CATMAT_CLASSE}): ${codigoGrupo}/${codigoClasse}`;
}

export function nationalPncpSyncGate(resource: string) {
  return jsonResponse(
    {
      status: "blocked",
      reason:
        `Sync nacional "${resource}" fora do escopo LicitaGym (classe ${LICITAGYM_CATMAT_CLASSE})`,
      hint:
        "Pipeline escopo: sync-compras-catmat → sync-pncp-pca → link-catmat-pca. Override: PNCP_NATIONAL_SYNC_ENABLED=true",
      scope: {
        catmat_grupo: "78",
        catmat_classe: LICITAGYM_CATMAT_CLASSE,
        pca_classificacao: LICITAGYM_CATMAT_CLASSE,
      },
    },
    423,
  );
}
