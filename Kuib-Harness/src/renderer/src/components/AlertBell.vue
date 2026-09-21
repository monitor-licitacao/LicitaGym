<script setup lang="ts">
import { onMounted } from 'vue'
import { Bell } from '@lucide/vue'
import { useAlertsStore } from '@/stores/alerts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const alerts = useAlertsStore()

onMounted(() => {
  void alerts.bootstrap()
})
</script>

<template>
  <div class="relative">
    <Button variant="ghost" size="icon" aria-label="Alertas" @click="alerts.toggle()">
      <Bell />
      <Badge
        v-if="alerts.unread > 0"
        class="absolute -right-1 -top-1 size-5 justify-center rounded-full p-0 text-[10px]"
      >
        {{ alerts.unread }}
      </Badge>
    </Button>

    <div
      v-if="alerts.open"
      class="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-card p-2 shadow-md"
    >
      <p class="px-2 py-1 text-xs font-semibold text-muted-foreground">Alertas</p>
      <p v-if="alerts.items.length === 0" class="px-2 py-3 text-sm text-muted-foreground">
        Nenhum alerta.
      </p>
      <button
        v-for="item in alerts.items.slice(0, 8)"
        :key="item.id"
        type="button"
        class="flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left hover:bg-accent"
        @click="alerts.markRead(item.id)"
      >
        <span class="text-sm font-medium">{{ item.title }}</span>
        <span class="text-xs text-muted-foreground">{{ item.body }}</span>
        <span class="text-[10px] text-muted-foreground">
          {{ item.channel }} · {{ new Date(item.createdAt).toLocaleString('pt-BR') }}
        </span>
      </button>
    </div>
  </div>
</template>
