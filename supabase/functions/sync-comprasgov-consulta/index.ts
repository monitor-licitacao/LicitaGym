import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import { ConsultaComprasGovClient } from "../_shared/compras-gov/consulta-client.ts";
import {
  createServiceClient,
  finishSyncRun,
  logSyncRequest,
} from "../_shared/pncp/supabase-admin.ts";
import { acquireSyncLock } from "../_shared/pncp/lock.ts";

/**
 * Sync Function: Consulta Compras.gov via 77 endpoints
 *
 * Orquestra coleta de dados públicos do Compras.gov.br usando:
 * - 15 módulos organizados por tipo de informação
 * - Paginação automática com respeito a rate limits
 * - Poll incremental para tabelas históricas (LEGADO, CONTRATAÇÕES, etc)
 *
 * Cada run:
 * 1. Adquire lock (evita concorrência)
 * 2. Consulta endpoints em lotes (paralelismo limitado)
 * 3. Registra estatísticas e erros
 * 4. Persiste dados conforme schema upsert por módulo
 */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const client = createServiceClient();
  const consulta = new ConsultaComprasGovClient();
  const lockKey = "comprasgov-consulta-sync";
  const { runId, alreadyRunning } = await acquireSyncLock(
    client,
    lockKey,
    "comprasgov_consulta",
    {},
  );

  if (alreadyRunning) {
    return jsonResponse({ status: "already_running", sync_id: runId });
  }

  const stats = {
    modulos: 0,
    endpointsConsultados: 0,
    registrosTotais: 0,
    erros: 0,
  };

  try {
    const inicio = Date.now();

    // TODO: Carregar endpoints do schema JSON
    // Por enquanto, log vazio
    await logSyncRequest(client, {
      syncRunId: runId,
      endpoint: "/consulta-init",
      parametros: { modulos: 15, endpoints: 77 },
      tempoRespostaMs: Date.now() - inicio,
    });

    // Placeholder: aguardando schema JSON com definição dos 77 endpoints
    // Uma vez carregado, iterar e consultar conforme padrão incremental

    await finishSyncRun(client, runId, {
      status: "concluida",
      totalRecebidos: stats.registrosTotais,
      totalNovos: 0,
      totalErros: stats.erros,
      metadados: {
        modulos: stats.modulos,
        endpointsConsultados: stats.endpointsConsultados,
      },
    });

    return jsonResponse({
      status: "sucesso",
      sync_id: runId,
      stats,
    });
  } catch (error) {
    await finishSyncRun(client, runId, {
      status: "erro",
      totalRecebidos: 0,
      totalNovos: 0,
      totalErros: 1,
      metadados: {
        erro: error instanceof Error ? error.message : String(error),
      },
    });

    return jsonResponse({
      status: "erro",
      sync_id: runId,
      erro: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
