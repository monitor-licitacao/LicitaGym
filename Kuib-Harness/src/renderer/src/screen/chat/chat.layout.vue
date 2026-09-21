<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useChatScript } from './chat.script'

const { draft, messages, canSend, sendMessage } = useChatScript()
</script>

<template>
  <section class="chat">
    <header class="chat__header">
      <h2 class="chat__title">Chat</h2>
      <Badge variant="secondary">local</Badge>
    </header>

    <ScrollArea class="chat__messages">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="chat__bubble"
        :class="msg.role === 'user' ? 'chat__bubble--user' : 'chat__bubble--assistant'"
      >
        {{ msg.content }}
      </div>
    </ScrollArea>

    <footer class="chat__composer">
      <Textarea
        v-model="draft"
        placeholder="Descreva a tarefa…"
        :rows="3"
        @keydown.enter.exact.prevent="sendMessage"
      />
      <div class="chat__actions">
        <Button :disabled="!canSend" @click="sendMessage">Enviar</Button>
      </div>
    </footer>
  </section>
</template>

<style scoped src="./chat.css"></style>
