import { jsonResponse } from "../http.ts";
import { effectiveClassCodes, effectiveClasses } from "./catmat-scope-resolver.ts";
import {
  defaultPcaClassificacoes,
  isCatalogoCatmatClasseAllowed,
} from "./licitagym-catmat.ts";

/** Escopo transitório: classes da política única. Syncs nacionais exigem override explícito. */
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
  if (isCatalogoCatmatClasseAllowed(codigoGrupo, codigoClasse)) return null;
  const pares = effectiveClasses().map((rule) => `${rule.grupo}/${rule.classe}`).join(", ");
  return `CATMAT fora do escopo LicitaGym (${pares}): ${codigoGrupo}/${codigoClasse}`;
}

export function nationalPncpSyncGate(resource: string) {
  return jsonResponse(
    {
      status: "blocked",
      reason:
        `Sync nacional "${resource}" fora do escopo LicitaGym (classes ${effectiveClassCodes().join(", ")})`,
      hint:
        "Pipeline escopo: sync-compras-catmat → sync-pncp-pca → link-catmat-pca. Override: PNCP_NATIONAL_SYNC_ENABLED=true",
      scope: {
        catmat_classes: effectiveClasses().map((rule) => ({
          grupo: rule.grupo,
          classe: rule.classe,
          priority: rule.priority,
        })),
        pca_classificacoes: effectiveClassCodes(),
      },
    },
    423,
  );
}
