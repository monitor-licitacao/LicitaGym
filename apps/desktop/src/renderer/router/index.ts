import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { roleGuard, titleGuard } from './guards'
import './types'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { title: 'Entrar' },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomePage.vue'),
    meta: { requiresAuth: true, title: 'Início' },
  },

  // --- Área exclusiva de admin ---
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: '',
        name: 'admin',
        component: () => import('../pages/admin/AdminHome.vue'),
        meta: { title: 'Administração' },
      },
      {
        path: 'usuarios',
        name: 'admin-usuarios',
        component: () => import('../pages/admin/AdminUsuarios.vue'),
        meta: { title: 'Usuários' },
      },
    ],
  },

  {
    path: '/403',
    name: 'forbidden',
    component: () => import('../pages/ForbiddenPage.vue'),
    meta: { title: 'Acesso negado' },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
]

export const router = createRouter({
  // Hash history: `file://` no Electron empacotado não suporta history API.
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(roleGuard)
router.afterEach(titleGuard)
