import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import type { LocalAdminSession } from '../../../../shared/auth-types'
import { supabase } from '@/lib/supabase'

export const TOKEN_KEY = 'kuib.admin.token'

type AppRole = 'admin' | 'member'

function extractRole(user: User | null | undefined): AppRole | null {
  const raw = user?.app_metadata?.role
  return raw === 'admin' || raw === 'member' ? raw : null
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const localAdmin = ref<LocalAdminSession | null>(null)
  const ready = ref(false)
  const localAdminConfigured = ref(false)

  const user = computed(() => {
    if (localAdmin.value) {
      return { email: localAdmin.value.login }
    }
    return session.value?.user ?? null
  })

  const role = computed<AppRole | null>(() => {
    if (localAdmin.value?.role === 'admin') return 'admin'
    return extractRole(session.value?.user ?? null)
  })

  const isAuthenticated = computed(() => localAdmin.value !== null || session.value !== null)
  const isAdmin = computed(() => role.value === 'admin')

  let bootstrapPromise: Promise<void> | null = null

  function bootstrap(): Promise<void> {
    if (bootstrapPromise) return bootstrapPromise
    bootstrapPromise = (async () => {
      if (window.auth) {
        const status = await window.auth.status()
        localAdminConfigured.value = status.localAdminConfigured
        const saved = localStorage.getItem(TOKEN_KEY)
        if (saved) {
          const valid = await window.auth.validate(saved)
          if (valid) localAdmin.value = valid
          else localStorage.removeItem(TOKEN_KEY)
        }
      }

      if (supabase) {
        const { data } = await supabase.auth.getSession()
        session.value = data.session
        supabase.auth.onAuthStateChange((_event, nextSession) => {
          session.value = nextSession
        })
      }

      ready.value = true
    })()
    return bootstrapPromise
  }

  async function signIn(login: string, senha: string): Promise<void> {
    if (!window.auth) throw new Error('Auth IPC indisponível')
    const result = await window.auth.login(login.trim(), senha)
    localAdmin.value = result
    localStorage.setItem(TOKEN_KEY, result.token)
  }

  async function signInSupabase(email: string, password: string): Promise<void> {
    if (!supabase) throw new Error('Supabase não configurado (.env)')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
  }

  async function signOut(): Promise<void> {
    if (localAdmin.value && window.auth) {
      await window.auth.logout(localAdmin.value.token)
      localStorage.removeItem(TOKEN_KEY)
      localAdmin.value = null
    }
    if (supabase) await supabase.auth.signOut()
    session.value = null
  }

  return {
    session,
    localAdmin,
    localAdminConfigured,
    ready,
    user,
    role,
    isAuthenticated,
    isAdmin,
    bootstrap,
    signIn,
    signInSupabase,
    signOut,
  }
})
