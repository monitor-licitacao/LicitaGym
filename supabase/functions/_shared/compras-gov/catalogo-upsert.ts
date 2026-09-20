import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { hashPayload } from "../pncp/hash.ts";
import type { UpsertResult } from "../pncp/upsert.ts";

/** Upsert catalogo_itens preservando curadoria manual LicitaGym. */
export async function upsertCatalogoItemFromCompras(
  client: SupabaseClient,
  row: Record<string, unknown>,
  options?: { syncRunId?: string },
): Promise<UpsertResult> {
  const codigoCatmat = String(row.codigo_catmat ?? "");
  if (!codigoCatmat) return "erro";

  const now = new Date().toISOString();

  const { data: existing, error: readError } = await client
    .from("catalogo_itens")
    .select("id, payload_hash, fonte_curadoria, categoria_licitagym, candidato_fitness, taxonomias")
    .eq("codigo_catmat", codigoCatmat)
    .maybeSingle();
  if (readError) throw readError;

  const preserveManual = existing?.fonte_curadoria === "manual";
  const mergedRow: Record<string, unknown> = {
    ...row,
    ...(preserveManual
      ? {
        categoria_licitagym: existing.categoria_licitagym,
        candidato_fitness: existing.candidato_fitness,
        fonte_curadoria: existing.fonte_curadoria,
        taxonomias: {
          ...(typeof row.taxonomias === "object" && row.taxonomias ? row.taxonomias : {}),
          ...(typeof existing.taxonomias === "object" && existing.taxonomias
            ? existing.taxonomias
            : {}),
        },
      }
      : {}),
    updated_at: now,
    last_synced_at: now,
  };

  const hashSource = { ...mergedRow };
  delete hashSource.updated_at;
  delete hashSource.last_synced_at;
  delete hashSource.payload_hash;
  const payloadHash = await hashPayload(hashSource);
  mergedRow.payload_hash = payloadHash;

  if (!existing) {
    const { error } = await client.from("catalogo_itens").insert(mergedRow);
    return error ? "erro" : "novo";
  }

  if (existing.payload_hash === payloadHash) {
    await client.from("catalogo_itens").update({
      last_synced_at: now,
    }).eq("id", existing.id);
    return "inalterado";
  }

  const { error } = await client.from("catalogo_itens").update(mergedRow).eq("id", existing.id);
  return error ? "erro" : "alterado";
}
