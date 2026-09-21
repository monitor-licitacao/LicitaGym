import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ipcMain, BrowserWindow, app, shell } from "electron";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, timingSafeEqual } from "node:crypto";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}
function projectRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "../..");
}
function apply(vars, { override = false } = {}) {
  for (const [key, value] of Object.entries(vars)) {
    if (!override && process.env[key] !== void 0 && process.env[key] !== "") continue;
    process.env[key] = value;
  }
}
function loadMainEnv() {
  const root = projectRoot();
  apply(parseEnvFile(join(root, ".env")), { override: false });
  apply(parseEnvFile(join(root, "..", "supabase", ".env.local")), {
    override: false
  });
  apply(parseEnvFile(join(root, ".env.local")), { override: true });
  if (!process.env.ADMIN_LOGIN?.trim() && process.env.login?.trim()) {
    process.env.ADMIN_LOGIN = process.env.login.trim();
  }
  if (!process.env.ADMIN_SENHA?.trim() && process.env.senha?.trim()) {
    process.env.ADMIN_SENHA = process.env.senha.trim();
  }
  const keys = [
    "ADMIN_LOGIN",
    "ADMIN_SENHA",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SYNC_CRON_SECRET"
  ];
  const present = keys.filter((k) => Boolean(process.env[k]?.trim()));
  console.info(`[env] root=${root} loaded=[${present.join(", ") || "none"}]`);
  if (process.env.ADMIN_LOGIN?.trim()) {
    console.info(
      `[env] ADMIN_LOGIN len=${process.env.ADMIN_LOGIN.trim().length} ADMIN_SENHA len=${(process.env.ADMIN_SENHA ?? "").trim().length}`
    );
  }
}
loadMainEnv();
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY);
const verifier = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;
const admin = configured ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
}) : null;
class ForbiddenError extends Error {
  constructor(message = "Acesso restrito a administradores") {
    super(message);
    this.name = "ForbiddenError";
  }
}
async function assertAdmin(accessToken) {
  if (!verifier || !admin) {
    throw new ForbiddenError("Supabase não configurado no main (.env)");
  }
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new ForbiddenError("Token ausente");
  }
  const { data, error } = await verifier.auth.getUser(accessToken);
  if (error || !data.user) throw new ForbiddenError("Sessão inválida");
  if (data.user.app_metadata?.role !== "admin") throw new ForbiddenError();
  return data.user.id;
}
function adminHandler(fn) {
  return async (_event, accessToken) => {
    const userId = await assertAdmin(accessToken);
    return fn(userId);
  };
}
function registerAdminIpc() {
  if (!configured) {
    console.warn("[admin-ipc] SUPABASE_* ausente — handlers admin não registrados");
    return;
  }
  ipcMain.handle(
    "admin:get-stats",
    adminHandler(async () => {
      const [usuarios, pendentes] = await Promise.all([
        admin.from("profiles").select("*", { count: "exact", head: true }),
        admin.from("sync_jobs").select("*", { count: "exact", head: true }).eq("status", "pending")
      ]);
      if (usuarios.error) throw usuarios.error;
      if (pendentes.error) throw pendentes.error;
      return {
        usuarios: usuarios.count ?? 0,
        sincronizacoesPendentes: pendentes.count ?? 0
      };
    })
  );
  ipcMain.handle(
    "admin:list-usuarios",
    adminHandler(async () => {
      const { data, error } = await admin.from("profiles").select("id, email, created_at").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    })
  );
}
const defaultConfig = () => ({
  resend: {
    enabled: false,
    apiKeyConfigured: false,
    from: "Kuib Harness <alerts@licitagym.local>",
    toAdmin: ""
  },
  whatsapp: {
    enabled: false,
    provider: null,
    evolutionBaseUrl: "http://127.0.0.1:8080",
    evolutionInstance: "kuib",
    wppconnectBaseUrl: "http://127.0.0.1:21465"
  },
  realtime: {
    enabled: true
  }
});
function storePath$1() {
  const dir = join(app.getPath("userData"), "kuib-harness");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "alerts.json");
}
function readStore$1() {
  const path = storePath$1();
  if (!existsSync(path)) {
    return { config: defaultConfig(), items: [], secrets: {} };
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    return {
      config: { ...defaultConfig(), ...raw.config },
      items: raw.items ?? [],
      secrets: raw.secrets ?? {}
    };
  } catch {
    return { config: defaultConfig(), items: [], secrets: {} };
  }
}
function writeStore$1(store) {
  writeFileSync(storePath$1(), JSON.stringify(store, null, 2), "utf8");
}
function publicConfig(store) {
  return {
    ...store.config,
    resend: {
      ...store.config.resend,
      apiKeyConfigured: Boolean(store.secrets.resendApiKey)
    }
  };
}
function broadcast$1(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}
async function sendResendEmail(store, title, body) {
  const key = store.secrets.resendApiKey || process.env.RESEND_API_KEY;
  if (!store.config.resend.enabled) {
    return { ok: false, detail: "Resend desabilitado" };
  }
  if (!key) return { ok: false, detail: "RESEND_API_KEY ausente" };
  if (!store.config.resend.toAdmin) {
    return { ok: false, detail: "E-mail admin não configurado" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: store.config.resend.from,
        to: [store.config.resend.toAdmin],
        subject: title,
        text: body
      })
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, detail: `Resend ${res.status}: ${text}` };
    }
    return { ok: true, detail: "enviado" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "falha Resend" };
  }
}
async function sendEvolution(store, body) {
  if (!store.config.whatsapp.enabled || store.config.whatsapp.provider !== "evolution") {
    return { ok: false, detail: "Evolution desabilitado" };
  }
  const key = store.secrets.evolutionApiKey;
  if (!key) return { ok: false, detail: "Evolution API key ausente" };
  const url = `${store.config.whatsapp.evolutionBaseUrl.replace(/\/$/, "")}/message/sendText/${store.config.whatsapp.evolutionInstance}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key
      },
      body: JSON.stringify({
        number: process.env.WHATSAPP_ADMIN_NUMBER ?? "",
        text: body
      })
    });
    if (!res.ok) return { ok: false, detail: `Evolution ${res.status}` };
    return { ok: true, detail: "enviado" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "falha Evolution" };
  }
}
async function sendWppConnect(store, body) {
  if (!store.config.whatsapp.enabled || store.config.whatsapp.provider !== "wppconnect") {
    return { ok: false, detail: "WPPConnect desabilitado" };
  }
  const token = store.secrets.wppconnectToken;
  if (!token) return { ok: false, detail: "WPPConnect token ausente" };
  const url = `${store.config.whatsapp.wppconnectBaseUrl.replace(/\/$/, "")}/api/send-message`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        phone: process.env.WHATSAPP_ADMIN_NUMBER ?? "",
        message: body
      })
    });
    if (!res.ok) return { ok: false, detail: `WPPConnect ${res.status}` };
    return { ok: true, detail: "enviado" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "falha WPPConnect" };
  }
}
async function notifyTaskComplete(payload) {
  const store = readStore$1();
  const item = {
    id: randomUUID(),
    title: payload.title,
    body: payload.body,
    channel: "bell",
    cardId: payload.cardId,
    specName: payload.specName,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    read: false
  };
  store.items.unshift(item);
  store.items = store.items.slice(0, 100);
  writeStore$1(store);
  broadcast$1("alerts:push", item);
  const email = await sendResendEmail(store, payload.title, payload.body);
  if (email.ok) {
    const emailItem = { ...item, id: randomUUID(), channel: "email" };
    store.items.unshift(emailItem);
    writeStore$1(store);
    broadcast$1("alerts:push", emailItem);
  }
  const wa = store.config.whatsapp.provider === "wppconnect" ? await sendWppConnect(store, `${payload.title}
${payload.body}`) : await sendEvolution(store, `${payload.title}
${payload.body}`);
  if (wa.ok) {
    const waItem = { ...item, id: randomUUID(), channel: "whatsapp" };
    store.items.unshift(waItem);
    writeStore$1(store);
    broadcast$1("alerts:push", waItem);
  }
  return item;
}
function registerAlertsIpc() {
  ipcMain.handle("alerts:list", () => {
    return readStore$1().items;
  });
  ipcMain.handle("alerts:config:get", () => publicConfig(readStore$1()));
  ipcMain.handle(
    "alerts:config:set",
    (_event, patch) => {
      const store = readStore$1();
      if (patch.resend) store.config.resend = { ...store.config.resend, ...patch.resend };
      if (patch.whatsapp) {
        store.config.whatsapp = { ...store.config.whatsapp, ...patch.whatsapp };
      }
      if (patch.realtime) {
        store.config.realtime = { ...store.config.realtime, ...patch.realtime };
      }
      if (patch.resendApiKey?.trim()) store.secrets.resendApiKey = patch.resendApiKey.trim();
      if (patch.evolutionApiKey?.trim()) {
        store.secrets.evolutionApiKey = patch.evolutionApiKey.trim();
      }
      if (patch.wppconnectToken?.trim()) {
        store.secrets.wppconnectToken = patch.wppconnectToken.trim();
      }
      writeStore$1(store);
      return publicConfig(store);
    }
  );
  ipcMain.handle("alerts:mark-read", (_event, id) => {
    const store = readStore$1();
    const item = store.items.find((i) => i.id === id);
    if (item) item.read = true;
    writeStore$1(store);
    return item;
  });
  ipcMain.handle("alerts:notify-complete", async (_event, payload) => {
    return notifyTaskComplete(payload);
  });
  ipcMain.handle(
    "alerts:card-moved",
    async (_event, payload) => {
      const store = readStore$1();
      const event = {
        type: "card_moved",
        ...payload,
        at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (store.config.realtime.enabled) {
        broadcast$1("realtime:card-moved", event);
      }
      if (payload.to === "done") {
        await notifyTaskComplete({
          title: `Spec concluída: ${payload.specName ?? payload.title}`,
          body: `Card "${payload.title}" movido para Concluído${payload.agentName ? ` · agente ${payload.agentName}` : ""}.`,
          cardId: payload.cardId,
          specName: payload.specName
        });
      }
      return event;
    }
  );
}
const alerts = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  notifyTaskComplete,
  registerAlertsIpc
}, Symbol.toStringTag, { value: "Module" }));
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
const sessions = /* @__PURE__ */ new Map();
function expectedLogin() {
  return (process.env.ADMIN_LOGIN ?? "").trim();
}
function expectedSenha() {
  return (process.env.ADMIN_SENHA ?? "").trim();
}
function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
function purgeExpired() {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (s.expiresAt <= now) sessions.delete(token);
  }
}
function registerAuthIpc() {
  const loginConfigured = Boolean(expectedLogin() && expectedSenha());
  if (!loginConfigured) {
    console.warn("[auth-ipc] ADMIN_LOGIN/ADMIN_SENHA ausentes — login local desabilitado");
  } else {
    console.info("[auth-ipc] login local admin habilitado");
  }
  ipcMain.handle("auth:status", () => ({
    localAdminConfigured: loginConfigured,
    /** Login esperado (desktop local) — evita tipar email/usuário errado. */
    configuredLogin: loginConfigured ? expectedLogin() : null,
    configuredLoginLen: loginConfigured ? expectedLogin().length : 0,
    configuredSenhaLen: loginConfigured ? expectedSenha().length : 0
  }));
  ipcMain.handle(
    "auth:login",
    (_event, login, senha) => {
      if (!loginConfigured) {
        throw new Error("Admin local não configurado (.env.local)");
      }
      if (typeof login !== "string" || typeof senha !== "string") {
        throw new Error("Credenciais inválidas");
      }
      const gotLogin = login.trim();
      const gotSenha = senha.trim();
      const wantLogin = expectedLogin();
      const wantSenha = expectedSenha();
      const okLogin = safeEqual(gotLogin, wantLogin) || safeEqual(gotLogin.toLowerCase(), wantLogin.toLowerCase());
      const okSenha = safeEqual(gotSenha, wantSenha);
      if (!okLogin || !okSenha) {
        console.warn(
          `[auth-ipc] login falhou okLogin=${okLogin} okSenha=${okSenha} gotLoginLen=${gotLogin.length} wantLoginLen=${wantLogin.length} gotSenhaLen=${gotSenha.length} wantSenhaLen=${wantSenha.length}`
        );
        throw new Error(
          `Login ou senha incorretos (login ${gotLogin.length}/${wantLogin.length} chars, senha ${gotSenha.length}/${wantSenha.length} chars). Use ADMIN_LOGIN/ADMIN_SENHA de Kuib-Harness/.env.local`
        );
      }
      purgeExpired();
      const token = randomUUID();
      const session = {
        token,
        login: login.trim(),
        role: "admin",
        expiresAt: Date.now() + SESSION_TTL_MS
      };
      sessions.set(token, session);
      return {
        token: session.token,
        login: session.login,
        role: session.role,
        expiresAt: session.expiresAt
      };
    }
  );
  ipcMain.handle("auth:validate", (_event, token) => {
    if (typeof token !== "string" || !token) return null;
    purgeExpired();
    const session = sessions.get(token);
    if (!session) return null;
    return {
      token: session.token,
      login: session.login,
      role: session.role,
      expiresAt: session.expiresAt
    };
  });
  ipcMain.handle("auth:logout", (_event, token) => {
    if (typeof token === "string") sessions.delete(token);
    return true;
  });
}
const PROVIDER_CATALOG = {
  anthropic: {
    slug: "anthropic",
    name: "Anthropic",
    authModes: ["api_key", "oauth_plan"],
    models: [
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", kind: "cloud", traditional: true },
      { id: "claude-opus-4-20250514", label: "Claude Opus 4", kind: "cloud", traditional: true },
      { id: "claude-haiku-3-5-20241022", label: "Claude Haiku 3.5", kind: "cloud", traditional: true }
    ]
  },
  openai: {
    slug: "openai",
    name: "OpenAI",
    authModes: ["api_key", "oauth_plan"],
    defaultBaseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1", kind: "cloud", traditional: true },
      { id: "gpt-4o", label: "GPT-4o", kind: "cloud", traditional: true },
      { id: "o3-mini", label: "o3-mini", kind: "cloud", traditional: true },
      { id: "gpt-4o-mini", label: "GPT-4o mini", kind: "cloud", traditional: true }
    ]
  },
  gemini: {
    slug: "gemini",
    name: "Google Gemini",
    authModes: ["api_key", "oauth_plan"],
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", kind: "cloud", traditional: true },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", kind: "cloud", traditional: true },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", kind: "cloud", traditional: true }
    ]
  },
  ollama: {
    slug: "ollama",
    name: "Ollama (local)",
    authModes: ["url_key"],
    defaultBaseUrl: "http://127.0.0.1:11434",
    models: [
      { id: "llama3.2", label: "Llama 3.2", kind: "local", traditional: true },
      { id: "mistral", label: "Mistral", kind: "local", traditional: true },
      { id: "qwen2.5", label: "Qwen 2.5", kind: "local", traditional: true },
      { id: "codellama", label: "Code Llama", kind: "local", traditional: true },
      { id: "deepseek-r1", label: "DeepSeek R1", kind: "local", traditional: true }
    ]
  },
  opencode: {
    slug: "opencode",
    name: "OpenCode / OpenAI-compat",
    authModes: ["url_key"],
    defaultBaseUrl: "http://127.0.0.1:4096/v1",
    models: [
      { id: "default", label: "Modelo padrão do servidor", kind: "cloud", traditional: true },
      { id: "gpt-4o", label: "GPT-4o (compat)", kind: "cloud" },
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet (compat)", kind: "cloud" }
    ]
  }
};
function listProviderDefinitions() {
  return Object.values(PROVIDER_CATALOG);
}
function getProviderDefinition(slug) {
  const def = PROVIDER_CATALOG[slug];
  if (!def) throw new Error(`Provider desconhecido: ${slug}`);
  return def;
}
function assertModelAllowed(slug, modelId) {
  const def = getProviderDefinition(slug);
  const model = def.models.find((m) => m.id === modelId);
  if (!model) {
    throw new Error(`Modelo "${modelId}" não permitido para provider "${slug}"`);
  }
  return model;
}
function maskSecret(value) {
  if (!value) return void 0;
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 3)}••••${value.slice(-4)}`;
}
function storePath() {
  const dir = join(app.getPath("userData"), "kuib-harness");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "providers.json");
}
function readStore() {
  const path = storePath();
  if (!existsSync(path)) return { connectors: [] };
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { connectors: [] };
  }
}
function writeStore(store) {
  writeFileSync(storePath(), JSON.stringify(store, null, 2), "utf8");
}
function toPublic(c) {
  return {
    id: c.id,
    slug: c.slug,
    label: c.label,
    authMode: c.authMode,
    baseUrl: c.baseUrl,
    apiKeyMasked: maskSecret(c.apiKey),
    hasApiKey: Boolean(c.apiKey && c.apiKey.length > 0),
    modelId: c.modelId,
    enabled: c.enabled,
    updatedAt: c.updatedAt
  };
}
function registerProviderIpc() {
  ipcMain.handle("providers:catalog", () => listProviderDefinitions());
  ipcMain.handle("providers:list", () => {
    return readStore().connectors.map(toPublic);
  });
  ipcMain.handle(
    "providers:upsert",
    (_event, input) => {
      assertModelAllowed(input.slug, input.modelId);
      const store = readStore();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const existingIdx = input.id ? store.connectors.findIndex((c) => c.id === input.id) : -1;
      if (existingIdx >= 0) {
        const prev = store.connectors[existingIdx];
        const next = {
          ...prev,
          slug: input.slug,
          label: input.label,
          authMode: input.authMode,
          baseUrl: input.baseUrl,
          modelId: input.modelId,
          enabled: input.enabled,
          updatedAt: now,
          apiKey: input.apiKey?.trim() ? input.apiKey.trim() : prev.apiKey
        };
        store.connectors[existingIdx] = next;
        writeStore(store);
        return toPublic(next);
      }
      const created = {
        id: randomUUID(),
        slug: input.slug,
        label: input.label,
        authMode: input.authMode,
        baseUrl: input.baseUrl,
        apiKey: input.apiKey?.trim() || void 0,
        modelId: input.modelId,
        enabled: input.enabled,
        updatedAt: now
      };
      store.connectors.push(created);
      writeStore(store);
      return toPublic(created);
    }
  );
  ipcMain.handle("providers:delete", (_event, id) => {
    const store = readStore();
    store.connectors = store.connectors.filter((c) => c.id !== id);
    writeStore(store);
  });
  ipcMain.handle(
    "providers:resolve",
    (_event, slug, modelId) => {
      const store = readStore();
      const connector = store.connectors.find((c) => c.slug === slug && c.enabled);
      if (!connector) throw new Error(`Nenhum conector ativo para "${slug}"`);
      const resolvedModel = modelId ?? connector.modelId;
      assertModelAllowed(slug, resolvedModel);
      return {
        id: connector.id,
        slug: connector.slug,
        modelId: resolvedModel,
        baseUrl: connector.baseUrl,
        hasApiKey: Boolean(connector.apiKey)
        // apiKey nunca sobe para o renderer neste canal público;
        // canais internos de agente no main leem do store diretamente.
      };
    }
  );
}
const SYNC_INVENTORY = [
  {
    slug: "sync-compras-catmat",
    functionName: "sync-compras-catmat",
    source: "Compras.gov Dados Abertos",
    tables: "catmat_*, catalogo_itens",
    invokeScript: "scripts/invoke-sync-compras-catmat.ps1",
    gateNotes: "classes 78/7830 + 72/7220; características em lotes separados",
    cronKind: "proposed",
    cronExpression: "0 4 * * 1",
    cronJobName: "compras-catmat-7830",
    defaultBody: {
      codigo_grupo: 78,
      codigo_classe: 7830,
      incluir_caracteristicas: false,
      max_paginas: 500
    },
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 1,
    requiresApproval: false
  },
  {
    slug: "sync-compras-catmat-7220",
    functionName: "sync-compras-catmat",
    source: "Compras.gov Dados Abertos",
    tables: "catmat_* (7220)",
    invokeScript: "scripts/invoke-sync-compras-catmat.ps1",
    gateNotes: "piso 72/7220; SkipCaracteristicas por padrão",
    cronKind: "proposed",
    cronExpression: "30 4 * * 1",
    cronJobName: "compras-catmat-7220",
    defaultBody: {
      codigo_grupo: 72,
      codigo_classe: 7220,
      incluir_caracteristicas: false,
      max_paginas: 500
    },
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 1,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-pca",
    functionName: "sync-pncp-pca",
    source: "PNCP PCA",
    tables: "pca_*, private.pncp_period_anchor",
    invokeScript: "scripts/invoke-sync-pca.ps1",
    gateNotes: "probe mensal vs carga; somente_verificacao / forcar / verificar_periodo",
    cronKind: "official_008",
    cronExpression: "0 2 1 * *",
    cronJobName: "pncp-pca-probe-mensal",
    defaultBody: { somente_verificacao: true, ano: (/* @__PURE__ */ new Date()).getUTCFullYear() },
    observeTimeoutMs: 30 * 60 * 1e3,
    pipelineOrder: 2,
    requiresApproval: true
  },
  {
    slug: "link-catmat-pca",
    functionName: "link-catmat-pca",
    source: "interno",
    tables: "catalogo_ponte, pca_item_pdm",
    invokeScript: "scripts/invoke-sync-licitagym-scope.ps1",
    gateNotes: "depois de CATMAT + PCA",
    cronKind: "proposed",
    cronExpression: "0 6 * * 1",
    cronJobName: "link-catmat-pca",
    defaultBody: {},
    observeTimeoutMs: 15 * 60 * 1e3,
    pipelineOrder: 3,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-orgaos",
    functionName: "sync-pncp-orgaos",
    source: "PNCP integração / bootstrap PCA",
    tables: "entidades, orgaos, unidades",
    invokeScript: "scripts/invoke-sync-orgaos.ps1",
    gateNotes: "preferir bootstrap_pca se integração 5xx",
    cronKind: "proposed",
    cronExpression: "0 5 * * *",
    cronJobName: "pncp-orgaos-bootstrap",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 4,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-catalogo",
    functionName: "sync-pncp-catalogo",
    source: "PNCP integração",
    tables: "catálogo PNCP / ponte",
    invokeScript: null,
    gateNotes: "requer token integração",
    cronKind: "proposed",
    cronExpression: "30 5 * * *",
    cronJobName: "pncp-catalogo",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: true
  },
  {
    slug: "sync-pncp-legislation",
    functionName: "sync-pncp-legislation",
    source: "scrape / PDF oficiais",
    tables: "legislação + Storage pncp-legislation",
    invokeScript: "scripts/invoke-sync-legislation.ps1",
    gateNotes: "só PDF; HTML→erro_importacao",
    cronKind: "official_008",
    cronExpression: "0 */6 * * *",
    cronJobName: "pncp-legislation-check",
    defaultBody: {},
    observeTimeoutMs: 15 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-contratacoes-editais",
    functionName: "sync-pncp-contratacoes-editais",
    source: "PNCP publicacao",
    tables: "editais / eventos",
    invokeScript: "scripts/invoke-sync-editais.ps1",
    gateNotes: "escopo catalogo + gate objeto fitness",
    cronKind: "official_008",
    cronExpression: "0 */6 * * *",
    cronJobName: "pncp-contratacoes-editais",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: 5,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-contratacoes-atas",
    functionName: "sync-pncp-contratacoes-atas",
    source: "PNCP",
    tables: "atas",
    invokeScript: null,
    gateNotes: "cron offset +15 min",
    cronKind: "official_008",
    cronExpression: "15 */6 * * *",
    cronJobName: "pncp-contratacoes-atas",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-contratacoes-contratos",
    functionName: "sync-pncp-contratacoes-contratos",
    source: "PNCP",
    tables: "contratos",
    invokeScript: null,
    gateNotes: "cron offset +30 min",
    cronKind: "official_008",
    cronExpression: "30 */6 * * *",
    cronJobName: "pncp-contratacoes-contratos",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: false
  },
  {
    slug: "sync-pncp-irp",
    functionName: "sync-pncp-irp",
    source: "PNCP IRP",
    tables: "IRP",
    invokeScript: null,
    gateNotes: "só se IRP_SYNC_ENABLED=true",
    cronKind: "proposed",
    cronExpression: null,
    cronJobName: "pncp-irp",
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: true
  },
  {
    slug: "import-catmat-curadoria",
    functionName: "import-catmat-curadoria",
    source: "seed JSON",
    tables: "curadoria CATMAT",
    invokeScript: "scripts/import-catmat-curadoria.ps1",
    gateNotes: "manual / raro",
    cronKind: "manual",
    cronExpression: null,
    cronJobName: null,
    defaultBody: {},
    observeTimeoutMs: 10 * 60 * 1e3,
    pipelineOrder: null,
    requiresApproval: true
  }
];
const SYNC_SETUP_CARDS = [
  {
    id: "setup-vault",
    title: "Habilitar Vault secrets cron",
    detail: "sync_cron_secret + URLs sync_pncp_*_url no Vault antes de descomentar 008."
  },
  {
    id: "setup-cron-dryrun",
    title: "Unschedule dry-run SELECT cron.job",
    detail: "Validar jobs existentes sem ativar carga pesada."
  },
  {
    id: "setup-realtime-a",
    title: "Realtime Opção A — espelho sync_run_events",
    detail: "Após MVP polling (Opção C). Trigger private.pncp_sync_run → public.sync_run_events."
  },
  {
    id: "setup-smoke",
    title: "Smoke: 1 invoke por function + card done",
    detail: "Começar por sync-compras-catmat SkipCaracteristicas."
  }
];
const PIPELINE_SCOPE_ORDER = [
  "sync-compras-catmat",
  "sync-pncp-pca",
  "link-catmat-pca",
  "sync-pncp-orgaos",
  "sync-pncp-contratacoes-editais"
];
function toSyncRunEvent(row) {
  return {
    type: "sync_run_updated",
    sync_id: row.id,
    resource_type: row.resource_type,
    status: row.status,
    totals: {
      recebidos: row.total_recebidos ?? 0,
      novos: row.total_novos ?? 0,
      alterados: row.total_atualizados ?? 0,
      inalterados: row.total_inalterados ?? 0,
      erros: row.total_erros ?? 0
    },
    erro_principal: row.erro_principal,
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function supabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
function functionsBaseUrl() {
  const explicit = process.env.SUPABASE_FUNCTIONS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const url = process.env.SUPABASE_URL?.trim();
  if (!url) throw new Error("SUPABASE_URL ausente");
  return `${url.replace(/\/$/, "")}/functions/v1`;
}
function cronSecret() {
  const secret = process.env.SYNC_CRON_SECRET?.trim();
  if (!secret) throw new Error("SYNC_CRON_SECRET ausente (.env.local)");
  return secret;
}
function findInventory(slug) {
  const item = SYNC_INVENTORY.find((s) => s.slug === slug);
  if (!item) throw new Error(`Sync desconhecido no inventário: ${slug}`);
  return item;
}
function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}
const watchers = /* @__PURE__ */ new Map();
async function fetchSyncRun(syncId) {
  const client = supabaseAdmin();
  if (!client) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente — polling indisponível");
  const { data, error } = await client.schema("private").from("pncp_sync_run").select(
    "id, resource_type, status, total_recebidos, total_novos, total_atualizados, total_inalterados, total_erros, erro_principal, iniciada_em, finalizada_em, lock_key"
  ).eq("id", syncId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}
function stopWatch(syncId) {
  const w = watchers.get(syncId);
  if (!w) return;
  clearInterval(w.timer);
  watchers.delete(syncId);
}
function startWatch(syncId, slug, timeoutMs) {
  stopWatch(syncId);
  const startedAt = Date.now();
  const timer = setInterval(() => {
    void (async () => {
      try {
        const row = await fetchSyncRun(syncId);
        if (!row) {
          broadcast("syncs:run-updated", {
            type: "sync_run_updated",
            sync_id: syncId,
            resource_type: slug,
            status: "falhou",
            totals: { recebidos: 0, novos: 0, alterados: 0, inalterados: 0, erros: 0 },
            erro_principal: "pncp_sync_run não encontrado",
            at: (/* @__PURE__ */ new Date()).toISOString()
          });
          stopWatch(syncId);
          return;
        }
        const event = toSyncRunEvent(row);
        broadcast("syncs:run-updated", event);
        const terminal = ["concluida", "concluida_com_erros", "falhou", "cancelada"];
        if (terminal.includes(row.status)) {
          stopWatch(syncId);
          if (row.status === "concluida" || row.status === "falhou" || row.status === "concluida_com_erros") {
            const { notifyTaskComplete: notifyTaskComplete2 } = await Promise.resolve().then(() => alerts);
            await notifyTaskComplete2({
              title: `Sync ${row.status}: ${slug}`,
              body: [
                `resource_type=${row.resource_type}`,
                `sync_id=${row.id}`,
                `novos=${row.total_novos} alterados=${row.total_atualizados} erros=${row.total_erros}`,
                row.erro_principal ? `erro=${row.erro_principal}` : null
              ].filter(Boolean).join("\n"),
              cardId: syncId,
              specName: "ini-04-spec-syncs"
            });
          }
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          broadcast("syncs:run-updated", {
            ...event,
            status: "falhou",
            erro_principal: `timeout observação (>${Math.round(timeoutMs / 6e4)} min) — status oficial ainda="${row.status}"; não inventar conclusão`
          });
          stopWatch(syncId);
        }
      } catch (e) {
        broadcast("syncs:run-updated", {
          type: "sync_run_updated",
          sync_id: syncId,
          resource_type: slug,
          status: "executando",
          totals: { recebidos: 0, novos: 0, alterados: 0, inalterados: 0, erros: 0 },
          erro_principal: e instanceof Error ? e.message : "falha no poll",
          at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    })();
  }, 5e3);
  watchers.set(syncId, { syncId, slug, timer, startedAt, timeoutMs });
}
function registerSyncsIpc() {
  ipcMain.handle("syncs:inventory", () => ({
    items: SYNC_INVENTORY,
    setupCards: SYNC_SETUP_CARDS,
    pipelineOrder: PIPELINE_SCOPE_ORDER
  }));
  ipcMain.handle("syncs:get-run", async (_e, syncId) => {
    if (typeof syncId !== "string" || !syncId) throw new Error("sync_id obrigatório");
    return fetchSyncRun(syncId);
  });
  ipcMain.handle(
    "syncs:invoke",
    async (_e, payload) => {
      const item = findInventory(payload.slug);
      if (item.requiresApproval && process.env.ALLOW_HEAVY_SYNC !== "true") ;
      const secret = cronSecret();
      const url = `${functionsBaseUrl()}/${item.functionName}`;
      const body = { ...item.defaultBody, ...payload.body ?? {} };
      const client = supabaseAdmin();
      if (client) {
        const { data: running } = await client.schema("private").from("pncp_sync_run").select(
          "id, status, resource_type, total_recebidos, total_novos, total_atualizados, total_inalterados, total_erros, erro_principal, iniciada_em, finalizada_em, lock_key"
        ).eq("status", "executando").order("iniciada_em", { ascending: false }).limit(20);
        const hit = running?.find((r) => {
          const rt = (r.resource_type || "").toLowerCase();
          const slug = item.slug.toLowerCase();
          const fn = item.functionName.toLowerCase();
          return rt.includes(fn.replace("sync-", "")) || slug.includes(rt) || rt.includes(slug.replace("sync-", ""));
        });
        if (hit) {
          if (payload.watch !== false) startWatch(hit.id, item.slug, item.observeTimeoutMs);
          return {
            ok: true,
            slug: item.slug,
            functionName: item.functionName,
            sync_id: hit.id,
            status: hit.status,
            alreadyRunning: true,
            raw: { sync_id: hit.id, status: hit.status }
          };
        }
      }
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Resposta não-JSON (${res.status}): ${text.slice(0, 400)}`);
      }
      if (!res.ok || json.error) {
        const msg = typeof json.error === "string" ? json.error : typeof json.message === "string" ? json.message : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const syncId = typeof json.sync_id === "string" ? json.sync_id : typeof json.run_id === "string" ? json.run_id : null;
      let status = typeof json.status === "string" ? json.status : syncId ? "executando" : "desconhecido";
      if (syncId && payload.watch !== false) {
        startWatch(syncId, item.slug, item.observeTimeoutMs);
        const row = await fetchSyncRun(syncId).catch(() => null);
        if (row?.status) status = row.status;
      }
      return {
        ok: true,
        slug: item.slug,
        functionName: item.functionName,
        sync_id: syncId,
        status,
        alreadyRunning: false,
        raw: json
      };
    }
  );
  ipcMain.handle("syncs:watch", (_e, syncId, slug, timeoutMs) => {
    if (typeof syncId !== "string") throw new Error("sync_id inválido");
    const item = SYNC_INVENTORY.find((s) => s.slug === slug);
    startWatch(syncId, slug || "unknown", timeoutMs ?? item?.observeTimeoutMs ?? 20 * 60 * 1e3);
    return { watching: true, sync_id: syncId };
  });
  ipcMain.handle("syncs:unwatch", (_e, syncId) => {
    stopWatch(syncId);
    return { watching: false };
  });
  ipcMain.handle("syncs:list-active", async () => {
    const client = supabaseAdmin();
    if (!client) return [];
    const { data, error } = await client.schema("private").from("pncp_sync_run").select(
      "id, resource_type, status, total_recebidos, total_novos, total_atualizados, total_inalterados, total_erros, erro_principal, iniciada_em, finalizada_em, lock_key"
    ).in("status", ["pendente", "executando"]).order("iniciada_em", { ascending: false }).limit(50);
    if (error) throw error;
    return data ?? [];
  });
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.on("ready-to-show", () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
app.setPath("userData", join(app.getPath("appData"), "kuib-harness"));
app.whenReady().then(() => {
  registerAuthIpc();
  registerAdminIpc();
  registerProviderIpc();
  registerAlertsIpc();
  registerSyncsIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
