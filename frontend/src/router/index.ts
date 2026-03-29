import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '@/pages/LoginPage.vue'
import RequirementsPage from '@/pages/RequirementsPage.vue'
import AdminUsersPage from '@/pages/AdminUsersPage.vue'
import GKDirectoryPage from '@/pages/GKDirectoryPage.vue'

// Роутер приложения.
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/requirements' },
    { path: '/login', component: LoginPage },
    { path: '/requirements', component: RequirementsPage },
    {
      path: '/admin/users',
      component: AdminUsersPage,
      meta: { requiresAdmin: true },
    },
    { path: '/gk-directory', component: GKDirectoryPage },
  ],
})

// Простой client-side guard.
// Для MVP нам достаточно localStorage + роли из профиля.
router.beforeEach((to) => {
  const token = localStorage.getItem('accessToken')
  const rawProfile = localStorage.getItem('profile')
  const profile = rawProfile ? JSON.parse(rawProfile) : null

  const isAuth = Boolean(token)

  if (to.path !== '/login' && !isAuth) {
    return '/login'
  }

  if (to.path === '/login' && isAuth) {
    return '/requirements'
  }

  if (to.meta.requiresAdmin && !profile?.isSuperuser) {
    return '/requirements'
  }
})

export default router