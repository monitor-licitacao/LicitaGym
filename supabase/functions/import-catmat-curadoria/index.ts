import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  expandCuradoriaPayload,
  type CuradoriaItemFlat,
} from "../_shared/compras-gov/curadoria-import.ts";
import { upsertCuradoriaOverlay } from "../_shared/compras-gov/curadoria-upsert.ts";
import { corsHeaders, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import {
  LICITAGYM_CATMAT_CLASSE,
  LICITAGYM_CATMAT_GRUPO,
} from "../_shared/pncp/licitagym-catmat.ts";
import { createServiceClient } from "../_shared/pncp/supabase-admin.ts";

type ImportBody = {
  grupo_catmat?: string;
  classe_catmat?: string;
  itens?: CuradoriaItemFlat[];
  items?: CuradoriaItemFlat[];
  curadoriaInicialPorCodigoPdm?: Record<string, unknown>;
  excecoesPorCodigoItem?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as ImportBody;
  const itens = expandCuradoriaPayload(body);
  if (!itens.length) {
    return jsonResponse({
      error: "Nenhum item — envie itens[] ou curadoriaInicialPorCodigoPdm (export licitagym-curadoria-catmat.json)",
    }, 400);
  }

  const defaults = {
    grupo: body.grupo_catmat ?? LICITAGYM_CATMAT_GRUPO,
    classe: body.classe_catmat ?? LICITAGYM_CATMAT_CLASSE,
  };

  const client = createServiceClient();
  const stats = { novos: 0, alterados: 0, inalterados: 0, erros: 0, ignorados: 0 };

  for (const item of itens) {
    if (!item.codigo_catmat?.trim()) {
      stats.ignorados++;
      continue;
    }

    const result = await upsertCuradoriaOverlay(client, item, defaults);
    if (result === "novo") stats.novos++;
    else if (result === "alterado") stats.alterados++;
    else if (result === "inalterado") stats.inalterados++;
    else if (result === "erro") stats.erros++;
  }

  return jsonResponse({
    status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
    grupo_catmat: defaults.grupo,
    classe_catmat: defaults.classe,
    total_enviados: itens.length,
    ...stats,
  });
});
