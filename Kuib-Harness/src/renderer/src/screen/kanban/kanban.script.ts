import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { SyncColumnId } from '../../../../shared/sync-inventory'

export interface KanbanColumn {
  id: SyncColumnId
  title: string
}

export interface KanbanCard {
  id: string
  title: string
  columnId: SyncColumnId
  agentName?: string
  specName?: string
  detail?: string
}

const defaultColumns: KanbanColumn[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'doing', title: 'Em andamento' },
  { id: 'done', title: 'Concluído' },
  { id: 'blocked', title: 'Blocked' },
]

export function useKanbanScript(options?: { includeBlocked?: boolean }) {
  const includeBlocked = options?.includeBlocked ?? true
  const columns = computed(() =>
    includeBlocked ? defaultColumns : defaultColumns.filter((c) => c.id !== 'blocked'),
  )

  const cards = ref<KanbanCard[]>([
    {
      id: 'spec-ini-04',
      title: 'ini-04-spec-syncs',
      columnId: 'backlog',
      agentName: 'Sync Agent',
      specName: 'ini-04-spec-syncs',
      detail: 'Painel de syncs LicitaGym — inventário, invoke e polling.',
    },
  ])

  const cardsByColumn = computed(() => {
    const map: Record<SyncColumnId, KanbanCard[]> = {
      backlog: [],
      doing: [],
      done: [],
      blocked: [],
    }
    for (const c of cards.value) {
      if (map[c.columnId]) map[c.columnId].push(c)
    }
    return map
  })

  let unsub: (() => void) | null = null

  async function onCardMoved(card: KanbanCard, to: SyncColumnId, from: SyncColumnId): Promise<void> {
    card.columnId = to
    if (window.alerts) {
      await window.alerts.cardMoved({
        cardId: card.id,
        title: card.title,
        from,
        to,
        specName: card.specName,
        agentName: card.agentName,
      })
    }
  }

  onMounted(() => {
    if (window.alerts?.onCardMovedRealtime) {
      unsub = window.alerts.onCardMovedRealtime((event) => {
        const card = cards.value.find((c) => c.id === event.cardId)
        if (card && event.to in cardsByColumn.value) {
          card.columnId = event.to as SyncColumnId
        }
      })
    }
  })

  onUnmounted(() => {
    unsub?.()
    unsub = null
  })

  return { columns, cards, cardsByColumn, onCardMoved }
}
