<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const login = ref('')
const senha = ref('')
const erro = ref<string | null>(null)
const enviando = ref(false)
const hintLogin = ref<string | null>(null)
const hintSenhaLen = ref(0)

onMounted(async () => {
  try {
    const status = await window.auth.status()
    if (status.configuredLogin) {
      hintLogin.value = status.configuredLogin
      login.value = status.configuredLogin
      hintSenhaLen.value = status.configuredSenhaLen
    }
  } catch {
    // IPC indisponível fora do Electron
  }
})

async function onSubmit(): Promise<void> {
  erro.value = null
  enviando.value = true
  try {
    await auth.signIn(login.value.trim(), senha.value.trim())
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Falha ao entrar'
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <section class="mx-auto mt-16 max-w-sm rounded-xl border bg-card p-6 shadow-sm">
    <h1 class="m-0 text-xl font-bold tracking-tight">Kuib Harness</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      Login admin — valores de <code>Kuib-Harness/.env.local</code> (<code>ADMIN_LOGIN</code> /
      <code>ADMIN_SENHA</code>).
    </p>
    <p v-if="hintLogin" class="mt-2 text-xs text-muted-foreground">
      Login pré-preenchido ({{ hintLogin.length }} chars). Senha esperada:
      {{ hintSenhaLen }} chars.
    </p>

    <form class="mt-4 flex flex-col gap-3" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1 text-sm">
        Login
        <Input v-model="login" type="text" autocomplete="username" required />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Senha
        <Input
          v-model="senha"
          type="password"
          autocomplete="current-password"
          required
          :placeholder="hintSenhaLen ? `${hintSenhaLen} caracteres` : undefined"
        />
      </label>
      <p v-if="erro" class="m-0 text-sm text-destructive" role="alert">{{ erro }}</p>
      <Button type="submit" :disabled="enviando">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </Button>
    </form>
  </section>
</template>
