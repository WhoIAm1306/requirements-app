import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { LoginResponse, UserProfile } from '@/types'

// Pinia-store с JWT и профилем пользователя.
export const useAuthStore = defineStore('auth', () => {
  // Токен живёт в localStorage, чтобы сессия переживала перезагрузку страницы.
  const token = ref(localStorage.getItem('accessToken') || '')

  // Профиль также кэшируем в localStorage.
  const rawProfile = localStorage.getItem('profile')
  const profile = ref<UserProfile | null>(rawProfile ? JSON.parse(rawProfile) : null)

  // Совместимость со старым кодом в формах.
  const fullName = computed(() => profile.value?.fullName || '')
  const organization = computed(() => profile.value?.organization || '')
  const email = computed(() => profile.value?.email || '')
  const isSuperuser = computed(() => Boolean(profile.value?.isSuperuser))
  const accessLevel = computed(() => profile.value?.accessLevel || 'read')

  // Установка сессии после логина.
  function setAuth(payload: LoginResponse) {
    token.value = payload.accessToken
    profile.value = payload.profile

    localStorage.setItem('accessToken', payload.accessToken)
    localStorage.setItem('profile', JSON.stringify(payload.profile))
  }

  // Обновление профиля без смены токена.
  function setProfile(value: UserProfile) {
    profile.value = value
    localStorage.setItem('profile', JSON.stringify(value))
  }

  // Полный logout.
  function logout() {
    token.value = ''
    profile.value = null

    localStorage.removeItem('accessToken')
    localStorage.removeItem('profile')
  }

  // Проверка авторизации.
  function isAuthenticated() {
    return Boolean(token.value)
  }

  return {
    token,
    profile,
    fullName,
    organization,
    email,
    accessLevel,
    isSuperuser,
    setAuth,
    setProfile,
    logout,
    isAuthenticated,
  }
})