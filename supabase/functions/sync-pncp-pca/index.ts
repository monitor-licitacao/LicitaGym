import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorDetail, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import {
  clampConsultaPageSize,
  PncpConsultaClient,
} from "../_shared/pncp/consulta-client.ts";
import { resolvePcaClassificacoes } from "../_shared/pncp/licitagym-catmat.ts";
import {
  getPeriodAnchor,
  markPeriodLoadComplete,
  shouldSkipAnnualLoad,
  upsertPeriodProbe,
} from "../_shared/pncp/period-anchor.ts";
import { acquireSyncLock } from "../_shared/pncp/lock.ts";
import { PncpSearchClient } from "../_shared/pncp/search-client.ts";
import { hashPayload, sha256Hex } from "../_shared/pncp/hash.ts";
import {
  createServiceClient,
  finishSyncRun,
  logSyncRequest,
  storeSourceRecord,
} from "../_shared/pncp/supabase-admin.ts";
import { inactivateNotSeen, upsertByHash } from "../_shared/pncp/upsert.ts";

type SyncBody = {
  ano?: number;
  /** Um código CATMAT/CATSER (legado). */
  codigo_classificacao_superior?: string;
  /** Vários códigos — ex.: ["7830"] para ginástica e recreação. */
  codigos_classificacao?: string[];
  pagina_inicial?: number;
  /** Limita páginas por código (útil em cron parcial ou smoke test). */
  max_paginas?: number;
  tamanho_pagina?: number;
  modo?: "incremental" | "completo";
  /** Só consulta Search API (pcaorgao) e persiste lastro de período — sem GET /v1/pca/. */
  somente_verificacao?: boolean;
  /** Compara data_atualizacao_pncp do índice com última carga; pula sync pesado se inalterado. */
  verificar_periodo?: boolean;
  /** Ignora verificação de período (carga anual forçada). */
  forcar?: boolean;
};

type SyncStats = {
  novos: number;
  alterados: number;
  inalterados: number;
  erros: number;
  recebidos: number;
};

function emptyStats(): SyncStats {
  return { novos: 0, alterados: 0, inalterados: 0, erros: 0, recebidos: 0 };
}

function mergeStats(into: SyncStats, from: SyncStats) {
  into.novos += from.novos;
  into.alterados += from.alterados;
  into.inalterados += from.inalterados;
  into.erros += from.erros;
  into.recebidos += from.recebidos;
}

function normalizePcaRow(item: Record<string, unknown>, ano: number) {
  const idPca = String(item.idPcaPncp ?? item.id_pca_pncp ?? "");
  return {
    id_pca_pncp: idPca,
    ano_exercicio: Number(item.anoPca ?? item.ano ?? ano),
    orgao_cnpj: String(item.orgaoEntidadeCnpj ?? item.cnpj ?? "").replace(/\D/g, ""),
    titulo: String(item.titulo ?? item.descricao ?? idPca),
    descricao: item.descricao ? String(item.descricao) : null,
    status: item.status ? String(item.status) : null,
    url_origem: idPca ? `https://pncp.gov.br/app/pca/${idPca}` : null,
  };
}

