import { createRouter, createWebHashHistory } from 'vue-router'
import type { AppRouteRecord } from './types'
import { roleGuard, titleGuard } from './guards'

const routes: AppRouteRecord[] = [
  {
    path: '/',
    name: 'harness',
    component: () => import('@/screen/harness/harness.layout.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: 'Harness' },
  },
  {
    path: '/providers',
    name: 'providers',
    component: () => import('@/screen/providers/providers.layout.vue'),
    meta: { requiresAuth: true, roles: ['admin'], title: 'Providers' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { title: 'Entrar' },
  },
  {
    path: '/home',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { requiresAuth: true, title: 'Início' },
  },
  {
    path: '/admin',
    component: () => import('@/pages/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: '',
        name: 'admin',
        component: () => import('@/pages/admin/AdminHome.vue'),
        meta: { title: 'Administração' },
      },
      {
        path: 'usuarios',
        name: 'admin-usuarios',
        component: () => import('@/pages/admin/AdminUsuarios.vue'),
        meta: { title: 'Usuários' },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/pages/ForbiddenPage.vue'),
    meta: { title: 'Acesso negado' },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'harness' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(roleGuard)
router.afterEach(titleGuard)

export default router
