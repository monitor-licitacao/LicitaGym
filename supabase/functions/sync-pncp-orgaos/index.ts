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
import { orgSyncClasses } from "../_shared/pncp/catmat-scope-resolver.ts";
import { hashPayload, sha256Hex } from "../_shared/pncp/hash.ts";
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
    const classCodes = orgSyncClasses().map((classe) => Number(classe));
    const itemsResult = await client
      .from("pca_itens")
      .select("pca_plano_id")
      .in("codigo_classe_catmat", classCodes);

    if (itemsResult.error) {
      throw new Error(`Erro ao ler pca_itens: ${itemsResult.error.message}`);
    }

    const planIds = [
      ...new Set(
        (itemsResult.data ?? [])
          .map((row) => row.pca_plano_id as string)
          .filter((id) => id.length > 0),
      ),
    ];

    const cnpjsSet = new Set<string>();
    if (planIds.length > 0) {
      const cnpjsResult = await client
        .from("pca_planos")
        .select("orgao_cnpj")
        .in("id", planIds)
        .order("orgao_cnpj", { ascending: true });

      if (cnpjsResult.error) {
        throw new Error(`Erro ao ler pca_planos: ${cnpjsResult.error.message}`);
      }

      (cnpjsResult.data ?? []).forEach((row: Record<string, unknown>) => {
        const cnpj = String(row.orgao_cnpj ?? "").trim();
        if (cnpj.length > 0) cnpjsSet.add(cnpj);
      });
    }

    const cnpjs = Array.from(cnpjsSet);
    for (const cnpj of cnpjs) {
      try {
        const orgaoData = await integracao.getOrgao(cnpj);
        const payload = orgaoData as Record<string, unknown>;

        const endpoint = `/orgaos/${cnpj}`;
        const requestHash = await hashPayload({ cnpj });
        const contentHash = await sha256Hex(JSON.stringify(payload));
        await storeSourceRecord(client, {
          syncRunId: runId,
          resourceType: "orgaos",
          endpoint,
          requestHash,
          contentHash,
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

    await finishSyncRun(client, runId, {
      status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
      totalRecebidos: cnpjs.length,
      totalErros: stats.erros,
      parametros: stats,
    });
    return jsonResponse({ status: "ok", stats, cnpjs_processados: cnpjs.length });
  } catch (error) {
    await finishSyncRun(client, runId, {
      status: "falhou",
      totalErros: stats.erros + 1,
      erroPrincipal: error instanceof Error ? error.message : String(error),
      parametros: stats,
    });
    return jsonResponse(
      { status: "error", erro: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
