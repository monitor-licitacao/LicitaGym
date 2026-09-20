import type { NavigationGuardWithThis } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/**
 * Gate de autenticação + papel.
 *
 * Isto é UX, não segurança: o renderer é código do cliente e pode ser
 * adulterado. Toda rota admin precisa ser coberta por RLS no Supabase
 * (e/ou pelo gate de IPC no main process) — ver `src/main/ipc/admin.ts`.
 */
export const roleGuard: NavigationGuardWithThis<undefined> = async (to) => {
  const auth = useAuthStore()

  // Garante que a sessão foi resolvida antes de decidir (evita bounce no boot).
  await auth.bootstrap()

  if (!to.meta.requiresAuth) return true

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const allowed = to.meta.roles
  if (allowed?.length && (!auth.role || !allowed.includes(auth.role))) {
    return { name: 'forbidden' }
  }

  return true
}

export const titleGuard: NavigationGuardWithThis<undefined> = (to) => {
  document.title = to.meta.title ? `${to.meta.title} · LicitaGym` : 'LicitaGym'
  return true
}
