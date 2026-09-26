/**
 * Reprojeção administrativa Stream A: preenche classificacao_catalogo_id
 * a partir de private.source_record sem gravar pca_alteracoes.
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { hashPayload } from "./hash.ts";
import {
  normalizePcaItem,
  normalizePcaItemLegacy,
} from "./normalize.ts";
import { acquireSyncLock } from "./lock.ts";
import { finishSyncRun } from "./supabase-admin.ts";

export const DEFAULT_PCA_REPROJECTION_LOCK_KEY = "pca-sync:2026:7830";

export type SourceItemOccurrence = {
  idPcaPncp: string;
  numeroItem: number;
  plan: Record<string, unknown>;
  item: Record<string, unknown>;
  fetchedAt: string;
  sourceRecordId: string;
};

export type PcaItemTarget = {
  id: string;
  pca_plano_id: string;
  numero_item: number;
  id_pca_pncp: string;
  payload_hash: string;
  classificacao_catalogo_id: string | null;
};

export type ReprojDecision =
  | { kind: "atualizar"; classificacaoCatalogoId: string | null; hashNovo: string }
  | { kind: "ja_atualizado" }
  | { kind: "STALE_SOURCE_MISMATCH"; hashAntigo: string; hashNovo: string }
  | { kind: "sem_fonte" };

export type ReprojReport = {
  alvo: number;
  atualizados: number;
  ja_atualizado: number;
  STALE_SOURCE_MISMATCH: number;
  sem_fonte: number;
  fonte_sem_projecao: number;
  valor_1: number;
  valor_2: number;
  outros: number;
  erros: Array<{ id?: string; motivo: string }>;
  stale_ids: string[];
  duracao_s: number;
  dry_run: boolean;
  snapshot_id: string | null;
  sync_run_id: string | null;
};

export type ReprojOptions = {
  dryRun: boolean;
  limite?: number;
  lockKey?: string;
  snapshotId?: string;
  takeSnapshot?: boolean;
  /** Injectables for tests */
  nowIso?: () => string;
};

function extractPlans(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((x): x is Record<string, unknown> =>
      !!x && typeof x === "object"
    );
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "content", "itens", "resultado"]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).filter((x): x is Record<string, unknown> =>
          !!x && typeof x === "object"
        );
      }
    }
  }
  return [];
}

/** Latest occurrence per (idPcaPncp, numeroItem) by fetched_at. */
export function selectLatestSourceItems(
  records: Array<{
    id: string;
    fetched_at: string;
    payload: unknown;
  }>,
): Map<string, SourceItemOccurrence> {
  const latest = new Map<string, SourceItemOccurrence>();
  for (const rec of records) {
    const plans = extractPlans(rec.payload);
    for (const plan of plans) {
      const idPcaPncp = String(plan.idPcaPncp ?? plan.id_pca_pncp ?? "").trim();
      if (!idPcaPncp) continue;
      const itens = Array.isArray(plan.itens) ? plan.itens : [];
      for (const rawItem of itens) {
        if (!rawItem || typeof rawItem !== "object") continue;
        const item = rawItem as Record<string, unknown>;
        const numeroItem = Number(item.numeroItem ?? item.numero_item ?? 0);
        if (!numeroItem) continue;
        const key = `${idPcaPncp}|${numeroItem}`;
        const prev = latest.get(key);
        if (!prev || String(rec.fetched_at) > prev.fetchedAt) {
          latest.set(key, {
            idPcaPncp,
            numeroItem,
            plan,
            item,
            fetchedAt: String(rec.fetched_at),
            sourceRecordId: rec.id,
          });
        }
      }
    }
  }
  return latest;
}

export async function decideReprojection(
  target: PcaItemTarget,
  source: SourceItemOccurrence | undefined,
): Promise<ReprojDecision> {
  if (!source) return { kind: "sem_fonte" };

  const legacyRow = {
    ...normalizePcaItemLegacy(source.item, source.plan),
    pca_plano_id: target.pca_plano_id,
  };
  const newRow = {
    ...normalizePcaItem(source.item, source.plan),
    pca_plano_id: target.pca_plano_id,
  };
  const hashAntigo = await hashPayload(legacyRow);
  const hashNovo = await hashPayload(newRow);

  if (target.payload_hash === hashNovo) {
    return { kind: "ja_atualizado" };
  }
  if (target.payload_hash !== hashAntigo) {
    return {
      kind: "STALE_SOURCE_MISMATCH",
      hashAntigo,
      hashNovo,
    };
  }
  return {
    kind: "atualizar",
    classificacaoCatalogoId: newRow.classificacao_catalogo_id,
    hashNovo,
  };
}

