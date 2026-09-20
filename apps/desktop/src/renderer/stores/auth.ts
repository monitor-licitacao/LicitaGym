import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AppRole = 'admin' | 'member'

/**
 * Fonte de verdade do papel: `app_metadata` do JWT (só o service_role escreve).
 * `user_metadata` NUNCA é usado — é editável pelo próprio usuário.
 */
function extractRole(user: User | null): AppRole | null {
  const raw = user?.app_metadata?.role
  return raw === 'admin' || raw === 'member' ? raw : null
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const ready = ref(false)

  const user = computed(() => session.value?.user ?? null)
  const role = computed<AppRole | null>(() => extractRole(user.value))
  const isAuthenticated = computed(() => session.value !== null)
  const isAdmin = computed(() => role.value === 'admin')

  /** Resolve uma única vez na inicialização; o router espera este promise. */
  let bootstrapPromise: Promise<void> | null = null

  function bootstrap(): Promise<void> {
    if (bootstrapPromise) return bootstrapPromise

    bootstrapPromise = (async () => {
      const { data } = await supabase.auth.getSession()
      session.value = data.session

      supabase.auth.onAuthStateChange((_event, nextSession) => {
        session.value = nextSession
      })

      ready.value = true
    })()

    return bootstrapPromise
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    session.value = null
  }

  return { session, ready, user, role, isAuthenticated, isAdmin, bootstrap, signOut }
})
