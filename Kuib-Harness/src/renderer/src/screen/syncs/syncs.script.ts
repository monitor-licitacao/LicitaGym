import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { SyncInventoryItem } from '../../../../shared/sync-inventory'
import { mapSyncStatusToColumn } from '../../../../shared/sync-inventory'
import type { SyncColumnId, SyncRunEvent } from '../../../../shared/sync-inventory'

export interface SyncBoardColumn {
  id: SyncColumnId
  title: string
}

export interface SyncBoardCard {
  id: string
  title: string
  columnId: SyncColumnId
  agentName: string
  agentSlug?: string
  specName: string
  executionDetail: string
  slug?: string
  cronExpression?: string | null
  bodyJson?: string
  kind: 'sync' | 'setup' | 'pipeline'
  expanded?: boolean
  syncId?: string
  lastStatus?: string
  totalsText?: string
  invoking?: boolean
  error?: string | null
}

const columns: SyncBoardColumn[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'doing', title: 'Em andamento' },
  { id: 'done', title: 'Concluído' },
  { id: 'blocked', title: 'Blocked' },
]

const cards = ref<SyncBoardCard[]>([])
const pipelineOrder = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

let unsub: (() => void) | null = null

function detailForItem(item: SyncInventoryItem): string {
  return [
    `function: ${item.functionName}`,
    `fonte: ${item.source}`,
    `tabelas: ${item.tables}`,
    item.invokeScript ? `script: ${item.invokeScript}` : 'script: —',
    item.cronJobName
      ? `cron: ${item.cronJobName} (${item.cronKind}) ${item.cronExpression ?? '—'}`
      : `cron: ${item.cronKind}`,
    `gate: ${item.gateNotes}`,
    `body: ${JSON.stringify(item.defaultBody)}`,
    item.pipelineOrder != null ? `pipeline #${item.pipelineOrder}` : 'fora do pipeline escopo',
    item.requiresApproval ? '⚠️ requer aprovação admin para cron pesado' : '',
  ]
    .filter(Boolean)
    .join('\n')
}

async function seedBoard(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const inv = await window.syncs.inventory()
    pipelineOrder.value = [...inv.pipelineOrder]

    const syncCards: SyncBoardCard[] = inv.items.map((item) => ({
      id: `sync-${item.slug}`,
      title: item.slug,
      columnId: 'backlog',
      agentName: `sync-agent-${item.slug.replace(/^sync-/, '')}`,
      agentSlug: item.slug,
      specName: 'ini-04-spec-syncs',
      executionDetail: detailForItem(item),
      slug: item.slug,
      cronExpression: item.cronExpression,
      bodyJson: JSON.stringify(item.defaultBody, null, 2),
      kind: 'sync',
      expanded: item.slug === 'sync-compras-catmat',
    }))

    const setupCards: SyncBoardCard[] = inv.setupCards.map((s) => ({
      id: s.id,
      title: s.title,
      columnId: 'backlog',
      agentName: 'Setup Agent',
      agentSlug: 'setup',
      specName: 'ini-04-spec-syncs',
      executionDetail: s.detail,
      kind: 'setup',
    }))

    const pipelineCard: SyncBoardCard = {
      id: 'pipeline-licitagym-scope',
      title: 'Pipeline invoke-sync-licitagym-scope',
      columnId: 'backlog',
      agentName: 'Pipeline Agent',
      agentSlug: 'pipeline',
      specName: 'ini-04-spec-syncs',
      executionDetail: [
        'Ordem obrigatória (não pular):',
        ...inv.pipelineOrder.map((s, i) => `${i + 1}. ${s}`),
        'Falha em N → blocked; não dispara N+1.',
      ].join('\n'),
      kind: 'pipeline',
      expanded: true,
    }

    cards.value = [...setupCards, pipelineCard, ...syncCards]
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Falha ao carregar inventário'
  } finally {
    loading.value = false
  }
}

const cardsByColumn = computed(() => {
  const map: Record<SyncColumnId, SyncBoardCard[]> = {
    backlog: [],
    doing: [],
    done: [],
    blocked: [],
  }
  for (const c of cards.value) map[c.columnId].push(c)
  return map
})

function toggleExpand(id: string): void {
  const c = cards.value.find((x) => x.id === id)
  if (c) c.expanded = !c.expanded
}

function applyRunEvent(event: SyncRunEvent): void {
  const target =
    cards.value.find((c) => c.syncId === event.sync_id) ??
    cards.value.find(
      (c) =>
        c.kind === 'sync' &&
        c.columnId === 'doing' &&
        (c.slug === event.resource_type ||
          c.slug?.includes(event.resource_type) ||
          event.resource_type.includes(c.slug?.replace(/^sync-/, '') ?? '')),
    )
  if (!target) return

  target.syncId = event.sync_id
  target.lastStatus = event.status
  target.totalsText = `recebidos=${event.totals.recebidos} novos=${event.totals.novos} alterados=${event.totals.alterados} inalterados=${event.totals.inalterados} erros=${event.totals.erros}`
  target.columnId = mapSyncStatusToColumn(event.status)
  target.invoking = event.status === 'executando' || event.status === 'pendente'

  const base = target.executionDetail.split('\n---\n')[0]
  if (event.erro_principal) {
    target.error = event.erro_principal
    target.executionDetail = `${base}
---
sync_id=${event.sync_id}
status=${event.status}
${target.totalsText}
erro=${event.erro_principal}`
  } else {
    target.error = null
    target.executionDetail = `${base}
---
sync_id=${event.sync_id}
status=${event.status}
${target.totalsText}`
  }
}

async function invokeSync(cardId: string): Promise<void> {
  const card = cards.value.find((c) => c.id === cardId)
  if (!card?.slug) return

  notice.value = null
  error.value = null
  card.invoking = true
  card.error = null
  card.columnId = 'doing'

  try {
    const result = await window.syncs.invoke({ slug: card.slug, watch: true })
    card.syncId = result.sync_id ?? undefined
    card.lastStatus = result.status
    card.columnId = mapSyncStatusToColumn(result.status)
    notice.value = result.alreadyRunning
      ? `Lock ativo — observando sync_id=${result.sync_id} (sem re-POST)`
      : `Invoke OK — sync_id=${result.sync_id ?? '—'} status=${result.status}`

    if (!result.sync_id && result.status !== 'concluida') {
      card.columnId = 'blocked'
      card.error = 'Resposta sem sync_id — não inventar conclusão'
    }
  } catch (e) {
    card.columnId = 'blocked'
    card.error = e instanceof Error ? e.message : 'Falha no invoke'
    card.invoking = false
  }
}

export function useSyncsScript() {
  onMounted(() => {
    void seedBoard()
    unsub = window.syncs.onRunUpdated((event) => applyRunEvent(event))
  })

  onUnmounted(() => {
    unsub?.()
    unsub = null
  })

  return {
    columns,
    cards,
    cardsByColumn,
    loading,
    error,
    notice,
    pipelineOrder,
    toggleExpand,
    invokeSync,
    seedBoard,
  }
}
