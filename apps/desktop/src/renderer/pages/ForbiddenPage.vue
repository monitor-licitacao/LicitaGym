<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section>
    <h1>403 — Acesso negado</h1>
    <p>Esta área é exclusiva de administradores.</p>
    <RouterLink :to="{ name: 'home' }">Voltar ao início</RouterLink>
  </section>
</template>
