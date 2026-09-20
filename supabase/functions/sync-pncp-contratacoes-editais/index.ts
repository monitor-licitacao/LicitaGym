import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse, validateCronAuth } from "../_shared/http.ts";
import {
  clampConsultaPageSize,
  formatPncpDate,
  PncpConsultaClient,
} from "../_shared/pncp/consulta-client.ts";
import { acquireSyncLock } from "../_shared/pncp/lock.ts";
import { hashPayload, sha256Hex } from "../_shared/pncp/hash.ts";
import { normalizeEdital } from "../_shared/pncp/normalize.ts";
import {
  createServiceClient,
  finishSyncRun,
  logSyncRequest,
  storeSourceRecord,
} from "../_shared/pncp/supabase-admin.ts";
import { inactivateNotSeen, upsertByHash } from "../_shared/pncp/upsert.ts";
import {
  isNationalPncpSyncEnabled,
  nationalPncpSyncGate,
} from "../_shared/pncp/licitagym-scope-gate.ts";
import { matchCatalogoEditalObjeto } from "../_shared/pncp/licitagym-edital-objeto-gate.ts";

const MODALIDADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type EscopoEdital = "nacional" | "orgaos_conhecidos" | "catalogo";

type SyncBody = {
  data_inicial?: string;
  data_final?: string;
  modalidade?: number;
  modo?: "incremental" | "completo";
  usar_atualizacao?: boolean;
  /**
   * nacional — exige PNCP_NATIONAL_SYNC_ENABLED
   * orgaos_conhecidos — só CNPJs em `orgaos` (sem filtro CATMAT)
   * catalogo — orgaos + objeto no recorte 78/7830|72/7220 (default LicitaGym)
   */
  escopo?: EscopoEdital;
  max_paginas?: number;
};

