import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type {
  AlertAutomationConfig,
  AlertItem,
  CardMovedPayload,
  NotifyCompletePayload,
} from '../../shared/alert-types'

interface AlertStore {
  config: AlertAutomationConfig
  items: AlertItem[]
  secrets: {
    resendApiKey?: string
    evolutionApiKey?: string
    wppconnectToken?: string
  }
}

type AlertConfigPatch = Partial<{
  resend: Partial<AlertAutomationConfig['resend']>
  whatsapp: Partial<AlertAutomationConfig['whatsapp']>
  realtime: Partial<AlertAutomationConfig['realtime']>
  resendApiKey: string
  evolutionApiKey: string
  wppconnectToken: string
}>

const defaultConfig = (): AlertAutomationConfig => ({
  resend: {
    enabled: false,
    apiKeyConfigured: false,
    from: 'Kuib Harness <alerts@licitagym.local>',
    toAdmin: '',
  },
  whatsapp: {
    enabled: false,
    provider: null,
    evolutionBaseUrl: 'http://127.0.0.1:8080',
    evolutionInstance: 'kuib',
    wppconnectBaseUrl: 'http://127.0.0.1:21465',
  },
  realtime: {
    enabled: true,
  },
})

function storePath(): string {
  const dir = join(app.getPath('userData'), 'kuib-harness')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'alerts.json')
}

function readStore(): AlertStore {
  const path = storePath()
  if (!existsSync(path)) {
    return { config: defaultConfig(), items: [], secrets: {} }
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<AlertStore>
    return {
      config: { ...defaultConfig(), ...raw.config },
      items: raw.items ?? [],
      secrets: raw.secrets ?? {},
    }
  } catch {
    return { config: defaultConfig(), items: [], secrets: {} }
  }
}

function writeStore(store: AlertStore): void {
  writeFileSync(storePath(), JSON.stringify(store, null, 2), 'utf8')
}

function publicConfig(store: AlertStore): AlertAutomationConfig {
  return {
    ...store.config,
    resend: {
      ...store.config.resend,
      apiKeyConfigured: Boolean(store.secrets.resendApiKey),
    },
  }
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

async function sendResendEmail(
  store: AlertStore,
  title: string,
  body: string,
): Promise<{ ok: boolean; detail: string }> {
  const key = store.secrets.resendApiKey || process.env.RESEND_API_KEY
  if (!store.config.resend.enabled) return { ok: false, detail: 'Resend desabilitado' }
  if (!key) return { ok: false, detail: 'RESEND_API_KEY ausente' }
  if (!store.config.resend.toAdmin) return { ok: false, detail: 'E-mail admin não configurado' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: store.config.resend.from,
        to: [store.config.resend.toAdmin],
        subject: title,
        text: body,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, detail: `Resend ${res.status}: ${text}` }
    }
    return { ok: true, detail: 'enviado' }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'falha Resend' }
  }
}

