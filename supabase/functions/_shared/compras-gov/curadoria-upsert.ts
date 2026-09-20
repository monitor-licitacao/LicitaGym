import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { hashPayload } from "../pncp/hash.ts";
import type { UpsertResult } from "../pncp/upsert.ts";
import type { CuradoriaItemFlat } from "./curadoria-import.ts";

/** Overlay de curadoria manual — não sobrescreve descricao oficial do Compras.gov. */
export async function upsertCuradoriaOverlay(
  client: SupabaseClient,
  item: CuradoriaItemFlat,
  defaults: { grupo: string; classe: string },
): Promise<UpsertResult> {
  const codigoCatmat = item.codigo_catmat.trim();
  if (!codigoCatmat) return "erro";

  const now = new Date().toISOString();

  const { data: existing, error: readError } = await client
    .from("catalogo_itens")
    .select("id, payload_hash, descricao, codigo_pdm, taxonomias, categoria_licitagym, candidato_fitness")
    .eq("codigo_catmat", codigoCatmat)
    .maybeSingle();
  if (readError) throw readError;

  const mergedTaxonomias = {
    ...(typeof existing?.taxonomias === "object" && existing.taxonomias ? existing.taxonomias : {}),
    ...(item.taxonomias ?? {}),
  };

  const patch: Record<string, unknown> = {
    grupo_catmat: defaults.grupo,
    classe_catmat: defaults.classe,
    tipo: "material",
    fonte_curadoria: "manual",
    categoria_licitagym: item.categoria_licitagym ?? existing?.categoria_licitagym ?? null,
    candidato_fitness: item.candidato_fitness ?? true,
    taxonomias: mergedTaxonomias,
    updated_at: now,
  };

  if (item.codigo_pdm) patch.codigo_pdm = item.codigo_pdm;
  if (item.descricao) patch.descricao = item.descricao;

  if (!existing) {
    patch.codigo_catmat = codigoCatmat;
    patch.descricao = item.descricao ?? codigoCatmat;
    patch.ativo = true;
    patch.payload_hash = await hashPayload(patch);
    patch.created_at = now;
    const { error } = await client.from("catalogo_itens").insert(patch);
    return error ? "erro" : "novo";
  }

  const descricaoFinal = item.descricao ?? existing.descricao;
  const codigoPdmFinal = item.codigo_pdm ?? existing.codigo_pdm;
  const rowForHash = {
    codigo_catmat: codigoCatmat,
    descricao: descricaoFinal,
    codigo_pdm: codigoPdmFinal,
    grupo_catmat: defaults.grupo,
    classe_catmat: defaults.classe,
    tipo: "material",
    fonte_curadoria: "manual",
    categoria_licitagym: patch.categoria_licitagym,
    candidato_fitness: patch.candidato_fitness,
    taxonomias: mergedTaxonomias,
    ativo: true,
  };
  patch.payload_hash = await hashPayload(rowForHash);

  if (existing.payload_hash === patch.payload_hash) {
    return "inalterado";
  }

  const { error } = await client.from("catalogo_itens").update(patch).eq("id", existing.id);
  return error ? "erro" : "alterado";
}
