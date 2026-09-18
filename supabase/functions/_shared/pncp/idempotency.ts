import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { hashPayload } from "./hash.ts";

export async function beginIdempotency(
  client: SupabaseClient,
  key: string,
  rota: string,
  parametros: Record<string, unknown>,
): Promise<{ skip: boolean; resposta?: unknown; id?: string }> {
  const parametrosHash = await hashPayload(parametros);
  const { data: existing } = await client.schema("private")
    .from("idempotency_key")
    .select("id, status, resposta")
    .eq("idempotency_key", key)
    .eq("rota", rota)
    .maybeSingle();

  if (existing?.status === "concluida") {
    return { skip: true, resposta: existing.resposta };
  }
  if (existing?.status === "executando") {
    return { skip: true, resposta: { status: "already_running", id: existing.id } };
  }

  const { data, error } = await client.schema("private")
    .from("idempotency_key")
    .insert({
      idempotency_key: key,
      rota,
      parametros_hash: parametrosHash,
      status: "executando",
    })
    .select("id")
    .single();
  if (error) throw error;
  return { skip: false, id: data.id as string };
}

export async function finishIdempotency(
  client: SupabaseClient,
  key: string,
  rota: string,
  resposta: unknown,
  httpStatus = 200,
  syncRunId?: string,
) {
  const { error } = await client.schema("private")
    .from("idempotency_key")
    .update({
      status: "concluida",
      resposta,
      http_status: httpStatus,
      sync_run_id: syncRunId ?? null,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    })
    .eq("idempotency_key", key)
    .eq("rota", rota);
  if (error) throw error;
}
