import type { NavigationGuard } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export const roleGuard: NavigationGuard = async (to) => {
  const auth = useAuthStore()
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

export const titleGuard: NavigationGuard = (to) => {
  document.title = to.meta.title ? `${to.meta.title} · LicitaGym` : 'LicitaGym'
  return true
}
