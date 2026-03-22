import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '@/pages/LoginPage.vue'
import RequirementsPage from '@/pages/RequirementsPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/requirements' },
    { path: '/login', component: LoginPage },
    { path: '/requirements', component: RequirementsPage },
  ],
})

router.beforeEach((to) => {
  const fullName = localStorage.getItem('fullName')
  const organization = localStorage.getItem('organization')

  const isAuth = Boolean(fullName && organization)

  if (to.path !== '/login' && !isAuth) {
    return '/login'
  }

  if (to.path === '/login' && isAuth) {
    return '/requirements'
  }
})

export default router