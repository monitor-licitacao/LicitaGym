import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { PcaSearchPeriodSummary } from "./search-client.ts";

export type PeriodAnchorRow = {
  id: string;
  resource_type: string;
  scope_key: string;
  ano_exercicio: number;
  ultima_data_publicacao: string | null;
  ultima_data_atualizacao: string | null;
  total_indexado: number | null;
  ultima_verificacao: string;
  ultima_carga_completa: string | null;
  metadata: Record<string, unknown>;
};

const RESOURCE = "pca_search";
const SCOPE = "pcaorgao";

export async function getPeriodAnchor(
  client: SupabaseClient,
  ano: number,
): Promise<PeriodAnchorRow | null> {
  const { data, error } = await client.schema("private")
    .from("pncp_period_anchor")
    .select("*")
    .eq("resource_type", RESOURCE)
    .eq("scope_key", SCOPE)
    .eq("ano_exercicio", ano)
    .maybeSingle();
  if (error) throw error;
  return data as PeriodAnchorRow | null;
}

export function shouldSkipAnnualLoad(
  anchor: PeriodAnchorRow | null,
  summary: PcaSearchPeriodSummary,
): { skip: boolean; reason: string | null } {
  if (!anchor?.ultima_carga_completa || !anchor.ultima_data_atualizacao) {
    return { skip: false, reason: null };
  }
  if (!summary.max_data_atualizacao) {
    return { skip: false, reason: "indice_sem_data_atualizacao" };
  }

  const anchorTs = Date.parse(anchor.ultima_data_atualizacao);
  const indexTs = Date.parse(summary.max_data_atualizacao);
  if (!Number.isFinite(anchorTs) || !Number.isFinite(indexTs)) {
    return { skip: false, reason: "datas_invalidas" };
  }

  if (indexTs <= anchorTs) {
    return {
      skip: true,
      reason: "periodo_inalterado_desde_ultima_carga",
    };
  }

  return { skip: false, reason: null };
}

export async function upsertPeriodProbe(
  client: SupabaseClient,
  summary: PcaSearchPeriodSummary,
  extraMetadata: Record<string, unknown> = {},
) {
  const now = new Date().toISOString();
  const { error } = await client.schema("private").from("pncp_period_anchor").upsert(
    {
      resource_type: RESOURCE,
      scope_key: SCOPE,
      ano_exercicio: summary.ano,
      ultima_data_publicacao: summary.max_data_publicacao,
      ultima_data_atualizacao: summary.max_data_atualizacao,
      total_indexado: summary.total_indexado,
      ultima_verificacao: now,
      metadata: {
        min_data_publicacao: summary.min_data_publicacao,
        amostra: summary.amostra,
        ...extraMetadata,
      },
      updated_at: now,
    },
    { onConflict: "resource_type,scope_key,ano_exercicio" },
  );
  if (error) throw error;
}

export async function markPeriodLoadComplete(
  client: SupabaseClient,
  summary: PcaSearchPeriodSummary,
) {
  const now = new Date().toISOString();
  const { error } = await client.schema("private").from("pncp_period_anchor").upsert(
    {
      resource_type: RESOURCE,
      scope_key: SCOPE,
      ano_exercicio: summary.ano,
      ultima_data_publicacao: summary.max_data_publicacao,
      ultima_data_atualizacao: summary.max_data_atualizacao,
      total_indexado: summary.total_indexado,
      ultima_verificacao: now,
      ultima_carga_completa: now,
      metadata: {
        min_data_publicacao: summary.min_data_publicacao,
        amostra: summary.amostra,
      },
      updated_at: now,
    },
    { onConflict: "resource_type,scope_key,ano_exercicio" },
  );
  if (error) throw error;
}
