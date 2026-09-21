<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSyncsScript } from './syncs.script'

const {
  columns,
  cardsByColumn,
  loading,
  error,
  notice,
  toggleExpand,
  invokeSync,
  seedBoard,
} = useSyncsScript()
</script>

<template>
  <section class="syncs">
    <header class="syncs__header">
      <h2 class="syncs__title">Syncs · ini-04</h2>
      <div class="flex items-center gap-2">
        <Badge variant="outline">polling MVP 5s</Badge>
        <Button size="sm" variant="ghost" @click="seedBoard">Re-seed</Button>
      </div>
    </header>

    <p v-if="loading" class="syncs__banner">Carregando inventário…</p>
    <p v-else-if="error" class="syncs__banner syncs__banner--err" role="alert">{{ error }}</p>
    <p v-if="notice" class="syncs__banner syncs__banner--ok">{{ notice }}</p>

    <div class="syncs__board">
      <div
        v-for="col in columns"
        :key="col.id"
        class="syncs__column"
        :class="{ 'syncs__column--blocked': col.id === 'blocked' }"
      >
        <div class="syncs__column-head">
          <span>{{ col.title }}</span>
          <Badge variant="secondary">{{ cardsByColumn[col.id].length }}</Badge>
        </div>
        <div class="syncs__cards">
          <article v-for="card in cardsByColumn[col.id]" :key="card.id" class="syncs__card">
            <p class="syncs__card-title">{{ card.title }}</p>
            <div class="syncs__card-meta">
              <Badge variant="secondary">{{ card.agentName }}</Badge>
              <Badge variant="outline">{{ card.kind }}</Badge>
              <span>{{ card.specName }}</span>
              <span v-if="card.lastStatus">status={{ card.lastStatus }}</span>
            </div>
            <div class="syncs__card-actions">
              <Button size="sm" variant="ghost" @click="toggleExpand(card.id)">
                {{ card.expanded ? 'Ocultar' : 'Detalhe' }}
              </Button>
              <Button
                v-if="card.kind === 'sync' && card.slug"
                size="sm"
                variant="outline"
                :disabled="card.invoking"
                @click="invokeSync(card.id)"
              >
                {{ card.invoking ? 'Observando…' : 'Invoke' }}
              </Button>
            </div>
            <p v-if="card.error" class="syncs__banner syncs__banner--err">{{ card.error }}</p>
            <p v-if="card.expanded" class="syncs__card-detail">{{ card.executionDetail }}</p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped src="./syncs.css"></style>
