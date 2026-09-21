import { app, ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  assertModelAllowed,
  listProviderDefinitions,
  maskSecret,
} from '../../shared/provider-catalog'
import type {
  ProviderConnector,
  ProviderConnectorPublic,
  ProviderUpsertInput,
} from '../../shared/provider-types'

interface ProviderStore {
  connectors: ProviderConnector[]
}

function storePath(): string {
  const dir = join(app.getPath('userData'), 'kuib-harness')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'providers.json')
}

function readStore(): ProviderStore {
  const path = storePath()
  if (!existsSync(path)) return { connectors: [] }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ProviderStore
  } catch {
    return { connectors: [] }
  }
}

function writeStore(store: ProviderStore): void {
  writeFileSync(storePath(), JSON.stringify(store, null, 2), 'utf8')
}

function toPublic(c: ProviderConnector): ProviderConnectorPublic {
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
    updatedAt: c.updatedAt,
  }
}

export function registerProviderIpc(): void {
  ipcMain.handle('providers:catalog', () => listProviderDefinitions())

  ipcMain.handle('providers:list', () => readStore().connectors.map(toPublic))

  ipcMain.handle('providers:upsert', (_event, input: ProviderUpsertInput) => {
    assertModelAllowed(input.slug, input.modelId)
    const store = readStore()
    const now = new Date().toISOString()
    const existingIdx = input.id ? store.connectors.findIndex((c) => c.id === input.id) : -1

    if (existingIdx >= 0) {
      const prev = store.connectors[existingIdx]
      const next: ProviderConnector = {
        ...prev,
        slug: input.slug,
        label: input.label,
        authMode: input.authMode,
        baseUrl: input.baseUrl,
        modelId: input.modelId,
        enabled: input.enabled,
        updatedAt: now,
        apiKey: input.apiKey?.trim() ? input.apiKey.trim() : prev.apiKey,
      }
      store.connectors[existingIdx] = next
      writeStore(store)
      return toPublic(next)
    }

    const created: ProviderConnector = {
      id: randomUUID(),
      slug: input.slug,
      label: input.label,
      authMode: input.authMode,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey?.trim() || undefined,
      modelId: input.modelId,
      enabled: input.enabled,
      updatedAt: now,
    }
    store.connectors.push(created)
    writeStore(store)
    return toPublic(created)
  })

  ipcMain.handle('providers:delete', (_event, id: string) => {
    const store = readStore()
    store.connectors = store.connectors.filter((c) => c.id !== id)
    writeStore(store)
  })

  ipcMain.handle('providers:resolve', (_event, slug: ProviderUpsertInput['slug'], modelId?: string) => {
    const store = readStore()
    const connector = store.connectors.find((c) => c.slug === slug && c.enabled)
    if (!connector) throw new Error(`Nenhum conector ativo para "${slug}"`)
    const resolvedModel = modelId ?? connector.modelId
    assertModelAllowed(slug, resolvedModel)
    return {
      id: connector.id,
      slug: connector.slug,
      modelId: resolvedModel,
      baseUrl: connector.baseUrl,
      hasApiKey: Boolean(connector.apiKey),
    }
  })
}
