<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listAdminUsuarios } from '@/lib/admin-api'
import type { AdminUsuario } from '../../../../shared/admin-types'

const usuarios = ref<AdminUsuario[]>([])
const erro = ref<string | null>(null)
const carregando = ref(true)

onMounted(async () => {
  try {
    usuarios.value = await listAdminUsuarios()
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Falha ao listar usuários'
  } finally {
    carregando.value = false
  }
})
</script>

<template>
  <section>
    <h1>Usuários</h1>
    <p v-if="carregando">Carregando…</p>
    <p v-else-if="erro" role="alert">{{ erro }}</p>
    <p v-else-if="usuarios.length === 0">Nenhum perfil encontrado.</p>
    <table v-else>
      <thead>
        <tr>
          <th>E-mail</th>
          <th>Criado em</th>
          <th>ID</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.id">
          <td>{{ u.email ?? '—' }}</td>
          <td>{{ u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : '—' }}</td>
          <td><code>{{ u.id }}</code></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