async function syncClassificacao(params: {
  client: ReturnType<typeof createServiceClient>;
  consulta: PncpConsultaClient;
  runId: string;
  ano: number;
  codigoClassificacao: string;
  paginaInicial: number;
  maxPaginas: number;
  tamanhoPagina: number;
}): Promise<{ stats: SyncStats; ultimaPagina: number }> {
  const {
    client,
    consulta,
    runId,
    ano,
    codigoClassificacao,
    paginaInicial,
    maxPaginas,
    tamanhoPagina,
  } = params;

  const stats = emptyStats();
  let pagina = paginaInicial;
  let paginasRestantes = 1;

  while (paginasRestantes >= 0 && pagina < paginaInicial + maxPaginas) {
    const endpoint =
      `/pca/?anoPca=${ano}&codigoClassificacaoSuperior=${codigoClassificacao}&pagina=${pagina}`;
    const { status, body: responseBody, elapsedMs } = await consulta.fetchPcaPage(
      ano,
      pagina,
      codigoClassificacao,
      tamanhoPagina,
    );
    const respostaHash = await sha256Hex(JSON.stringify(responseBody));
    await logSyncRequest(client, {
      syncRunId: runId,
      endpoint,
      parametros: { ano, codigoClassificacao, pagina, tamanhoPagina },
      pagina,
      statusHttp: status,
      tempoRespostaMs: elapsedMs,
      respostaHash,
    });

    const requestHash = await hashPayload({
      ano,
      codigoClassificacao,
      pagina,
      tamanhoPagina,
    });
    await storeSourceRecord(client, {
      syncRunId: runId,
      resourceType: "pca",
      endpoint,
      requestHash,
      contentHash: respostaHash,
      payload: responseBody,
    });

    const list = consulta.extractList(responseBody);
    const pagination = consulta.extractPagination(responseBody, pagina);
    paginasRestantes = pagination.paginasRestantes;

    for (const raw of list) {
      const item = raw as Record<string, unknown>;
      const nestedItems = Array.isArray(item.itens) ? item.itens : [item];
      for (const nested of nestedItems) {
        const row = normalizePcaRow(
          { ...item, ...(nested as Record<string, unknown>) },
          ano,
        );
        if (!row.id_pca_pncp) continue;
        stats.recebidos++;
        const result = await upsertByHash(
          client,
          "pca_planos",
          { id_pca_pncp: row.id_pca_pncp },
          row,
          {
            historyTable: "pca_alteracoes",
            syncRunId: runId,
            lastSeenSyncId: runId,
          },
        );
        if (result === "novo") stats.novos++;
        else if (result === "alterado") stats.alterados++;
        else if (result === "inalterado") stats.inalterados++;
        else stats.erros++;
      }
    }

    if (pagination.paginasRestantes <= 0) break;
    pagina++;
  }

  return { stats, ultimaPagina: pagina };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as SyncBody;
  const ano = body.ano ?? new Date().getUTCFullYear();
  const codigosClassificacao = resolvePcaClassificacoes(body);
  const paginaInicial = body.pagina_inicial ?? 1;
  const maxPaginas = body.max_paginas ?? 100;
  const tamanhoPagina = clampConsultaPageSize("pca", body.tamanho_pagina);
  const verificarPeriodo = body.verificar_periodo ?? !body.forcar;
  const lockKey = body.somente_verificacao
    ? `pca-probe:${ano}`
    : `pca-sync:${ano}:${codigosClassificacao.slice().sort().join(",")}`;

  let client;
  try {
    client = createServiceClient();
  } catch (error) {
    return jsonResponse(
      {
        error: "Supabase service client indisponivel",
        detalhe: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }

  const search = new PncpSearchClient();

  let periodSummary;
  try {
    periodSummary = await search.summarizePcaPeriod(ano);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      {
        error: "Falha ao consultar indice Search (pcaorgao)",
        detalhe: msg,
        dica: "Probe local: scripts/probe-pca-periodo.ps1 ou curl na Search API. Sync pesado exige forcar:true se pular verificacao.",
      },
      503,
    );
  }

  let periodAnchor;
  try {
    periodAnchor = await getPeriodAnchor(client, ano);
    await upsertPeriodProbe(client, periodSummary, { origem: "sync-pncp-pca" });
  } catch (error) {
    return jsonResponse(
      {
        error: "Falha ao ler/gravar lastro em private.pncp_period_anchor",
        detalhe: errorDetail(error),
        dica:
          "Dashboard → API → Exposed schemas → private; depois NOTIFY pgrst reload schema. Confira se a tabela existe (migration 013).",
      },
      500,
    );
  }

  if (body.somente_verificacao) {
    const decisao = shouldSkipAnnualLoad(periodAnchor, periodSummary);
    return jsonResponse({
      status: "verificacao",
      ano,
      periodo: periodSummary,
      anchor: periodAnchor,
      carga_necessaria: !decisao.skip,
      motivo: decisao.reason,
    });
  }

  if (verificarPeriodo && !body.forcar) {
    const decisao = shouldSkipAnnualLoad(periodAnchor, periodSummary);
    if (decisao.skip) {
      return jsonResponse({
        status: "ignorado",
        ano,
        motivo: decisao.reason,
        periodo: periodSummary,
        anchor: periodAnchor,
        mensagem:
          "Índice Search sem atualizações desde a última carga. Use forcar:true para carga anual.",
      });
    }
  }

  const consulta = new PncpConsultaClient();
  const { runId, alreadyRunning } = await acquireSyncLock(client, lockKey, "pca", body);

  if (alreadyRunning) {
    return jsonResponse({ status: "already_running", sync_id: runId });
  }

  const stats = emptyStats();
  const porCodigo: Record<string, SyncStats & { ultima_pagina: number }> = {};

  try {
    for (const codigoClassificacao of codigosClassificacao) {
      const result = await syncClassificacao({
        client,
        consulta,
        runId,
        ano,
        codigoClassificacao,
        paginaInicial,
        maxPaginas,
        tamanhoPagina,
      });
      porCodigo[codigoClassificacao] = {
        ...result.stats,
        ultima_pagina: result.ultimaPagina,
      };
      mergeStats(stats, result.stats);
    }

    if (body.modo === "completo") {
      await inactivateNotSeen(client, "pca_planos", runId, { ano_exercicio: ano });
    }

    if (stats.erros === 0) {
      await markPeriodLoadComplete(client, periodSummary);
    }

    await finishSyncRun(client, runId, {
      status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
      totalRecebidos: stats.recebidos,
      totalNovos: stats.novos,
      totalAtualizados: stats.alterados,
      totalInalterados: stats.inalterados,
      totalErros: stats.erros,
      paginaAtual: Math.max(...Object.values(porCodigo).map((c) => c.ultima_pagina), 0),
    });

    return jsonResponse({
      sync_id: runId,
      status: "concluida",
      ano,
      codigos_classificacao: codigosClassificacao,
      periodo: periodSummary,
      por_codigo: porCodigo,
      ...stats,
    });
  } catch (error) {
    await finishSyncRun(client, runId, {
      status: "falhou",
      erroPrincipal: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({ error: String(error), sync_id: runId }, 500);
  }
});
