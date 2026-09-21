<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import AlertBell from '@/components/AlertBell.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import ChatLayout from '@/screen/chat/chat.layout.vue'
import SyncsLayout from '@/screen/syncs/syncs.layout.vue'
import { useHarnessScript } from './harness.script'

const { title } = useHarnessScript()
const auth = useAuthStore()
const router = useRouter()

async function onSignOut(): Promise<void> {
  await auth.signOut()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="harness">
    <header class="harness__topbar">
      <h1 class="harness__brand">{{ title }}</h1>
      <div class="flex items-center gap-2">
        <span class="text-sm text-muted-foreground">{{ auth.user?.email }}</span>
        <Badge variant="secondary">ini-04 syncs</Badge>
        <RouterLink to="/providers">
          <Button size="sm" variant="outline">Providers</Button>
        </RouterLink>
        <AlertBell />
        <Button size="sm" variant="ghost" @click="onSignOut">Sair</Button>
      </div>
    </header>

    <div class="harness__body">
      <aside class="harness__chat">
        <ChatLayout />
      </aside>
      <main class="harness__kanban">
        <SyncsLayout />
      </main>
    </div>
  </div>
</template>

<style scoped src="./harness.css"></style>
