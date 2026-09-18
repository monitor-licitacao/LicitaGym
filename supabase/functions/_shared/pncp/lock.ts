import { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Edge timeout / cliente cancelado — libera lock preso em `executando`. */
const STALE_LOCK_MS = 3 * 60 * 1000;

export async function acquireSyncLock(
  client: SupabaseClient,
  lockKey: string,
  resourceType: string,
  parametros: Record<string, unknown> = {},
): Promise<{ runId: string; alreadyRunning: boolean }> {
  const { data: existing } = await client.schema("private")
    .from("pncp_sync_run")
    .select("id, iniciada_em")
    .eq("lock_key", lockKey)
    .eq("status", "executando")
    .maybeSingle();

  if (existing?.id) {
    const started = Date.parse(String(existing.iniciada_em ?? ""));
    const ageMs = Number.isFinite(started) ? Date.now() - started : STALE_LOCK_MS + 1;
    if (ageMs < STALE_LOCK_MS) {
      return { runId: existing.id as string, alreadyRunning: true };
    }
    await client.schema("private").from("pncp_sync_run").update({
      status: "falhou",
      erro_principal: "lock expirado (executando stale)",
      finalizada_em: new Date().toISOString(),
    }).eq("id", existing.id);
  }

  const { data, error } = await client.schema("private")
    .from("pncp_sync_run")
    .insert({
      resource_type: resourceType,
      lock_key: lockKey,
      parametros,
      status: "executando",
    })
    .select("id")
    .single();

  if (error) throw error;
  return { runId: data.id as string, alreadyRunning: false };
}

export async function resolveIdempotency(
  client: SupabaseClient,
  key: string,
  rota: string,
  parametrosHash: string,
): Promise<{ hit: boolean; syncRunId?: string; resposta?: unknown }> {
  const { data } = await client.schema("private")
    .from("idempotency_key")
    .select("sync_run_id, status, resposta")
    .eq("idempotency_key", key)
    .eq("rota", rota)
    .maybeSingle();

  if (!data) return { hit: false };
  if (data.status === "concluida") {
    return { hit: true, resposta: data.resposta };
  }
  if (data.status === "executando" && data.sync_run_id) {
    return { hit: true, syncRunId: data.sync_run_id as string };
  }
  return { hit: false };
}
