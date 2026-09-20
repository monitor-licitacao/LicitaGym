import 'vue-router'
import type { AppRole } from '../stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Exige sessão válida. */
    requiresAuth?: boolean
    /** Papéis autorizados. Vazio/ausente = qualquer papel autenticado. */
    roles?: AppRole[]
    title?: string
  }
}

export {}
