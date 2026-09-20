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

type Modo = "integracao" | "bootstrap_pca" | "bootstrap_unidades";

type Body = {
  /** integracao = GET /orgaos/{cnpj}; bootstrap_* = dados já ingeridos em pca_planos */
  modo?: Modo;
  classe_gate?: string;
  offset?: number;
  limite?: number;
};

type OrgaoSeed = {
  cnpj: string;
  razao_social: string | null;
};

type UnidadeSeed = {
  cnpj: string;
  codigo_unidade: string;
  nome: string | null;
};

type ServiceClient = ReturnType<typeof createServiceClient>;

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function parseModo(raw: unknown): Modo {
  if (raw === "bootstrap_pca") return "bootstrap_pca";
  if (raw === "bootstrap_unidades") return "bootstrap_unidades";
  return "integracao";
}

function pickBestName(counts: Map<string, number>): string | null {
  let best: string | null = null;
  let bestN = 0;
  for (const [name, n] of counts) {
    if (n > bestN) {
      best = name;
      bestN = n;
    }
  }
  return best;
}

/** CNPJs distintos + melhor nome disponível em pca_planos.descricao (sem inventar). */
async function loadOrgaoSeeds(
  client: ServiceClient,
  classeGate: string,
): Promise<OrgaoSeed[]> {
  const byCnpj = new Map<string, Map<string, number>>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from("pca_itens")
      .select("pca_planos!inner(orgao_cnpj, descricao, ativo)")
      .eq("classe_material_servico", classeGate)
      .eq("pca_planos.ativo", true)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Erro ao ler CNPJs gate ${classeGate}: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      const plano = row.pca_planos as {
        orgao_cnpj?: string;
        descricao?: string | null;
      } | null;
      const cnpj = digitsOnly(plano?.orgao_cnpj);
      if (cnpj.length !== 14) continue;

      if (!byCnpj.has(cnpj)) byCnpj.set(cnpj, new Map());
      const name = String(plano?.descricao ?? "").trim();
      if (name) {
        const counts = byCnpj.get(cnpj)!;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  const seeds: OrgaoSeed[] = [];
  for (const [cnpj, counts] of byCnpj) {
    seeds.push({ cnpj, razao_social: pickBestName(counts) });
  }
  return seeds.sort((a, b) => a.cnpj.localeCompare(b.cnpj));
}

/** Pares (CNPJ, codigo_unidade) do gate + nome de pca_planos.titulo. */
async function loadUnidadeSeeds(
  client: ServiceClient,
  classeGate: string,
): Promise<UnidadeSeed[]> {
  type Agg = { nomes: Map<string, number> };
  const byKey = new Map<string, Agg & { cnpj: string; codigo: string }>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from("pca_itens")
      .select("pca_planos!inner(orgao_cnpj, unidade_codigo, titulo, ativo)")
      .eq("classe_material_servico", classeGate)
      .eq("pca_planos.ativo", true)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Erro ao ler unidades gate ${classeGate}: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      const plano = row.pca_planos as {
        orgao_cnpj?: string;
        unidade_codigo?: string | null;
        titulo?: string | null;
      } | null;
      const cnpj = digitsOnly(plano?.orgao_cnpj);
      const codigo = String(plano?.unidade_codigo ?? "").trim();
      if (cnpj.length !== 14 || !codigo) continue;

      const key = `${cnpj}|${codigo}`;
      if (!byKey.has(key)) {
        byKey.set(key, { cnpj, codigo, nomes: new Map() });
      }
      const nome = String(plano?.titulo ?? "").trim();
      if (nome) {
        const counts = byKey.get(key)!.nomes;
        counts.set(nome, (counts.get(nome) ?? 0) + 1);
      }
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  const seeds: UnidadeSeed[] = [];
  for (const row of byKey.values()) {
    seeds.push({
      cnpj: row.cnpj,
      codigo_unidade: row.codigo,
      nome: pickBestName(row.nomes),
    });
  }
  return seeds.sort((a, b) =>
    a.cnpj === b.cnpj
      ? a.codigo_unidade.localeCompare(b.codigo_unidade)
      : a.cnpj.localeCompare(b.cnpj)
  );
}

async function loadOrgaoIdByCnpj(
  client: ServiceClient,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from("orgaos")
      .select("id, cnpj")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Erro ao ler orgaos: ${error.message}`);
    if (!data?.length) break;
    for (const row of data) {
      const cnpj = digitsOnly(row.cnpj);
      if (cnpj.length === 14 && row.id) map.set(cnpj, String(row.id));
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

async function upsertOrgaoPair(
  client: ServiceClient,
  runId: string,
  cnpj: string,
  razaoSocial: string | null,
  stats: Record<string, number>,
) {
  const entidadeResult = await upsertByHash(
    client,
    "entidades",
    { codigo_pncp: cnpj },
    {
      codigo_pncp: cnpj,
      cnpj,
      razao_social: razaoSocial,
      tipo: "orgao",
      ativo: true,
    },
    { syncRunId: runId },
  );

  if (entidadeResult === "novo") stats.entidades_novas++;
  else if (entidadeResult === "alterado") stats.entidades_alteradas++;
  else if (entidadeResult === "inalterado") stats.entidades_inalteradas++;
  else {
    stats.erros++;
    return;
  }

  const { data: entidade, error: entidadeErr } = await client
    .from("entidades")
    .select("id")
    .eq("codigo_pncp", cnpj)
    .maybeSingle();

  if (entidadeErr || !entidade?.id) {
    stats.erros++;
    await logSyncRequest(client, {
      syncRunId: runId,
      endpoint: `local://orgaos/${cnpj}`,
      parametros: { cnpj, step: "lookup_entidade" },
      erro: entidadeErr?.message ?? "entidade não encontrada após upsert",
    });
    return;
  }

  const orgaoResult = await upsertByHash(
    client,
    "orgaos",
    { entidade_id: entidade.id },
    {
      entidade_id: entidade.id,
      cnpj,
      razao_social: razaoSocial,
      ativo: true,
    },
    { syncRunId: runId },
  );

  if (orgaoResult === "novo") stats.orgaos_novos++;
  else if (orgaoResult === "alterado") stats.orgaos_alterados++;
  else if (orgaoResult === "inalterado") stats.orgaos_inalterados++;
  else stats.erros++;
}

