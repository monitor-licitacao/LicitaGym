import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { hashPayload } from "./hash.ts";

export type UpsertResult = "novo" | "alterado" | "inalterado" | "erro";

export async function upsertByHash<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  uniqueKey: Record<string, unknown>,
  row: T,
  options?: {
    historyTable?: string;
    historyFields?: Record<string, unknown>;
    syncRunId?: string;
    lastSeenSyncId?: string;
  },
): Promise<UpsertResult> {
  const now = new Date().toISOString();
  const payloadHash = await hashPayload(row);
  const fullRow = {
    ...row,
    payload_hash: payloadHash,
    updated_at: now,
    last_synced_at: now,
    ...(options?.lastSeenSyncId ? { last_seen_sync_id: options.lastSeenSyncId } : {}),
  };

  let query = client.from(table).select("id, payload_hash").limit(1);
  for (const [k, v] of Object.entries(uniqueKey)) {
    query = query.eq(k, v);
  }
  const { data: existing, error: readError } = await query.maybeSingle();
  if (readError) throw readError;

  if (!existing) {
    const { data: inserted, error } = await client.from(table).insert(fullRow)
      .select("id").single();
    if (error) return "erro";
    if (options?.historyTable) {
      await client.from(options.historyTable).insert({
        ...options.historyFields,
        tipo_operacao: "insert",
        dados_novos: fullRow,
        payload_hash_novo: payloadHash,
        sync_run_id: options.syncRunId,
      });
    }
    void inserted;
    return "novo";
  }

  if (existing.payload_hash === payloadHash) {
    await client.from(table).update({
      last_synced_at: now,
      ...(options?.lastSeenSyncId ? { last_seen_sync_id: options.lastSeenSyncId } : {}),
    }).eq("id", existing.id);
    return "inalterado";
  }

  const { error } = await client.from(table).update(fullRow).eq("id", existing.id);
  if (error) return "erro";

  if (options?.historyTable) {
    await client.from(options.historyTable).insert({
      ...options.historyFields,
      tipo_operacao: "update",
      payload_hash_anterior: existing.payload_hash,
      payload_hash_novo: payloadHash,
      sync_run_id: options.syncRunId,
    });
  }
  return "alterado";
}

export async function inactivateNotSeen(
  client: SupabaseClient,
  table: string,
  syncRunId: string,
  filters: Record<string, unknown> = {},
) {
  let query = client.from(table).update({ ativo: false }).neq("last_seen_sync_id", syncRunId);
  for (const [k, v] of Object.entries(filters)) {
    query = query.eq(k, v);
  }
  const { error } = await query;
  if (error) throw error;
}
