import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AlertItem } from '../../../../shared/alert-types'

export const useAlertsStore = defineStore('alerts', () => {
  const items = ref<AlertItem[]>([])
  const open = ref(false)
  let unsubscribe: (() => void) | null = null

  const unread = computed(
    () => items.value.filter((i) => !i.read && i.channel === 'bell').length,
  )

  async function bootstrap(): Promise<void> {
    if (!window.alerts) return
    items.value = await window.alerts.list()
    unsubscribe?.()
    unsubscribe = window.alerts.onPush((item) => {
      items.value = [item, ...items.value.filter((i) => i.id !== item.id)]
      if (item.channel === 'bell') open.value = true
    })
  }

  async function markRead(id: string): Promise<void> {
    await window.alerts.markRead(id)
    const item = items.value.find((i) => i.id === id)
    if (item) item.read = true
  }

  function toggle(): void {
    open.value = !open.value
  }

  return { items, open, unread, bootstrap, markRead, toggle }
})
