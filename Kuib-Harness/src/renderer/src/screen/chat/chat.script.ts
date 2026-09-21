import { computed, ref } from 'vue'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const draft = ref('')
const messages = ref<ChatMessage[]>([
  {
    id: uid(),
    role: 'assistant',
    content: 'Kuib Harness pronto. Descreva a tarefa para eu organizar no kanban.',
    createdAt: Date.now(),
  },
])

const canSend = computed(() => draft.value.trim().length > 0)

function sendMessage(): void {
  const text = draft.value.trim()
  if (!text) return
  messages.value.push({
    id: uid(),
    role: 'user',
    content: text,
    createdAt: Date.now(),
  })
  draft.value = ''
  messages.value.push({
    id: uid(),
    role: 'assistant',
    content: `Recebi: “${text}”. Use o kanban à direita para acompanhar o fluxo.`,
    createdAt: Date.now(),
  })
}

export function useChatScript() {
  return { draft, messages, canSend, sendMessage }
}
