<script setup lang="ts">
import { onMounted, ref } from 'vue'

interface AdminStats {
  usuarios: number
  sincronizacoesPendentes: number
}

const stats = ref<AdminStats | null>(null)
const erro = ref<string | null>(null)
const carregando = ref(true)

onMounted(async () => {
  try {
    // Passa pelo gate do main process, que revalida o papel no Supabase.
    stats.value = await window.admin.getStats()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Falha ao carregar métricas'
  } finally {
    carregando.value = false
  }
})
</script>

<template>
  <section>
    <h1>Painel administrativo</h1>

    <p v-if="carregando">Carregando…</p>
    <p v-else-if="erro" role="alert">{{ erro }}</p>
    <dl v-else-if="stats">
      <dt>Usuários</dt>
      <dd>{{ stats.usuarios }}</dd>
      <dt>Sincronizações pendentes</dt>
      <dd>{{ stats.sincronizacoesPendentes }}</dd>
    </dl>
  </section>
</template>
