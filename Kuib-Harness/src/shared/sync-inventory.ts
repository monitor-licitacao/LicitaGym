export type SyncColumnId = 'backlog' | 'doing' | 'done' | 'blocked'

export type SyncCronKind = 'official_008' | 'proposed' | 'manual'

export interface SyncInventoryItem {
  slug: string
  functionName: string
  source: string
  tables: string
  invokeScript: string | null
  gateNotes: string
  cronKind: SyncCronKind
  cronExpression: string | null
  cronJobName: string | null
  defaultBody: Record<string, unknown>
  observeTimeoutMs: number
  pipelineOrder: number | null
  requiresApproval: boolean
}

export interface SyncSetupCard {
  id: string
  title: string
  detail: string
}

export interface SyncRunTotals {
  recebidos: number
  novos: number
  alterados: number
  inalterados: number
  erros: number
}

export interface SyncRunEvent {
  type: 'sync_run_updated'
  sync_id: string
  resource_type: string
  status: string
  totals: SyncRunTotals
  erro_principal?: string | null
  at: string
}

export interface SyncRunSnapshot {
  id: string
  resource_type: string
  status: string
  total_recebidos: number | null
  total_novos: number | null
  total_atualizados: number | null
  total_inalterados: number | null
  total_erros: number | null
  erro_principal: string | null
  iniciada_em: string | null
  finalizada_em: string | null
  lock_key: string | null
}

export const SYNC_INVENTORY: SyncInventoryItem[] = [
  {
    slug: 'sync-compras-catmat',
    functionName: 'sync-compras-catmat',
    source: 'Compras.gov Dados Abertos',
    tables: 'catmat_*, catalogo_itens',
    invokeScript: 'scripts/invoke-sync-compras-catmat.ps1',
    gateNotes: 'classes 78/7830 + 72/7220; características em lotes separados',
    cronKind: 'proposed',
    cronExpression: '0 4 * * 1',
    cronJobName: 'compras-catmat-7830',
    defaultBody: {
      codigo_grupo: 78,
      codigo_classe: 7830,
      incluir_caracteristicas: false,
      max_paginas: 500,
    },
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: 1,
    requiresApproval: false,
  },
  {
    slug: 'sync-compras-catmat-7220',
    functionName: 'sync-compras-catmat',
    source: 'Compras.gov Dados Abertos',
    tables: 'catmat_* (7220)',
    invokeScript: 'scripts/invoke-sync-compras-catmat.ps1',
    gateNotes: 'piso 72/7220; SkipCaracteristicas por padrão',
    cronKind: 'proposed',
    cronExpression: '30 4 * * 1',
    cronJobName: 'compras-catmat-7220',
    defaultBody: {
      codigo_grupo: 72,
      codigo_classe: 7220,
      incluir_caracteristicas: false,
      max_paginas: 500,
    },
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: 1,
    requiresApproval: false,
  },
  {
    slug: 'sync-pncp-pca',
    functionName: 'sync-pncp-pca',
    source: 'PNCP PCA',
    tables: 'pca_*, private.pncp_period_anchor',
    invokeScript: 'scripts/invoke-sync-pca.ps1',
    gateNotes: 'probe mensal vs carga; somente_verificacao / forcar / verificar_periodo',
    cronKind: 'official_008',
    cronExpression: '0 2 1 * *',
    cronJobName: 'pncp-pca-probe-mensal',
    defaultBody: { somente_verificacao: true, ano: new Date().getUTCFullYear() },
    observeTimeoutMs: 30 * 60 * 1000,
    pipelineOrder: 2,
    requiresApproval: true,
  },
  {
    slug: 'link-catmat-pca',
    functionName: 'link-catmat-pca',
    source: 'interno',
    tables: 'catalogo_ponte, pca_item_pdm',
    invokeScript: 'scripts/invoke-sync-licitagym-scope.ps1',
    gateNotes: 'depois de CATMAT + PCA',
    cronKind: 'proposed',
    cronExpression: '0 6 * * 1',
    cronJobName: 'link-catmat-pca',
    defaultBody: {},
    observeTimeoutMs: 15 * 60 * 1000,
    pipelineOrder: 3,
    requiresApproval: false,
  },
  {
    slug: 'sync-pncp-orgaos',
    functionName: 'sync-pncp-orgaos',
    source: 'PNCP integração / bootstrap PCA',
    tables: 'entidades, orgaos, unidades',
    invokeScript: 'scripts/invoke-sync-orgaos.ps1',
    gateNotes: 'preferir bootstrap_pca se integração 5xx',
    cronKind: 'proposed',
    cronExpression: '0 5 * * *',
    cronJobName: 'pncp-orgaos-bootstrap',
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: 4,
    requiresApproval: false,
  },
  {
    slug: 'sync-pncp-catalogo',
    functionName: 'sync-pncp-catalogo',
    source: 'PNCP integração',
    tables: 'catálogo PNCP / ponte',
    invokeScript: null,
    gateNotes: 'requer token integração',
    cronKind: 'proposed',
    cronExpression: '30 5 * * *',
    cronJobName: 'pncp-catalogo',
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: null,
    requiresApproval: true,
  },
  {
    slug: 'sync-pncp-legislation',
    functionName: 'sync-pncp-legislation',
    source: 'scrape / PDF oficiais',
    tables: 'legislação + Storage pncp-legislation',
    invokeScript: 'scripts/invoke-sync-legislation.ps1',
    gateNotes: 'só PDF; HTML→erro_importacao',
    cronKind: 'official_008',
    cronExpression: '0 */6 * * *',
    cronJobName: 'pncp-legislation-check',
    defaultBody: {},
    observeTimeoutMs: 15 * 60 * 1000,
    pipelineOrder: null,
    requiresApproval: false,
  },
  {
    slug: 'sync-pncp-contratacoes-editais',
    functionName: 'sync-pncp-contratacoes-editais',
    source: 'PNCP publicacao',
    tables: 'editais / eventos',
    invokeScript: 'scripts/invoke-sync-editais.ps1',
    gateNotes: 'escopo catalogo + gate objeto fitness',
    cronKind: 'official_008',
    cronExpression: '0 */6 * * *',
    cronJobName: 'pncp-contratacoes-editais',
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: 5,
    requiresApproval: false,
  },
  {
    slug: 'sync-pncp-contratacoes-atas',
    functionName: 'sync-pncp-contratacoes-atas',
    source: 'PNCP',
    tables: 'atas',
    invokeScript: null,
    gateNotes: 'cron offset +15 min',
    cronKind: 'official_008',
    cronExpression: '15 */6 * * *',
    cronJobName: 'pncp-contratacoes-atas',
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: null,
    requiresApproval: false,
  },
  {
    slug: 'sync-pncp-contratacoes-contratos',
    functionName: 'sync-pncp-contratacoes-contratos',
    source: 'PNCP',
    tables: 'contratos',
    invokeScript: null,
    gateNotes: 'cron offset +30 min',
    cronKind: 'official_008',
    cronExpression: '30 */6 * * *',
    cronJobName: 'pncp-contratacoes-contratos',
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: null,
    requiresApproval: false,
  },
  {
    slug: 'sync-pncp-irp',
    functionName: 'sync-pncp-irp',
    source: 'PNCP IRP',
    tables: 'IRP',
    invokeScript: null,
    gateNotes: 'só se IRP_SYNC_ENABLED=true',
    cronKind: 'proposed',
    cronExpression: null,
    cronJobName: 'pncp-irp',
    defaultBody: {},
    observeTimeoutMs: 20 * 60 * 1000,
    pipelineOrder: null,
    requiresApproval: true,
  },
  {
    slug: 'import-catmat-curadoria',
    functionName: 'import-catmat-curadoria',
    source: 'seed JSON',
    tables: 'curadoria CATMAT',
    invokeScript: 'scripts/import-catmat-curadoria.ps1',
    gateNotes: 'manual / raro',
    cronKind: 'manual',
    cronExpression: null,
    cronJobName: null,
    defaultBody: {},
    observeTimeoutMs: 10 * 60 * 1000,
    pipelineOrder: null,
    requiresApproval: true,
  },
]

