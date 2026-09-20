import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import { PncpIntegracaoClient } from "../_shared/pncp/integracao-client.ts";
import { acquireSyncLock } from "../_shared/pncp/lock.ts";
import {
  createServiceClient,
  finishSyncRun,
  logSyncRequest,
  storeSourceRecord,
} from "../_shared/pncp/supabase-admin.ts";
import { upsertByHash } from "../_shared/pncp/upsert.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const client = createServiceClient();
  const integracao = new PncpIntegracaoClient();
  const lockKey = "orgaos-sync";
  const { runId, alreadyRunning } = await acquireSyncLock(client, lockKey, "orgaos", {});

  if (alreadyRunning) {
    return jsonResponse({ status: "already_running", sync_id: runId });
  }

  const stats = { entidades_inseridas: 0, orgaos_inseridas: 0, unidades_inseridas: 0, erros: 0 };

  try {
    // Ler CNPJs distintos de pca_planos (recorte fitness 7830)
    const cnpjsResult = await client
      .from("pca_planos")
      .select("orgao_cnpj")
      .eq("classe_catmat", "7830")
      .order("orgao_cnpj", { ascending: true });

    if (cnpjsResult.error) {
      throw new Error(`Erro ao ler pca_planos: ${cnpjsResult.error.message}`);
    }

    const cnpjsSet = new Set<string>();
    (cnpjsResult.data ?? []).forEach((row: Record<string, unknown>) => {
      const cnpj = String(row.orgao_cnpj ?? "").trim();
      if (cnpj && cnpj.length > 0) cnpjsSet.add(cnpj);
    });

    const cnpjs = Array.from(cnpjsSet);
    for (const cnpj of cnpjs) {
      try {
        const orgaoData = await integracao.getOrgao(cnpj);
        const payload = orgaoData as Record<string, unknown>;

        await storeSourceRecord(client, {
          syncRunId: runId,
          endpoint: `/orgaos/${cnpj}`,
          chave_natural: cnpj,
          payload,
        });

        // Upsert entidade via chave natural (codigo_pncp)
        const entidadeResult = await upsertByHash(
          client,
          "entidades",
          { codigo_pncp: cnpj },
          {
            codigo_pncp: cnpj,
            cnpj: cnpj,
            cnpj_normalizado: cnpj.replace(/\D/g, ""),
            tipo: "orgao",
          },
          { syncRunId: runId, lastSeenSyncId: runId },
        );

        if (entidadeResult !== "erro") stats.entidades_inseridas++;

        // Obter ID da entidade para FK
        const entidadeIdResult = await client
          .from("entidades")
          .select("id")
          .eq("codigo_pncp", cnpj)
          .single();

        if (entidadeIdResult.data && entidadeIdResult.data.id) {
          const entidadeId = entidadeIdResult.data.id;

          // Upsert orgao via FK entidade_id
          const orgaoResult = await upsertByHash(
            client,
            "orgaos",
            { entidade_id: entidadeId },
            {
              entidade_id: entidadeId,
              orgao_id_pncp: cnpj.slice(0, 8),
              cnpj: cnpj,
            },
            { syncRunId: runId, lastSeenSyncId: runId },
          );

          if (orgaoResult !== "erro") stats.orgaos_inseridas++;
        }
      } catch (error) {
        stats.erros++;
        await logSyncRequest(client, {
          syncRunId: runId,
          endpoint: `/orgaos/${cnpj}`,
          parametros: { cnpj },
          erro: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await finishSyncRun(client, runId, stats);
    return jsonResponse({ status: "ok", stats, cnpjs_processados: cnpjs.length });
  } catch (error) {
    await finishSyncRun(
      client,
      runId,
      { ...stats, erro: error instanceof Error ? error.message : String(error) },
    );
    return jsonResponse(
      { status: "error", erro: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
