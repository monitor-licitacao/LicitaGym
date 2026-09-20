import { SupabaseClient } from "npm:@supabase/supabase-js@2";

type PcaItemOrigem = {
  pdm_codigo_origem?: string | null;
  codigo_item_origem?: string | null;
};

/** Vincula PDM/catálogo quando o PNCP informa pdmCodigo / codigoItem no item PCA. */
export async function linkPcaItemOrigemCodes(
  client: SupabaseClient,
  pcaItemId: string,
  itemRow: PcaItemOrigem,
): Promise<{ pdm: boolean; catalogo: boolean }> {
  const result = { pdm: false, catalogo: false };

  const pdmRaw = itemRow.pdm_codigo_origem?.trim();
  if (pdmRaw && /^\d+$/.test(pdmRaw)) {
    const codigoPdm = Number(pdmRaw);
    const { data: pdmRow } = await client
      .from("catmat_pdms")
      .select("codigo_pdm")
      .eq("codigo_pdm", codigoPdm)
      .maybeSingle();
    if (pdmRow) {
      const { error } = await client.from("pca_item_pdm").upsert({
        pca_item_id: pcaItemId,
        codigo_pdm: codigoPdm,
        tipo_correspondencia: "exata",
        evidencia: "pncp:pdmCodigo",
        confirmado: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "pca_item_id,codigo_pdm" });
      if (!error) result.pdm = true;
    }
  }

  const codigoItem = itemRow.codigo_item_origem?.trim();
  if (codigoItem) {
    const { data: catItem } = await client
      .from("catalogo_itens")
      .select("id")
      .eq("codigo_catmat", codigoItem)
      .maybeSingle();
    if (catItem) {
      const { error } = await client.from("catalogo_ponte").upsert({
        catalogo_item_id: catItem.id,
        entidade_tipo: "pca_item",
        entidade_id: pcaItemId,
        tipo_correspondencia: "exata",
        evidencia: "pncp:codigoItem",
      }, { onConflict: "catalogo_item_id,entidade_tipo,entidade_id" });
      if (!error) result.catalogo = true;
    }
  }

  return result;
}
