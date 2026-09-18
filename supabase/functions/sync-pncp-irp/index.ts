import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import { acquireSyncLock } from "../_shared/pncp/lock.ts";
import { createServiceClient, finishSyncRun } from "../_shared/pncp/supabase-admin.ts";

/**
 * Gate CLA-34: IRP não possui endpoint de listagem na API Consulta.
 * Sync permanece desabilitado até confirmação na contract-matrix.md.
 * Override explícito: IRP_SYNC_ENABLED=true + orgaos monitorados.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const gateEnabled = Deno.env.get("IRP_SYNC_ENABLED") === "true";
  if (!gateEnabled) {
    return jsonResponse({
      status: "blocked",
      reason: "IRP list endpoint not verified in API Consulta (CLA-34 gate)",
      hint: "Set IRP_SYNC_ENABLED=true after contract-matrix verification",
    }, 423);
  }

  const body = await req.json().catch(() => ({})) as {
    orgaos?: Array<{ cnpj: string; ano: number; sequencial: number }>;
  };

  const client = createServiceClient();
  const lockKey = "irp-sync:manual";
  const { runId, alreadyRunning } = await acquireSyncLock(client, lockKey, "irp", body);

  if (alreadyRunning) {
    return jsonResponse({ status: "already_running", sync_id: runId });
  }

  try {
    const orgaos = body.orgaos ?? [];
    if (orgaos.length === 0) {
      await finishSyncRun(client, runId, {
        status: "falhou",
        erroPrincipal: "Nenhum órgão informado — listagem global indisponível",
      });
      return jsonResponse({
        error: "Informe orgaos[] com cnpj, ano e sequencial para sync por detalhe (API integração)",
        sync_id: runId,
      }, 400);
    }

    await finishSyncRun(client, runId, {
      status: "concluida",
      totalRecebidos: 0,
      erroPrincipal: "Implementação por órgão pendente de credenciais PNCP integração",
    });

    return jsonResponse({
      sync_id: runId,
      status: "gate_passed",
      message: "Schema pronto; ingestão por órgão requer PNCP_INTEGRACAO_TOKEN",
      orgaos_solicitados: orgaos.length,
    });
  } catch (error) {
    await finishSyncRun(client, runId, {
      status: "falhou",
      erroPrincipal: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: String(error), sync_id: runId }, 500);
  }
});
