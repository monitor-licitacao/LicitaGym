import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import { PncpIntegracaoClient } from "../_shared/pncp/integracao-client.ts";
import { acquireSyncLock } from "../_shared/pncp/lock.ts";
import { hashPayload } from "../_shared/pncp/hash.ts";
import {
  createServiceClient,
  finishSyncRun,
  logSyncRequest,
} from "../_shared/pncp/supabase-admin.ts";
import { upsertByHash } from "../_shared/pncp/upsert.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const client = createServiceClient();
  const integracao = new PncpIntegracaoClient();
  const lockKey = "catalogo-sync";
  const { runId, alreadyRunning } = await acquireSyncLock(client, lockKey, "catalogo", {});

  if (alreadyRunning) {
    return jsonResponse({ status: "already_running", sync_id: runId });
  }

  const stats = { categorias: 0, itens: 0, erros: 0 };

  try {
    const started = Date.now();
    let categorias: unknown[] = [];
    try {
      const raw = await integracao.getCategoriaItemPcas();
      categorias = Array.isArray(raw) ? raw : [];
    } catch (error) {
      await logSyncRequest(client, {
        syncRunId: runId,
        endpoint: "/categoriaItemPcas",
        parametros: {},
        erro: error instanceof Error ? error.message : String(error),
      });
    }

    for (const raw of categorias) {
      const item = raw as Record<string, unknown>;
      const codigo = Number(item.codigo ?? item.id ?? 0);
      if (!codigo) continue;
      stats.categorias++;
      const row = {
        codigo_pncp: codigo,
        descricao: String(item.descricao ?? item.nome ?? codigo),
        payload_hash: await hashPayload(item),
      };
      const { error } = await client.from("categoria_item_pca").upsert(row, {
        onConflict: "codigo_pncp",
      });
      if (error) stats.erros++;
    }

    let catalogos: unknown[] = [];
    try {
      const raw = await integracao.getCatalogos();
      catalogos = Array.isArray(raw) ? raw : [];
    } catch (error) {
      await logSyncRequest(client, {
        syncRunId: runId,
        endpoint: "/catalogos",
        parametros: {},
        tempoRespostaMs: Date.now() - started,
        erro: error instanceof Error ? error.message : String(error),
      });
    }

    for (const raw of catalogos) {
      const item = raw as Record<string, unknown>;
      const codigo = item.codigo ? String(item.codigo) : null;
      if (!codigo) continue;
      stats.itens++;
      const row = {
        codigo_pncp: codigo,
        codigo_catmat: item.codigoCatmat ? String(item.codigoCatmat) : null,
        descricao: String(item.descricao ?? item.nome ?? codigo),
        tipo: item.tipo ? String(item.tipo) : "outro",
        unidade_medida: item.unidadeMedida ? String(item.unidadeMedida) : null,
      };
      const result = await upsertByHash(
        client,
        "catalogo_itens",
        { codigo_pncp: codigo },
        row,
        { syncRunId: runId },
      );
      if (result === "erro") stats.erros++;
    }

    await finishSyncRun(client, runId, {
      status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
      totalRecebidos: stats.categorias + stats.itens,
      totalNovos: stats.categorias + stats.itens,
      totalErros: stats.erros,
    });

    return jsonResponse({ sync_id: runId, status: "concluida", ...stats });
  } catch (error) {
    await finishSyncRun(client, runId, {
      status: "falhou",
      erroPrincipal: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: String(error), sync_id: runId }, 500);
  }
});