function emptyReport(dryRun: boolean): ReprojReport {
  return {
    alvo: 0,
    atualizados: 0,
    ja_atualizado: 0,
    STALE_SOURCE_MISMATCH: 0,
    sem_fonte: 0,
    fonte_sem_projecao: 0,
    valor_1: 0,
    valor_2: 0,
    outros: 0,
    erros: [],
    stale_ids: [],
    duracao_s: 0,
    dry_run: dryRun,
    snapshot_id: null,
    sync_run_id: null,
  };
}

function countClassificacao(
  report: ReprojReport,
  value: string | null,
) {
  if (value === "1") report.valor_1 += 1;
  else if (value === "2") report.valor_2 += 1;
  else report.outros += 1;
}

export async function takePcaItensSnapshot(
  client: SupabaseClient,
  snapshotId: string,
): Promise<number> {
  const { data, error } = await client
    .from("pca_itens")
    .select("id, classificacao_catalogo_id, payload_hash, updated_at");
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({
    snapshot_id: snapshotId,
    pca_item_id: r.id,
    classificacao_catalogo_id: r.classificacao_catalogo_id,
    payload_hash: r.payload_hash,
    updated_at: r.updated_at,
  }));
  if (rows.length === 0) return 0;

  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error: insErr } = await client
      .schema("private")
      .from("pca_itens_snapshot_p0")
      .upsert(slice, { onConflict: "snapshot_id,pca_item_id" });
    if (insErr) throw insErr;
  }
  return rows.length;
}

export async function restorePcaItensSnapshot(
  client: SupabaseClient,
  snapshotId: string,
): Promise<number> {
  const { data, error } = await client
    .schema("private")
    .from("pca_itens_snapshot_p0")
    .select("pca_item_id, classificacao_catalogo_id, payload_hash")
    .eq("snapshot_id", snapshotId);
  if (error) throw error;
  let restored = 0;
  for (const row of data ?? []) {
    const { error: upErr } = await client
      .from("pca_itens")
      .update({
        classificacao_catalogo_id: row.classificacao_catalogo_id,
        payload_hash: row.payload_hash,
      })
      .eq("id", row.pca_item_id);
    if (upErr) throw upErr;
    restored += 1;
  }
  return restored;
}

type Writer = {
  updateItem: (
    id: string,
    patch: { classificacao_catalogo_id: string | null; payload_hash: string },
  ) => Promise<{ error: { message: string } | null }>;
};

