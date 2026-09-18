import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeaders,
  jsonResponse,
  parseQueryInt,
  validateCronAuth,
} from "../_shared/http.ts";
import { beginIdempotency, finishIdempotency } from "../_shared/pncp/idempotency.ts";

function getUserClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Supabase env missing");
  return createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
}

async function triggerSync(tipo: string, body: Record<string, unknown>) {
  const base = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const secret = Deno.env.get("SYNC_CRON_SECRET");
  if (!base || !secret) throw new Error("Sync não configurado");
  const fnMap: Record<string, string> = {
    editais: "sync-pncp-contratacoes-editais",
    atas: "sync-pncp-contratacoes-atas",
    contratos: "sync-pncp-contratacoes-contratos",
  };
  const fn = fnMap[tipo];
  if (!fn) throw new Error("tipo inválido: editais | atas | contratos");
  const res = await fetch(`${base}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo") ?? "editais";

  if (req.method === "GET") {
    const client = getUserClient(req);
    const page = parseQueryInt(url, "page", 1);
    const limit = Math.min(parseQueryInt(url, "limit", 20), 100);
    const offset = (page - 1) * limit;
    const tableMap: Record<string, string> = {
      editais: "contratacoes_editais",
      atas: "contratacoes_atas",
      contratos: "contratacoes_contratos",
    };
    const table = tableMap[tipo] ?? "contratacoes_editais";

    const { data, error, count } = await client
      .from(table)
      .select("*", { count: "exact" })
      .eq("ativo", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ tipo, data, page, limit, total: count ?? 0 });
  }

  if (req.method === "POST") {
    const idempotencyKey = req.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return jsonResponse({ error: "Header Idempotency-Key obrigatório" }, 400);
    }

    const serviceUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceUrl || !serviceKey) {
      return jsonResponse({ error: "Service role não configurado" }, 500);
    }

    const admin = createClient(serviceUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const rota = `POST /api/contratacoes/sync?tipo=${tipo}`;
    const begin = await beginIdempotency(admin, idempotencyKey, rota, { ...body, tipo });
    if (begin.skip) return jsonResponse(begin.resposta);

    if (!validateCronAuth(req)) {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    const result = await triggerSync(tipo, body);
    await finishIdempotency(admin, idempotencyKey, rota, result.body, result.status);
    return jsonResponse(result.body, result.status);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});
