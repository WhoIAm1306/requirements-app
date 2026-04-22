import { createRouter, createWebHistory } from 'vue-router'

/** Ленивая загрузка страниц — меньше JS при первом входе (кроме логина). */
const LoginPage = () => import('@/pages/LoginPage.vue')
const RequirementsPage = () => import('@/pages/RequirementsPage.vue')
const AdminUsersPage = () => import('@/pages/AdminUsersPage.vue')
const GKDirectoryPage = () => import('@/pages/GKDirectoryPage.vue')
const FunctionsDirectoryPage = () => import('@/pages/FunctionsDirectoryPage.vue')

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
    { path: '/functions-directory', component: FunctionsDirectoryPage },
  ],
})

// Guard: токен в localStorage; админ-роуты только для isSuperuser из профиля.
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