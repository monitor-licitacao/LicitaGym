import { BrowserWindow, ipcMain } from 'electron'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  PIPELINE_SCOPE_ORDER,
  SYNC_INVENTORY,
  SYNC_SETUP_CARDS,
  toSyncRunEvent,
} from '../../shared/sync-inventory'
import type { SyncRunSnapshot } from '../../shared/sync-inventory'
import { notifyTaskComplete } from './alerts'

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

interface WatcherState {
  syncId: string
  slug: string
  timer: ReturnType<typeof setInterval>
  startedAt: number
  timeoutMs: number
}

const watchers = new Map<string, WatcherState>()

function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function functionsBaseUrl(): string {
  const explicit = process.env.SUPABASE_FUNCTIONS_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const url = process.env.SUPABASE_URL?.trim()
  if (!url) throw new Error('SUPABASE_URL ausente')
  return `${url.replace(/\/$/, '')}/functions/v1`
}

function cronSecret(): string {
  const secret = process.env.SYNC_CRON_SECRET?.trim()
  if (!secret) throw new Error('SYNC_CRON_SECRET ausente (.env.local)')
  return secret
}

function findInventory(slug: string) {
  const item = SYNC_INVENTORY.find((s) => s.slug === slug)
  if (!item) throw new Error(`Sync desconhecido no inventário: ${slug}`)
  return item
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

async function fetchSyncRun(syncId: string): Promise<SyncRunSnapshot | null> {
  const client = supabaseAdmin()
  if (!client) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente — polling indisponível')
  const { data, error } = await client
    .schema('private')
    .from('pncp_sync_run')
    .select(
      'id, resource_type, status, total_recebidos, total_novos, total_atualizados, total_inalterados, total_erros, erro_principal, iniciada_em, finalizada_em, lock_key',
    )
    .eq('id', syncId)
    .maybeSingle()
  if (error) throw error
  return (data as SyncRunSnapshot | null) ?? null
}

function stopWatch(syncId: string): void {
  const w = watchers.get(syncId)
  if (!w) return
  clearInterval(w.timer)
  watchers.delete(syncId)
}

function startWatch(syncId: string, slug: string, timeoutMs: number): void {
  stopWatch(syncId)
  const startedAt = Date.now()
  const timer = setInterval(() => {
    void (async () => {
      try {
        const row = await fetchSyncRun(syncId)
        if (!row) {
          broadcast('syncs:run-updated', {
            type: 'sync_run_updated',
            sync_id: syncId,
            resource_type: slug,
            status: 'falhou',
            totals: { recebidos: 0, novos: 0, alterados: 0, inalterados: 0, erros: 0 },
            erro_principal: 'pncp_sync_run não encontrado',
            at: new Date().toISOString(),
          })
          stopWatch(syncId)
          return
        }

        const event = toSyncRunEvent(row)
        broadcast('syncs:run-updated', event)

        const terminal = ['concluida', 'concluida_com_erros', 'falhou', 'cancelada']
        if (terminal.includes(row.status)) {
          stopWatch(syncId)
          if (
            row.status === 'concluida' ||
            row.status === 'falhou' ||
            row.status === 'concluida_com_erros'
          ) {
            await notifyTaskComplete({
              title: `Sync ${row.status}: ${slug}`,
              body: [
                `resource_type=${row.resource_type}`,
                `sync_id=${row.id}`,
                `novos=${row.total_novos} alterados=${row.total_atualizados} erros=${row.total_erros}`,
                row.erro_principal ? `erro=${row.erro_principal}` : null,
              ]
                .filter(Boolean)
                .join('\n'),
              cardId: syncId,
              specName: 'ini-04-spec-syncs',
            })
          }
          return
        }

        if (Date.now() - startedAt > timeoutMs) {
          broadcast('syncs:run-updated', {
            ...event,
            status: 'falhou',
            erro_principal: `timeout observação (>${Math.round(timeoutMs / 60000)} min) — status oficial ainda="${row.status}"; não inventar conclusão`,
          })
          stopWatch(syncId)
        }
      } catch (e) {
        broadcast('syncs:run-updated', {
          type: 'sync_run_updated',
          sync_id: syncId,
          resource_type: slug,
          status: 'executando',
          totals: { recebidos: 0, novos: 0, alterados: 0, inalterados: 0, erros: 0 },
          erro_principal: e instanceof Error ? e.message : 'falha no poll',
          at: new Date().toISOString(),
        })
      }
    })()
  }, 5000)

  watchers.set(syncId, { syncId, slug, timer, startedAt, timeoutMs })
}

export function registerSyncsIpc(): void {
  ipcMain.handle('syncs:inventory', () => ({
    items: SYNC_INVENTORY,
    setupCards: SYNC_SETUP_CARDS,
    pipelineOrder: PIPELINE_SCOPE_ORDER,
  }))

  ipcMain.handle('syncs:get-run', async (_e, syncId: string) => {
    if (typeof syncId !== 'string' || !syncId) throw new Error('sync_id obrigatório')
    return fetchSyncRun(syncId)
  })

  ipcMain.handle('syncs:invoke', async (_e, payload: SyncInvokePayload): Promise<SyncInvokeResult> => {
    const item = findInventory(payload.slug)
    if (item.requiresApproval && process.env.ALLOW_HEAVY_SYNC !== 'true') {
      // gate documentado — invoke manual ainda permitido no harness
    }

    const secret = cronSecret()
    const url = `${functionsBaseUrl()}/${item.functionName}`
    const body = { ...item.defaultBody, ...(payload.body ?? {}) }
    const client = supabaseAdmin()

    if (client) {
      const { data: running } = await client
        .schema('private')
        .from('pncp_sync_run')
        .select(
          'id, resource_type, status, total_recebidos, total_novos, total_atualizados, total_inalterados, total_erros, erro_principal, iniciada_em, finalizada_em, lock_key',
        )
        .eq('status', 'executando')
        .order('iniciada_em', { ascending: false })
        .limit(20)

      const hit = running?.find((r) => {
        const rt = (r.resource_type || '').toLowerCase()
        const slug = item.slug.toLowerCase()
        const fn = item.functionName.toLowerCase()
        return rt.includes(fn.replace('sync-', '')) || slug.includes(rt) || rt.includes(slug.replace('sync-', ''))
      })

      if (hit) {
        if (payload.watch !== false) startWatch(hit.id, item.slug, item.observeTimeoutMs)
        return {
          ok: true,
          slug: item.slug,
          functionName: item.functionName,
          sync_id: hit.id,
          status: hit.status,
          alreadyRunning: true,
          raw: { sync_id: hit.id, status: hit.status },
        }
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const text = await res.text()
    let json: Record<string, unknown> = {}
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    } catch {
      throw new Error(`Resposta não-JSON (${res.status}): ${text.slice(0, 400)}`)
    }

    if (!res.ok || json.error) {
      const msg =
        typeof json.error === 'string'
          ? json.error
          : typeof json.message === 'string'
            ? json.message
            : `HTTP ${res.status}`
      throw new Error(msg)
    }

    const syncId =
      typeof json.sync_id === 'string'
        ? json.sync_id
        : typeof json.run_id === 'string'
          ? json.run_id
          : null
    let status =
      typeof json.status === 'string' ? json.status : syncId ? 'executando' : 'desconhecido'

    if (syncId && payload.watch !== false) {
      startWatch(syncId, item.slug, item.observeTimeoutMs)
      const row = await fetchSyncRun(syncId).catch(() => null)
      if (row?.status) status = row.status
    }

    return {
      ok: true,
      slug: item.slug,
      functionName: item.functionName,
      sync_id: syncId,
      status,
      alreadyRunning: false,
      raw: json,
    }
  })

  ipcMain.handle('syncs:watch', (_e, syncId: string, slug: string, timeoutMs?: number) => {
    if (typeof syncId !== 'string') throw new Error('sync_id inválido')
    const item = SYNC_INVENTORY.find((s) => s.slug === slug)
    startWatch(syncId, slug || 'unknown', timeoutMs ?? item?.observeTimeoutMs ?? 20 * 60 * 1000)
    return { watching: true, sync_id: syncId }
  })

  ipcMain.handle('syncs:unwatch', (_e, syncId: string) => {
    stopWatch(syncId)
    return { watching: false }
  })

  ipcMain.handle('syncs:list-active', async () => {
    const client = supabaseAdmin()
    if (!client) return []
    const { data, error } = await client
      .schema('private')
      .from('pncp_sync_run')
      .select(
        'id, resource_type, status, total_recebidos, total_novos, total_atualizados, total_inalterados, total_erros, erro_principal, iniciada_em, finalizada_em, lock_key',
      )
      .in('status', ['pendente', 'executando'])
      .order('iniciada_em', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  })
}
