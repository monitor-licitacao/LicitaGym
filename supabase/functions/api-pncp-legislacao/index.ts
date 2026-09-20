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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  if (req.method === "GET") {
    const client = getUserClient(req);
    const page = parseQueryInt(url, "page", 1);
    const limit = Math.min(parseQueryInt(url, "limit", 20), 100);
    const offset = (page - 1) * limit;
    const documentoId = url.searchParams.get("documento_id");

    if (documentoId && url.searchParams.get("signed_url") === "true") {
      const serviceUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceUrl || !serviceKey) {
        return jsonResponse({ error: "Service role não configurado" }, 500);
      }
      const admin = createClient(serviceUrl, serviceKey, {
        auth: { persistSession: false },
      });
      const { data: doc } = await admin.from("legislacao_documentos")
        .select("id, versao_atual_id")
        .eq("id", documentoId)
        .maybeSingle();
      if (!doc?.versao_atual_id) {
        return jsonResponse({ error: "Documento sem versão" }, 404);
      }
      const { data: versao } = await admin.from("legislacao_versoes")
        .select("storage_path")
        .eq("id", doc.versao_atual_id)
        .maybeSingle();
      if (!versao?.storage_path) {
        return jsonResponse({ error: "Arquivo não encontrado" }, 404);
      }
      if (versao.storage_path.includes('..')) {
        throw new Error("Invalid path");
      }
      const { data: signed, error } = await admin.storage
        .from("pncp-legislation")
        .createSignedUrl(versao.storage_path, 3600);
      if (error) return jsonResponse({ error: error.message }, 400);
      return jsonResponse({ signed_url: signed.signedUrl, expires_in: 3600 });
    }

    const { data, error, count } = await client
      .from("legislacao_documentos")
      .select("id, titulo, tipo_norma, status, url_oficial, updated_at", { count: "exact" })
      .eq("ativo", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({ data, page, limit, total: count ?? 0 });
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
    const rota = "POST /api/legislacao/sync";
    const begin = await beginIdempotency(admin, idempotencyKey, rota, body);
    if (begin.skip) return jsonResponse(begin.resposta);

    if (!validateCronAuth(req)) {
      const auth = req.headers.get("Authorization");
      if (!auth?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    const secret = Deno.env.get("SYNC_CRON_SECRET");
    const res = await fetch(`${serviceUrl}/functions/v1/sync-pncp-legislation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const resultBody = await res.json();
    await finishIdempotency(admin, idempotencyKey, rota, resultBody, res.status);
    return jsonResponse(resultBody, res.status);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});
