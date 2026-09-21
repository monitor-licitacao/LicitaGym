import type { RouteRecordRaw } from 'vue-router'

export type AppRole = 'admin' | 'member'

export interface AppRouteMeta {
  requiresAuth?: boolean
  roles?: AppRole[]
  title?: string
}

export type AppRouteRecord = RouteRecordRaw & {
  meta?: AppRouteMeta
  children?: AppRouteRecord[]
}