export const SYNC_SETUP_CARDS: SyncSetupCard[] = [
  {
    id: 'setup-vault',
    title: 'Habilitar Vault secrets cron',
    detail: 'sync_cron_secret + URLs sync_pncp_*_url no Vault antes de descomentar 008.',
  },
  {
    id: 'setup-cron-dryrun',
    title: 'Unschedule dry-run SELECT cron.job',
    detail: 'Validar jobs existentes sem ativar carga pesada.',
  },
  {
    id: 'setup-realtime-a',
    title: 'Realtime Opção A — espelho sync_run_events',
    detail: 'Após MVP polling (Opção C). Trigger private.pncp_sync_run → public.sync_run_events.',
  },
  {
    id: 'setup-smoke',
    title: 'Smoke: 1 invoke por function + card done',
    detail: 'Começar por sync-compras-catmat SkipCaracteristicas.',
  },
]

export const PIPELINE_SCOPE_ORDER = [
  'sync-compras-catmat',
  'sync-pncp-pca',
  'link-catmat-pca',
  'sync-pncp-orgaos',
  'sync-pncp-contratacoes-editais',
]

export function mapSyncStatusToColumn(status: string): SyncColumnId {
  switch (status) {
    case 'pendente':
    case 'cancelada':
      return 'backlog'
    case 'executando':
      return 'doing'
    case 'concluida':
      return 'done'
    case 'concluida_com_erros':
    case 'falhou':
      return 'blocked'
    default:
      return 'backlog'
  }
}

export function toSyncRunEvent(row: SyncRunSnapshot): SyncRunEvent {
  return {
    type: 'sync_run_updated',
    sync_id: row.id,
    resource_type: row.resource_type,
    status: row.status,
    totals: {
      recebidos: row.total_recebidos ?? 0,
      novos: row.total_novos ?? 0,
      alterados: row.total_atualizados ?? 0,
      inalterados: row.total_inalterados ?? 0,
      erros: row.total_erros ?? 0,
    },
    erro_principal: row.erro_principal,
    at: new Date().toISOString(),
  }
}
