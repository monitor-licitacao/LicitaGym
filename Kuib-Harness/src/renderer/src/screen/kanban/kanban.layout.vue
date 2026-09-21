<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import { Badge } from '@/components/ui/badge'
import { useKanbanScript, type KanbanCard } from './kanban.script'
import type { SyncColumnId } from '../../../../shared/sync-inventory'

const props = withDefaults(
  defineProps<{
    includeBlocked?: boolean
  }>(),
  { includeBlocked: true },
)

const { columns, cardsByColumn, onCardMoved } = useKanbanScript({
  includeBlocked: props.includeBlocked,
})

function listForColumn(columnId: SyncColumnId): KanbanCard[] {
  return cardsByColumn.value[columnId]
}

async function handleChange(columnId: SyncColumnId, evt: { added?: { element: KanbanCard; oldIndex?: number } }): Promise<void> {
  if (!evt.added) return
  const card = evt.added.element
  const from = (card as KanbanCard & { _from?: SyncColumnId })._from ?? 'backlog'
  await onCardMoved(card, columnId, from)
}
</script>

<template>
  <section class="kanban">
    <header class="kanban__header">
      <h2 class="kanban__title">Kanban · specs</h2>
      <Badge variant="outline">drag opcional</Badge>
    </header>

    <div class="kanban__board">
      <div
        v-for="col in columns"
        :key="col.id"
        class="kanban__column"
        :class="{ 'kanban__column--blocked': col.id === 'blocked' }"
      >
        <div class="kanban__column-head">
          <span>{{ col.title }}</span>
          <Badge variant="secondary">{{ listForColumn(col.id).length }}</Badge>
        </div>
        <VueDraggable
          :model-value="listForColumn(col.id)"
          class="kanban__cards"
          group="kanban"
          item-key="id"
          @change="(evt) => handleChange(col.id, evt)"
        >
          <div v-for="card in listForColumn(col.id)" :key="card.id" class="kanban__card">
            <p class="kanban__card-title">{{ card.title }}</p>
            <p v-if="card.agentName || card.specName" class="kanban__card-meta">
              {{ card.agentName }} · {{ card.specName }}
            </p>
          </div>
        </VueDraggable>
      </div>
    </div>
  </section>
</template>

<style scoped src="./kanban.css"></style>
