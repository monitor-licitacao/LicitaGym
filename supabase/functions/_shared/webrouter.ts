/** Allowed WebRouter hosts — destination never comes from the client. */
export const WEBROUTER_ALLOWED_HOSTS = new Set([
  "way.webrouter.com.br",
  "way-hml.webrouter.com.br",
]);

/** Keys that must never appear in client payload (proxy/SSRF hints). */
export const WEBROUTER_FORBIDDEN_PAYLOAD_KEYS = new Set([
  "url",
  "uri",
  "host",
  "hostname",
  "endpoint",
  "proxy",
  "target",
  "baseUrl",
  "base_url",
  "webhook",
  "callback",
  "redirect",
]);

export function resolveWebRouterApiUrl(configuredUrl: string): string {
  const trimmed = configuredUrl.trim();
  if (!trimmed) {
    throw new Error("Secret WEBROUTER_API não configurado");
  }
  if (/\/router\/api\/calcular\/?$/i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }
  return `${trimmed.replace(/\/+$/, "")}/router/api/calcular`;
}

export function assertWebRouterUrlAllowed(apiUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(apiUrl);
  } catch {
    throw new Error("WEBROUTER_API inválido");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("WEBROUTER_API deve usar https");
  }
  if (!WEBROUTER_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("WEBROUTER_API host fora da allowlist");
  }
  if (!/\/router\/api\/calcular\/?$/i.test(parsed.pathname)) {
    throw new Error("WEBROUTER_API path deve terminar em /router/api/calcular");
  }
}

export function validateWebRouterPayload(
  payload: unknown,
): { ok: true; body: Record<string, unknown> } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "O corpo da requisição deve ser um JSON de objeto." };
  }
  const body = payload as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (WEBROUTER_FORBIDDEN_PAYLOAD_KEYS.has(key)) {
      return { ok: false, error: "Payload contém campos não permitidos." };
    }
  }
  const serialized = JSON.stringify(body);
  if (serialized.length > 32_768) {
    return { ok: false, error: "Payload excede o tamanho máximo permitido." };
  }
  return { ok: true, body };
}