export async function runPcaReprojecaoClassificacao(
  client: SupabaseClient,
  options: ReprojOptions,
  deps?: { writer?: Writer },
): Promise<ReprojReport> {
  const started = Date.now();
  const report = emptyReport(options.dryRun);
  const lockKey = options.lockKey ?? DEFAULT_PCA_REPROJECTION_LOCK_KEY;
  const snapshotId = options.snapshotId ??
    `pca-pre-p0-${(options.nowIso?.() ?? new Date().toISOString()).replace(/[:.]/g, "-")}`;

  const { runId, alreadyRunning } = await acquireSyncLock(
    client,
    lockKey,
    "pca",
    {
      modo: "reprocessamento",
      job: "pca-reprojecao-classificacao",
      dry_run: options.dryRun,
      limite: options.limite ?? null,
      snapshot_id: snapshotId,
    },
  );
  if (alreadyRunning) {
    throw new Error(
      `Lock ocupado: sync PCA já em execução (run_id=${runId}, lock_key=${lockKey})`,
    );
  }
  report.sync_run_id = runId;

  // modo default na tabela é incremental — forçar reprocessamento
  await client.schema("private").from("pncp_sync_run").update({
    modo: "reprocessamento",
  }).eq("id", runId);

  try {
    if (options.takeSnapshot !== false && !options.dryRun) {
      await takePcaItensSnapshot(client, snapshotId);
      report.snapshot_id = snapshotId;
    } else if (options.takeSnapshot !== false && options.dryRun) {
      report.snapshot_id = snapshotId; // dry-run: id reservado, sem gravar
    }

    const { data: sourceRows, error: sourceError } = await client
      .schema("private")
      .from("source_record")
      .select("id, fetched_at, payload")
      .eq("resource_type", "pca")
      .order("fetched_at", { ascending: false });
    if (sourceError) {
      report.erros.push({ motivo: `fonte: ${sourceError.message}` });
      await finishSyncRun(client, runId, {
        status: "concluida_com_erros",
        totalErros: report.erros.length,
        erroPrincipal: sourceError.message,
        parametros: { report },
      });
      report.duracao_s = (Date.now() - started) / 1000;
      return report;
    }

    const latestSource = selectLatestSourceItems(sourceRows ?? []);

    const { data: itens, error: itensError } = await client
      .from("pca_itens")
      .select(
        "id, pca_plano_id, numero_item, payload_hash, classificacao_catalogo_id, pca_planos!inner(id_pca_pncp)",
      );
    if (itensError) {
      report.erros.push({ motivo: `pca_itens: ${itensError.message}` });
      await finishSyncRun(client, runId, {
        status: "concluida_com_erros",
        totalErros: report.erros.length,
        erroPrincipal: itensError.message,
        parametros: { report },
      });
      report.duracao_s = (Date.now() - started) / 1000;
      return report;
    }

    const targets: PcaItemTarget[] = (itens ?? []).map((r) => {
      const plano = r.pca_planos as unknown as { id_pca_pncp: string };
      return {
        id: String(r.id),
        pca_plano_id: String(r.pca_plano_id),
        numero_item: Number(r.numero_item),
        id_pca_pncp: String(plano.id_pca_pncp),
        payload_hash: String(r.payload_hash),
        classificacao_catalogo_id: r.classificacao_catalogo_id as string | null,
      };
    });

    const projectedKeys = new Set(
      targets.map((t) => `${t.id_pca_pncp}|${t.numero_item}`),
    );
    for (const key of latestSource.keys()) {
      if (!projectedKeys.has(key)) report.fonte_sem_projecao += 1;
    }

    let work = targets;
    if (options.limite != null && options.limite >= 0) {
      work = targets.slice(0, options.limite);
    }
    report.alvo = work.length;

    const writer: Writer = deps?.writer ?? {
      updateItem: async (id, patch) => {
        const { error } = await client
          .from("pca_itens")
          .update(patch)
          .eq("id", id);
        return { error };
      },
    };

    for (const target of work) {
      const key = `${target.id_pca_pncp}|${target.numero_item}`;
      const source = latestSource.get(key);
      try {
        const decision = await decideReprojection(target, source);
        switch (decision.kind) {
          case "ja_atualizado":
            report.ja_atualizado += 1;
            break;
          case "sem_fonte":
            report.sem_fonte += 1;
            break;
          case "STALE_SOURCE_MISMATCH":
            report.STALE_SOURCE_MISMATCH += 1;
            report.stale_ids.push(target.id);
            break;
          case "atualizar": {
            countClassificacao(report, decision.classificacaoCatalogoId);
            if (!options.dryRun) {
              const { error: upErr } = await writer.updateItem(target.id, {
                classificacao_catalogo_id: decision.classificacaoCatalogoId,
                payload_hash: decision.hashNovo,
              });
              if (upErr) {
                report.erros.push({ id: target.id, motivo: upErr.message });
                break;
              }
            }
            report.atualizados += 1;
            break;
          }
          default: {
            const _never: never = decision;
            void _never;
          }
        }
      } catch (e) {
        report.erros.push({
          id: target.id,
          motivo: e instanceof Error ? e.message : String(e),
        });
      }
    }

    report.duracao_s = (Date.now() - started) / 1000;
    const status = report.erros.length > 0
      ? "concluida_com_erros"
      : "concluida";
    await finishSyncRun(client, runId, {
      status,
      totalRecebidos: report.alvo,
      totalAtualizados: options.dryRun ? 0 : report.atualizados,
      totalInalterados: report.ja_atualizado,
      totalErros: report.erros.length + report.STALE_SOURCE_MISMATCH,
      erroPrincipal: report.erros[0]?.motivo,
      parametros: {
        modo: "reprocessamento",
        dry_run: options.dryRun,
        snapshot_id: report.snapshot_id,
        report,
      },
    });
    return report;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    report.erros.push({ motivo: msg });
    report.duracao_s = (Date.now() - started) / 1000;
    await finishSyncRun(client, runId, {
      status: "falhou",
      totalErros: report.erros.length,
      erroPrincipal: msg,
      parametros: { report },
    });
    throw e;
  }
}
