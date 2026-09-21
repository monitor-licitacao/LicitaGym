import { contextBridge, ipcRenderer } from 'electron'
import type { AdminStats, AdminUsuario } from '../shared/admin-types'
import type { AuthStatus, LocalAdminSession } from '../shared/auth-types'
import type {
  AlertAutomationConfig,
  AlertItem,
  CardMovedPayload,
  NotifyCompletePayload,
} from '../shared/alert-types'
import type {
  ProviderConnectorPublic,
  ProviderDefinition,
  ProviderResolveResult,
  ProviderUpsertInput,
} from '../shared/provider-types'
import type {
  SyncInventoryItem,
  SyncRunEvent,
  SyncRunSnapshot,
  SyncSetupCard,
} from '../shared/sync-inventory'

const adminApi = {
  getStats: (accessToken: string): Promise<AdminStats> =>
    ipcRenderer.invoke('admin:get-stats', accessToken),
  listUsuarios: (accessToken: string): Promise<AdminUsuario[]> =>
    ipcRenderer.invoke('admin:list-usuarios', accessToken),
}

const authApi = {
  status: (): Promise<AuthStatus> => ipcRenderer.invoke('auth:status'),
  login: (login: string, senha: string): Promise<LocalAdminSession> =>
    ipcRenderer.invoke('auth:login', login, senha),
  validate: (token: string): Promise<LocalAdminSession | null> =>
    ipcRenderer.invoke('auth:validate', token),
  logout: (token: string): Promise<boolean> => ipcRenderer.invoke('auth:logout', token),
}

const providersApi = {
  catalog: (): Promise<ProviderDefinition[]> => ipcRenderer.invoke('providers:catalog'),
  list: (): Promise<ProviderConnectorPublic[]> => ipcRenderer.invoke('providers:list'),
  upsert: (input: ProviderUpsertInput): Promise<ProviderConnectorPublic> =>
    ipcRenderer.invoke('providers:upsert', input),
  delete: (id: string): Promise<void> => ipcRenderer.invoke('providers:delete', id),
  resolve: (slug: ProviderUpsertInput['slug'], modelId?: string): Promise<ProviderResolveResult> =>
    ipcRenderer.invoke('providers:resolve', slug, modelId),
}

const alertsApi = {
  list: (): Promise<AlertItem[]> => ipcRenderer.invoke('alerts:list'),
  getConfig: (): Promise<AlertAutomationConfig> => ipcRenderer.invoke('alerts:config:get'),
  setConfig: (patch: Record<string, unknown>): Promise<AlertAutomationConfig> =>
    ipcRenderer.invoke('alerts:config:set', patch),
  markRead: (id: string): Promise<AlertItem | undefined> => ipcRenderer.invoke('alerts:mark-read', id),
  notifyComplete: (payload: NotifyCompletePayload): Promise<AlertItem> =>
    ipcRenderer.invoke('alerts:notify-complete', payload),
  cardMoved: (payload: CardMovedPayload) => ipcRenderer.invoke('alerts:card-moved', payload),
  onPush: (cb: (item: AlertItem) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, item: AlertItem) => cb(item)
    ipcRenderer.on('alerts:push', listener)
    return () => ipcRenderer.removeListener('alerts:push', listener)
  },
  onCardMovedRealtime: (cb: (event: CardMovedPayload & { type: string; at: string }) => void) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      event: CardMovedPayload & { type: string; at: string },
    ) => cb(event)
    ipcRenderer.on('realtime:card-moved', listener)
    return () => ipcRenderer.removeListener('realtime:card-moved', listener)
  },
}

interface SyncInvokePayload {
  slug: string
  body?: Record<string, unknown>
  watch?: boolean
}

interface SyncInvokeResult {
  ok: boolean
  slug: string
  functionName: string
  sync_id: string | null
  status: string
  alreadyRunning: boolean
  raw: Record<string, unknown>
}

interface SyncInventoryResponse {
  items: SyncInventoryItem[]
  setupCards: SyncSetupCard[]
  pipelineOrder: string[]
}

const syncsApi = {
  inventory: (): Promise<SyncInventoryResponse> => ipcRenderer.invoke('syncs:inventory'),
  getRun: (syncId: string): Promise<SyncRunSnapshot | null> =>
    ipcRenderer.invoke('syncs:get-run', syncId),
  invoke: (payload: SyncInvokePayload): Promise<SyncInvokeResult> =>
    ipcRenderer.invoke('syncs:invoke', payload),
  watch: (syncId: string, slug: string, timeoutMs?: number) =>
    ipcRenderer.invoke('syncs:watch', syncId, slug, timeoutMs),
  unwatch: (syncId: string) => ipcRenderer.invoke('syncs:unwatch', syncId),
  listActive: (): Promise<SyncRunSnapshot[]> => ipcRenderer.invoke('syncs:list-active'),
  onRunUpdated: (cb: (event: SyncRunEvent) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, event: SyncRunEvent) => cb(event)
    ipcRenderer.on('syncs:run-updated', listener)
    return () => ipcRenderer.removeListener('syncs:run-updated', listener)
  },
}

contextBridge.exposeInMainWorld('admin', adminApi)
contextBridge.exposeInMainWorld('auth', authApi)
contextBridge.exposeInMainWorld('providers', providersApi)
contextBridge.exposeInMainWorld('alerts', alertsApi)
contextBridge.exposeInMainWorld('syncs', syncsApi)
