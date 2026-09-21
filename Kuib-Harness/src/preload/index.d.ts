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

export interface AdminBridge {
  getStats: (accessToken: string) => Promise<AdminStats>
  listUsuarios: (accessToken: string) => Promise<AdminUsuario[]>
}

export interface AuthBridge {
  status: () => Promise<AuthStatus>
  login: (login: string, senha: string) => Promise<LocalAdminSession>
  validate: (token: string) => Promise<LocalAdminSession | null>
  logout: (token: string) => Promise<boolean>
}

export interface ProvidersBridge {
  catalog: () => Promise<ProviderDefinition[]>
  list: () => Promise<ProviderConnectorPublic[]>
  upsert: (input: ProviderUpsertInput) => Promise<ProviderConnectorPublic>
  delete: (id: string) => Promise<void>
  resolve: (slug: ProviderUpsertInput['slug'], modelId?: string) => Promise<ProviderResolveResult>
}

export interface AlertsBridge {
  list: () => Promise<AlertItem[]>
  getConfig: () => Promise<AlertAutomationConfig>
  setConfig: (patch: Record<string, unknown>) => Promise<AlertAutomationConfig>
  markRead: (id: string) => Promise<AlertItem | undefined>
  notifyComplete: (payload: NotifyCompletePayload) => Promise<AlertItem>
  cardMoved: (payload: CardMovedPayload) => Promise<CardMovedPayload & { type: string; at: string }>
  onPush: (cb: (item: AlertItem) => void) => () => void
  onCardMovedRealtime: (
    cb: (event: CardMovedPayload & { type: string; at: string }) => void,
  ) => () => void
}

export interface SyncInvokePayload {
  slug: string
  body?: Record<string, unknown>
  watch?: boolean
}

export interface SyncInvokeResult {
  ok: boolean
  slug: string
  functionName: string
  sync_id: string | null
  status: string
  alreadyRunning: boolean
  raw: Record<string, unknown>
}

export interface SyncInventoryResponse {
  items: SyncInventoryItem[]
  setupCards: SyncSetupCard[]
  pipelineOrder: string[]
}

export interface SyncsBridge {
  inventory: () => Promise<SyncInventoryResponse>
  getRun: (syncId: string) => Promise<SyncRunSnapshot | null>
  invoke: (payload: SyncInvokePayload) => Promise<SyncInvokeResult>
  watch: (syncId: string, slug: string, timeoutMs?: number) => Promise<{ watching: boolean; sync_id: string }>
  unwatch: (syncId: string) => Promise<{ watching: boolean }>
  listActive: () => Promise<SyncRunSnapshot[]>
  onRunUpdated: (cb: (event: SyncRunEvent) => void) => () => void
}

declare global {
  interface Window {
    admin: AdminBridge
    auth: AuthBridge
    providers: ProvidersBridge
    alerts: AlertsBridge
    syncs: SyncsBridge
  }
}

export {}
