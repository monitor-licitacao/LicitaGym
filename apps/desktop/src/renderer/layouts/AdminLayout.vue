<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="admin-shell">
    <aside>
      <strong>Admin</strong>
      <nav>
        <RouterLink :to="{ name: 'admin' }">Painel</RouterLink>
        <RouterLink :to="{ name: 'admin-usuarios' }">Usuários</RouterLink>
      </nav>
      <footer>
        <span>{{ auth.user?.email }}</span>
        <button type="button" @click="auth.signOut()">Sair</button>
      </footer>
    </aside>

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}
aside {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-right: 1px solid #e2e2e2;
}
nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
footer {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.85rem;
}
main {
  padding: 1.5rem;
}
</style>