async function sendEvolution(
  store: AlertStore,
  body: string,
): Promise<{ ok: boolean; detail: string }> {
  if (!store.config.whatsapp.enabled || store.config.whatsapp.provider !== 'evolution') {
    return { ok: false, detail: 'Evolution desabilitado' }
  }
  const key = store.secrets.evolutionApiKey
  if (!key) return { ok: false, detail: 'Evolution API key ausente' }
  const url = `${store.config.whatsapp.evolutionBaseUrl.replace(/\/$/, '')}/message/sendText/${store.config.whatsapp.evolutionInstance}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
      },
      body: JSON.stringify({
        number: process.env.WHATSAPP_ADMIN_NUMBER ?? '',
        text: body,
      }),
    })
    if (!res.ok) return { ok: false, detail: `Evolution ${res.status}` }
    return { ok: true, detail: 'enviado' }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'falha Evolution' }
  }
}

async function sendWppConnect(
  store: AlertStore,
  body: string,
): Promise<{ ok: boolean; detail: string }> {
  if (!store.config.whatsapp.enabled || store.config.whatsapp.provider !== 'wppconnect') {
    return { ok: false, detail: 'WPPConnect desabilitado' }
  }
  const token = store.secrets.wppconnectToken
  if (!token) return { ok: false, detail: 'WPPConnect token ausente' }
  const url = `${store.config.whatsapp.wppconnectBaseUrl.replace(/\/$/, '')}/api/send-message`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone: process.env.WHATSAPP_ADMIN_NUMBER ?? '',
        message: body,
      }),
    })
    if (!res.ok) return { ok: false, detail: `WPPConnect ${res.status}` }
    return { ok: true, detail: 'enviado' }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : 'falha WPPConnect' }
  }
}

export async function notifyTaskComplete(payload: NotifyCompletePayload): Promise<AlertItem> {
  const store = readStore()
  const item: AlertItem = {
    id: randomUUID(),
    title: payload.title,
    body: payload.body,
    channel: 'bell',
    cardId: payload.cardId,
    specName: payload.specName,
    createdAt: new Date().toISOString(),
    read: false,
  }
  store.items.unshift(item)
  store.items = store.items.slice(0, 100)
  writeStore(store)
  broadcast('alerts:push', item)

  const email = await sendResendEmail(store, payload.title, payload.body)
  if (email.ok) {
    const emailItem: AlertItem = { ...item, id: randomUUID(), channel: 'email' }
    store.items.unshift(emailItem)
    writeStore(store)
    broadcast('alerts:push', emailItem)
  }

  const wa =
    store.config.whatsapp.provider === 'wppconnect'
      ? await sendWppConnect(store, `${payload.title}\n${payload.body}`)
      : await sendEvolution(store, `${payload.title}\n${payload.body}`)
  if (wa.ok) {
    const waItem: AlertItem = { ...item, id: randomUUID(), channel: 'whatsapp' }
    store.items.unshift(waItem)
    writeStore(store)
    broadcast('alerts:push', waItem)
  }

  return item
}

export function registerAlertsIpc(): void {
  ipcMain.handle('alerts:list', () => readStore().items)

  ipcMain.handle('alerts:config:get', () => publicConfig(readStore()))

  ipcMain.handle('alerts:config:set', (_event, patch: AlertConfigPatch) => {
    const store = readStore()
    if (patch.resend) store.config.resend = { ...store.config.resend, ...patch.resend }
    if (patch.whatsapp) store.config.whatsapp = { ...store.config.whatsapp, ...patch.whatsapp }
    if (patch.realtime) store.config.realtime = { ...store.config.realtime, ...patch.realtime }
    if (patch.resendApiKey?.trim()) store.secrets.resendApiKey = patch.resendApiKey.trim()
    if (patch.evolutionApiKey?.trim()) store.secrets.evolutionApiKey = patch.evolutionApiKey.trim()
    if (patch.wppconnectToken?.trim()) store.secrets.wppconnectToken = patch.wppconnectToken.trim()
    writeStore(store)
    return publicConfig(store)
  })

  ipcMain.handle('alerts:mark-read', (_event, id: string) => {
    const store = readStore()
    const item = store.items.find((i) => i.id === id)
    if (item) item.read = true
    writeStore(store)
    return item
  })

  ipcMain.handle('alerts:notify-complete', async (_event, payload: NotifyCompletePayload) =>
    notifyTaskComplete(payload),
  )

  ipcMain.handle('alerts:card-moved', async (_event, payload: CardMovedPayload) => {
    const store = readStore()
    const event = {
      type: 'card_moved' as const,
      ...payload,
      at: new Date().toISOString(),
    }
    if (store.config.realtime.enabled) {
      broadcast('realtime:card-moved', event)
    }
    if (payload.to === 'done') {
      await notifyTaskComplete({
        title: `Spec concluída: ${payload.specName ?? payload.title}`,
        body: `Card "${payload.title}" movido para Concluído${payload.agentName ? ` · agente ${payload.agentName}` : ''}.`,
        cardId: payload.cardId,
        specName: payload.specName,
      })
    }
    return event
  })
}
