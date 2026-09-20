import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { hashPayload } from "../pncp/hash.ts";
import type { UpsertResult } from "../pncp/upsert.ts";

/** Upsert para tabelas com chave natural (sem coluna id uuid). */
export async function upsertByNaturalKey<T extends Record<string, unknown>>(
  client: SupabaseClient,
  table: string,
  naturalKey: Record<string, unknown>,
  row: T,
  options?: { syncRunId?: string; lastSeenSyncId?: string },
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

  let query = client.from(table).select("payload_hash").limit(1);
  for (const [k, v] of Object.entries(naturalKey)) {
    query = query.eq(k, v);
  }
  const { data: existing, error: readError } = await query.maybeSingle();
  if (readError) throw readError;

  if (!existing) {
    const { error } = await client.from(table).insert(fullRow);
    return error ? "erro" : "novo";
  }

  if (existing.payload_hash === payloadHash) {
    let touch = client.from(table).update({
      last_synced_at: now,
      ...(options?.lastSeenSyncId ? { last_seen_sync_id: options.lastSeenSyncId } : {}),
    });
    for (const [k, v] of Object.entries(naturalKey)) {
      touch = touch.eq(k, v);
    }
    await touch;
    return "inalterado";
  }

  let update = client.from(table).update(fullRow);
  for (const [k, v] of Object.entries(naturalKey)) {
    update = update.eq(k, v);
  }
  const { error } = await update;
  return error ? "erro" : "alterado";
}
