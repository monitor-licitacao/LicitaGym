<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
</script>

<template>
  <section class="home">
    <header>
      <h1>LicitaGym</h1>
      <button type="button" @click="auth.signOut()">Sair</button>
    </header>
    <p>Olá, {{ auth.user?.email }}</p>
    <p>Papel: {{ auth.role ?? 'não definido' }}</p>
    <RouterLink v-if="auth.isAdmin" :to="{ name: 'admin' }">Abrir administração</RouterLink>
    <p v-else>Sem acesso à área admin.</p>
  </section>
</template>

<style scoped>
.home {
  padding: 2rem;
  max-width: 640px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
</style>
