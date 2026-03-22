import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Organization } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const fullName = ref(localStorage.getItem('fullName') || '')
  const organization = ref((localStorage.getItem('organization') as Organization) || 'ДИТ')
  const token = ref(localStorage.getItem('token') || '')

  function setAuth(payload: { fullName: string; organization: Organization; token: string }) {
    fullName.value = payload.fullName
    organization.value = payload.organization
    token.value = payload.token

    localStorage.setItem('fullName', payload.fullName)
    localStorage.setItem('organization', payload.organization)
    localStorage.setItem('token', payload.token)
  }

  function logout() {
    fullName.value = ''
    organization.value = 'ДИТ'
    token.value = ''

    localStorage.removeItem('fullName')
    localStorage.removeItem('organization')
    localStorage.removeItem('token')
  }

  function isAuthenticated() {
    return Boolean(fullName.value && organization.value)
  }

  return {
    fullName,
    organization,
    token,
    setAuth,
    logout,
    isAuthenticated,
  }
})