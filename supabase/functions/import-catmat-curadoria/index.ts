import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import {
  LICITAGYM_CATMAT_CLASSE,
  LICITAGYM_CATMAT_GRUPO,
} from "../_shared/pncp/licitagym-catmat.ts";
import { createServiceClient } from "../_shared/pncp/supabase-admin.ts";
import { upsertByHash } from "../_shared/pncp/upsert.ts";

type CuradoriaItem = {
  codigo_catmat?: string;
  codigo?: string;
  codigo_pdm?: string;
  descricao?: string;
  categoria_licitagym?: string | null;
  category?: string | null;
  candidato_fitness?: boolean;
  candidate?: boolean;
  taxonomias?: Record<string, string>;
};

type ImportBody = {
  grupo_catmat?: string;
  classe_catmat?: string;
  fonte?: string;
  itens?: CuradoriaItem[];
  /** Alias do export do app HTML (array na raiz). */
  items?: CuradoriaItem[];
};

const CATEGORIAS = new Set(["musculacao", "cardio", "acessorios"]);

function normalizeCategoria(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return CATEGORIAS.has(normalized) ? normalized : null;
}

function normalizeItem(
  raw: CuradoriaItem,
  defaults: { grupo: string; classe: string; fonte: string },
) {
  const codigoCatmat = String(raw.codigo_catmat ?? raw.codigo ?? "").trim();
  if (!codigoCatmat) return null;

  const descricao = String(raw.descricao ?? codigoCatmat).trim();
  return {
    codigo_catmat: codigoCatmat,
    codigo_pdm: raw.codigo_pdm?.trim() || null,
    descricao,
    tipo: "material" as const,
    grupo_catmat: defaults.grupo,
    classe_catmat: defaults.classe,
    categoria_licitagym: normalizeCategoria(raw.categoria_licitagym ?? raw.category),
    candidato_fitness: Boolean(raw.candidato_fitness ?? raw.candidate ?? false),
    taxonomias: raw.taxonomias ?? {},
    fonte_curadoria: defaults.fonte,
    ativo: true,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as ImportBody;
  const itens = body.itens ?? body.items ?? [];
  if (!itens.length) {
    return jsonResponse({ error: "itens[] vazio — envie o JSON exportado do catálogo" }, 400);
  }

  const defaults = {
    grupo: body.grupo_catmat ?? LICITAGYM_CATMAT_GRUPO,
    classe: body.classe_catmat ?? LICITAGYM_CATMAT_CLASSE,
    fonte: body.fonte ?? "compras.gov.br",
  };

  const client = createServiceClient();
  const stats = { novos: 0, alterados: 0, inalterados: 0, erros: 0, ignorados: 0 };

  for (const raw of itens) {
    const row = normalizeItem(raw, defaults);
    if (!row) {
      stats.ignorados++;
      continue;
    }

    const result = await upsertByHash(
      client,
      "catalogo_itens",
      { codigo_catmat: row.codigo_catmat },
      row,
    );
    if (result === "novo") stats.novos++;
    else if (result === "alterado") stats.alterados++;
    else if (result === "inalterado") stats.inalterados++;
    else stats.erros++;
  }

  return jsonResponse({
    status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
    grupo_catmat: defaults.grupo,
    classe_catmat: defaults.classe,
    total_enviados: itens.length,
    ...stats,
  });
});
