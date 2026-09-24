import {
  corsHeaders,
  jsonResponse as sharedJsonResponse,
  requireCronOrUserAuth,
} from "../_shared/http.ts";
import {
  assertWebRouterUrlAllowed,
  resolveWebRouterApiUrl,
  validateWebRouterPayload,
} from "../_shared/webrouter.ts";

type RouteRequest = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return sharedJsonResponse(body, status);
}

function getApiUrl() {
  const configuredUrl = Deno.env.get("WEBROUTER_API")?.trim();
  if (!configuredUrl) {
    throw new Error("Secret WEBROUTER_API não configurado");
  }
  const resolved = resolveWebRouterApiUrl(configuredUrl);
  assertWebRouterUrlAllowed(resolved);
  return resolved;
}

function getProviderHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const authHeader = Deno.env.get("WEBROUTER_AUTH_HEADER")?.trim();
  const authToken = Deno.env.get("WEBROUTER_AUTH_TOKEN")?.trim();

  if (authHeader && authToken) {
    headers[authHeader] = authToken;
  }

  return headers;
}

function normalizeRouteResponse(data: Record<string, unknown>) {
  const rotas = data?.rotas;
  const route = Array.isArray(rotas) ? rotas[0] as Record<string, unknown> : null;
  const path = (route?.path ?? {}) as Record<string, unknown>;
  const tollsInfo = (route?.informacaoPedagios ?? {}) as Record<string, unknown>;
  const tolls = (tollsInfo.result ?? {}) as Record<string, unknown>;
  const summary = (route?.resumo ?? {}) as Record<string, unknown>;
  const costs = (route?.custos ?? {}) as Record<string, unknown>;

  const numberOrNull = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  return {
    status: data?.status ?? route?.status ?? null,
    distanciaKm: numberOrNull(path.distanciaKM),
    distanciaMetros: numberOrNull(path.distanciaMetros),
    distanciaRodoviariaKm: numberOrNull(path.distanciaRodoviariaKM),
    distanciaRodoviariaMetros: numberOrNull(path.distanciaRodoviariaMetros),
    distanciaUrbanaKm: numberOrNull(path.distanciaUrbanaKM),
    duracaoSegundos: numberOrNull(path.tempoSegundos),
    tempoFormatado: path.tempoFormatado ?? null,
    pedagios: Array.isArray(tolls.pedagios) ? tolls.pedagios : [],
    quantidadePedagios:
      numberOrNull(summary.quantidadePedagios) ??
      (Array.isArray(tolls.pedagios) ? tolls.pedagios.length : 0),
    valorPedagio:
      numberOrNull(costs.pedagio) ?? numberOrNull(tolls.totalPedagio),
    valorPedagioTag:
      numberOrNull(costs.pedagioTag) ?? numberOrNull(tolls.totalPedagioTag),
    rota: route,
  };
}

console.info("calculate-distance-webrouter started");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Use o método POST." }, 405);
  }

  // SEC-EDGE-003: auth required; destination fixed by env allowlist (not client).
  const denied = await requireCronOrUserAuth(req);
  if (denied) return denied;

  try {
    const payload = (await req.json()) as RouteRequest;
    const validated = validateWebRouterPayload(payload);
    if (!validated.ok) {
      return jsonResponse({ error: validated.error }, 400);
    }

    const response = await fetch(getApiUrl(), {
      method: "POST",
      headers: getProviderHeaders(),
      body: JSON.stringify(validated.body),
      // SEC-EDGE-003: never follow redirects to a non-allowlisted host
      redirect: "error",
    });

    const rawText = await response.text();
    let providerData: unknown;

    try {
      providerData = rawText ? JSON.parse(rawText) : {};
    } catch {
      return jsonResponse(
        {
          error: "O WebRouter retornou uma resposta que não é JSON.",
          providerStatus: response.status,
          providerResponse: rawText.slice(0, 2000),
        },
        502,
      );
    }

    const normalized = normalizeRouteResponse(
      (providerData && typeof providerData === "object"
        ? providerData
        : {}) as Record<string, unknown>,
    );

    if (!response.ok) {
      return jsonResponse(
        {
          error: "O WebRouter recusou a consulta.",
          providerStatus: response.status,
          ...normalized,
          providerResponse: providerData,
        },
        502,
      );
    }

    if (normalized.status && normalized.status !== "SUCESSO") {
      return jsonResponse(
        {
          error: "O WebRouter não conseguiu calcular a rota.",
          ...normalized,
          providerResponse: providerData,
        },
        422,
      );
    }

    return jsonResponse({
      success: true,
      ...normalized,
      providerResponse: providerData,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error
          ? error.message
          : "Erro interno ao calcular a rota.",
      },
      500,
    );
  }
});