async function upsertUnidade(
  client: ServiceClient,
  runId: string,
  orgaoId: string,
  seed: UnidadeSeed,
  stats: Record<string, number>,
) {
  const result = await upsertByHash(
    client,
    "unidades",
    { orgao_id: orgaoId, codigo_unidade: seed.codigo_unidade },
    {
      orgao_id: orgaoId,
      codigo_unidade: seed.codigo_unidade,
      nome: seed.nome,
      ativo: true,
    },
    { syncRunId: runId },
  );

  if (result === "novo") stats.unidades_novas++;
  else if (result === "alterado") stats.unidades_alteradas++;
  else if (result === "inalterado") stats.unidades_inalteradas++;
  else stats.erros++;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);
  if (!validateCronAuth(req)) return jsonResponse({ error: "Unauthorized" }, 401);

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const modo = parseModo(body.modo);
  const classeGate = String(body.classe_gate ?? "7830").trim() || "7830";
  const offset = Math.max(0, Number(body.offset ?? 0) || 0);
  const isBootstrap = modo === "bootstrap_pca" || modo === "bootstrap_unidades";
  const defaultLimite = isBootstrap ? 500 : 10;
  const limite = Math.min(
    isBootstrap ? 1000 : 40,
    Math.max(1, Number(body.limite ?? defaultLimite) || defaultLimite),
  );

  const client = createServiceClient();
  const integracao = new PncpIntegracaoClient();
  const lockKey = `orgaos-sync:${classeGate}:${modo}`;
  const { runId, alreadyRunning } = await acquireSyncLock(client, lockKey, "orgaos", {
    modo,
    classe_gate: classeGate,
    offset,
    limite,
  });

  if (alreadyRunning) {
    return jsonResponse({ status: "already_running", sync_id: runId });
  }

  const stats = {
    entidades_novas: 0,
    entidades_alteradas: 0,
    entidades_inalteradas: 0,
    orgaos_novos: 0,
    orgaos_alterados: 0,
    orgaos_inalterados: 0,
    unidades_novas: 0,
    unidades_alteradas: 0,
    unidades_inalteradas: 0,
    erros: 0,
    orgao_ausente: 0,
  };

  try {
    if (modo === "bootstrap_unidades") {
      const seeds = await loadUnidadeSeeds(client, classeGate);
      const orgaoByCnpj = await loadOrgaoIdByCnpj(client);
      const slice = seeds.slice(offset, offset + limite);
      const nextOffset = offset + slice.length;
      const done = nextOffset >= seeds.length;

      for (const seed of slice) {
        const started = Date.now();
        try {
          const orgaoId = orgaoByCnpj.get(seed.cnpj);
          if (!orgaoId) {
            stats.orgao_ausente++;
            stats.erros++;
            await logSyncRequest(client, {
              syncRunId: runId,
              endpoint: `local://pca_planos/unidade/${seed.cnpj}/${seed.codigo_unidade}`,
              parametros: { ...seed, modo },
              tempoRespostaMs: Date.now() - started,
              erro: "órgão não encontrado em orgaos — rode bootstrap_pca antes",
            });
            continue;
          }

          await logSyncRequest(client, {
            syncRunId: runId,
            endpoint: `local://pca_planos/unidade/${seed.cnpj}/${seed.codigo_unidade}`,
            parametros: { cnpj: seed.cnpj, codigo_unidade: seed.codigo_unidade, modo },
            tempoRespostaMs: Date.now() - started,
          });

          await upsertUnidade(client, runId, orgaoId, seed, stats);
        } catch (error) {
          stats.erros++;
          await logSyncRequest(client, {
            syncRunId: runId,
            endpoint: `local://pca_planos/unidade/${seed.cnpj}/${seed.codigo_unidade}`,
            parametros: { cnpj: seed.cnpj, codigo_unidade: seed.codigo_unidade, modo },
            tempoRespostaMs: Date.now() - started,
            erro: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await finishSyncRun(client, runId, {
        status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
        totalRecebidos: slice.length,
        totalNovos: stats.unidades_novas,
        totalAtualizados: stats.unidades_alteradas,
        totalInalterados: stats.unidades_inalteradas,
        totalErros: stats.erros,
        paginaAtual: offset,
      });

      return jsonResponse({
        status: "ok",
        modo,
        classe_gate: classeGate,
        unidades_total: seeds.length,
        offset,
        limite,
        processados: slice.length,
        next_offset: done ? null : nextOffset,
        done,
        stats,
      });
    }

    const seeds = await loadOrgaoSeeds(client, classeGate);
    const slice = seeds.slice(offset, offset + limite);
    const nextOffset = offset + slice.length;
    const done = nextOffset >= seeds.length;

    for (const seed of slice) {
      const started = Date.now();
      try {
        let cnpj = seed.cnpj;
        let razaoSocial = seed.razao_social;

        if (modo === "integracao") {
          const orgaoData = await integracao.getOrgao(cnpj);
          const payload = orgaoData as Record<string, unknown>;

          if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
            throw new Error("Resposta PNCP inválida para órgão");
          }

          cnpj = digitsOnly(payload.cnpj) || cnpj;
          if (cnpj.length !== 14) {
            throw new Error(`CNPJ inválido na resposta: ${cnpj}`);
          }
          const fromApi = String(payload.razaoSocial ?? payload.razao_social ?? "").trim();
          razaoSocial = fromApi || razaoSocial;

          await storeSourceRecord(client, {
            syncRunId: runId,
            endpoint: `/orgaos/${cnpj}`,
            chave_natural: cnpj,
            payload,
          });

          await logSyncRequest(client, {
            syncRunId: runId,
            endpoint: `/orgaos/${cnpj}`,
            parametros: { cnpj, modo },
            tempoRespostaMs: Date.now() - started,
          });
        } else {
          await logSyncRequest(client, {
            syncRunId: runId,
            endpoint: `local://pca_planos/orgao/${cnpj}`,
            parametros: { cnpj, modo, fonte: "pca_planos.descricao" },
            tempoRespostaMs: Date.now() - started,
          });
        }

        await upsertOrgaoPair(client, runId, cnpj, razaoSocial, stats);
      } catch (error) {
        stats.erros++;
        await logSyncRequest(client, {
          syncRunId: runId,
          endpoint: modo === "integracao"
            ? `/orgaos/${seed.cnpj}`
            : `local://pca_planos/orgao/${seed.cnpj}`,
          parametros: { cnpj: seed.cnpj, modo },
          tempoRespostaMs: Date.now() - started,
          erro: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await finishSyncRun(client, runId, {
      status: stats.erros > 0 ? "concluida_com_erros" : "concluida",
      totalRecebidos: slice.length,
      totalNovos: stats.entidades_novas + stats.orgaos_novos,
      totalAtualizados: stats.entidades_alteradas + stats.orgaos_alterados,
      totalInalterados: stats.entidades_inalteradas + stats.orgaos_inalterados,
      totalErros: stats.erros,
      paginaAtual: offset,
    });

    return jsonResponse({
      status: "ok",
      modo,
      classe_gate: classeGate,
      cnpjs_total: seeds.length,
      offset,
      limite,
      processados: slice.length,
      next_offset: done ? null : nextOffset,
      done,
      stats,
    });
  } catch (error) {
    await finishSyncRun(client, runId, {
      status: "erro",
      totalErros: stats.erros,
      erroPrincipal: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { status: "error", erro: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