function parseEscopo(raw: unknown): EscopoEdital {
  if (raw === "nacional") return "nacional";
  if (raw === "orgaos_conhecidos") return "orgaos_conhecidos";
  return "catalogo";
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as SyncBody;
  const escopo = parseEscopo(body.escopo);
  const exigeOrgaos = escopo === "orgaos_conhecidos" || escopo === "catalogo";
  const exigeObjetoCatalogo = escopo === "catalogo";

  if (escopo === "nacional" && !isNationalPncpSyncEnabled()) {
    return nationalPncpSyncGate("contratacoes-editais");
  }

  const hoje = new Date();
  const dataFinal = body.data_final ?? formatPncpDate(hoje);
  const dataInicial = body.data_inicial ?? formatPncpDate(
    new Date(hoje.getTime() - 7 * 86400000),
  );
  const modalidades = body.modalidade ? [body.modalidade] : MODALIDADES;
  const maxPaginas = Math.min(200, Math.max(1, Number(body.max_paginas ?? 200) || 200));
  const lockKey = `contratacoes-editais:${escopo}:${dataInicial}:${dataFinal}`;

  const client = createServiceClient();
  const consulta = new PncpConsultaClient();
  const { runId, alreadyRunning } = await acquireSyncLock(
    client,
    lockKey,
    "contratacoes_editais",
    body,
  );

  if (alreadyRunning) {
    return jsonResponse({ status: "already_running", sync_id: runId });
  }

  const stats = {
    novos: 0,
    alterados: 0,
    inalterados: 0,
    erros: 0,
    recebidos: 0,
    fora_escopo_orgao: 0,
    fora_escopo_catalogo: 0,
  };
  const tamanhoPagina = clampConsultaPageSize("contratacoes");

  const orgaosConhecidos = new Set<string>();
  if (exigeOrgaos) {
    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await client
        .from("orgaos")
        .select("cnpj")
        .eq("ativo", true)
        .range(from, from + pageSize - 1);
      if (error) {
        await finishSyncRun(client, runId, {
          status: "falhou",
          erroPrincipal: error.message,
        });
        return jsonResponse({ error: error.message, sync_id: runId }, 500);
      }
      if (!data?.length) break;
      for (const row of data) {
        const cnpj = String(row.cnpj ?? "").replace(/\D/g, "");
        if (cnpj.length === 14) orgaosConhecidos.add(cnpj);
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
    if (orgaosConhecidos.size === 0) {
      await finishSyncRun(client, runId, {
        status: "falhou",
        erroPrincipal: `escopo ${escopo} sem CNPJs em orgaos`,
      });
      return jsonResponse({
        error: "Nenhum órgão conhecido — rode bootstrap_pca antes",
        sync_id: runId,
      }, 400);
    }
  }

  try {
    for (const modalidade of modalidades) {
      let pagina = 1;
      let paginasRestantes = 1;

      while (paginasRestantes > 0 && pagina <= maxPaginas) {
        const fetchFn = body.usar_atualizacao
          ? () => consulta.fetchContratacoesAtualizacao({
            dataInicial,
            dataFinal,
            codigoModalidadeContratacao: modalidade,
            pagina,
            tamanhoPagina,
          })
          : () => consulta.fetchContratacoesPublicacao({
            dataInicial,
            dataFinal,
            codigoModalidadeContratacao: modalidade,
            pagina,
            tamanhoPagina,
          });

        const endpoint = body.usar_atualizacao
          ? `/contratacoes/atualizacao?modalidade=${modalidade}&pagina=${pagina}`
          : `/contratacoes/publicacao?modalidade=${modalidade}&pagina=${pagina}`;

        const { status, body: responseBody, elapsedMs } = await fetchFn();
        const respostaHash = await sha256Hex(JSON.stringify(responseBody));

        await logSyncRequest(client, {
          syncRunId: runId,
          endpoint,
          parametros: {
            dataInicial,
            dataFinal,
            modalidade,
            pagina,
            tamanhoPagina,
            escopo,
          },
          pagina,
          statusHttp: status,
          tempoRespostaMs: elapsedMs,
          respostaHash,
        });

        await storeSourceRecord(client, {
          syncRunId: runId,
          resourceType: "contratacoes_editais",
          endpoint,
          requestHash: await hashPayload({ dataInicial, dataFinal, modalidade, pagina }),
          contentHash: respostaHash,
          payload: responseBody,
        });

        const list = consulta.extractList(responseBody);
        const pagination = consulta.extractPagination(responseBody, pagina);
        paginasRestantes = pagination.paginasRestantes;

        for (const raw of list) {
          const item = raw as Record<string, unknown>;
          const row = normalizeEdital(item);
          if (!row.orgao_cnpj || !row.ano || !row.sequencial) continue;
          stats.recebidos++;

          if (
            exigeOrgaos &&
            !orgaosConhecidos.has(String(row.orgao_cnpj).replace(/\D/g, ""))
          ) {
            stats.fora_escopo_orgao++;
            continue;
          }

          if (exigeObjetoCatalogo) {
            const match = matchCatalogoEditalObjeto(row.objeto);
            if (!match.ok) {
              stats.fora_escopo_catalogo++;
              continue;
            }
          }

          const result = await upsertByHash(
            client,
            "contratacoes_editais",
            { orgao_cnpj: row.orgao_cnpj, ano: row.ano, sequencial: row.sequencial },
            row,
            { syncRunId: runId, lastSeenSyncId: runId },
          );
          if (result === "novo") stats.novos++;
          else if (result === "alterado") stats.alterados++;
          else if (result === "inalterado") stats.inalterados++;
          else stats.erros++;
        }

        if (paginasRestantes <= 0) break;
        pagina++;
      }
    }

    if (body.modo === "completo") {
      await inactivateNotSeen(client, "contratacoes_editais", runId);
    }

    await finishSyncRun(client, runId, {
      status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
      totalRecebidos: stats.recebidos,
      totalNovos: stats.novos,
      totalAtualizados: stats.alterados,
      totalInalterados: stats.inalterados,
      totalErros: stats.erros,
    });

    return jsonResponse({
      sync_id: runId,
      status: "concluida",
      escopo,
      catalogo_pares: exigeObjetoCatalogo ? ["78/7830", "72/7220"] : null,
      orgaos_conhecidos: exigeOrgaos ? orgaosConhecidos.size : null,
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
