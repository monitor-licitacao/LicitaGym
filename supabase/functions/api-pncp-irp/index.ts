/// <reference path="../deno.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, parseQueryInt } from "../_shared/http.ts";

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

    const { data, error, count } = await client
      .from("irp_intencoes")
      .select("*", { count: "exact" })
      .eq("ativo", true)
      .eq("sync_habilitado", true)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return jsonResponse({ error: error.message }, 400);
    return jsonResponse({
      data,
      page,
      limit,
      total: count ?? 0,
      gate: "IRP sync disabled until CLA-34 list endpoint verified",
    });
  }

  if (req.method === "POST") {
    return jsonResponse({
      error: "IRP sync blocked",
      reason: "No global list endpoint in API Consulta (CLA-34)",
      hint: "Use sync-pncp-irp with IRP_SYNC_ENABLED=true after matrix verification",
    }, 423);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});
