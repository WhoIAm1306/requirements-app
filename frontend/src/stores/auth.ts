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
  /** Добавление комментариев: edit/superuser или грант при read. */
  const canCommentRequirements = computed(
    () =>
      Boolean(profile.value?.isSuperuser) ||
      (profile.value?.accessLevel || 'read') === 'edit' ||
      Boolean(profile.value?.requirementFieldGrants?.comment),
  )

  const canEditRequirementsFully = computed(
    () => Boolean(profile.value?.isSuperuser) || (profile.value?.accessLevel || 'read') === 'edit',
  )

  /** Read + есть грант хотя бы на одно поле карточки (не только comment). */
  const hasPartialRequirementFieldEdit = computed(() => {
    if (canEditRequirementsFully.value) return false
    if ((profile.value?.accessLevel || 'read') !== 'read') return false
    const g = profile.value?.requirementFieldGrants
    if (!g) return false
    return Object.entries(g).some(([k, v]) => Boolean(v) && k !== 'comment')
  })

  const canManageRequirementCard = computed(
    () => canEditRequirementsFully.value || hasPartialRequirementFieldEdit.value,
  )

  const canEditGKContract = computed(
    () =>
      Boolean(profile.value?.isSuperuser) ||
      ((profile.value?.accessLevel || 'read') === 'edit' &&
        Boolean(profile.value?.gkDirectoryGrants?.gkContractEdit)),
  )

  const canEditGKStages = computed(
    () =>
      Boolean(profile.value?.isSuperuser) ||
      ((profile.value?.accessLevel || 'read') === 'edit' &&
        Boolean(profile.value?.gkDirectoryGrants?.gkStageEdit)),
  )

  const canEditGKFunctions = computed(
    () =>
      Boolean(profile.value?.isSuperuser) ||
      ((profile.value?.accessLevel || 'read') === 'edit' &&
        Boolean(profile.value?.gkDirectoryGrants?.gkFunctionEdit)),
  )

  const canDeleteRequirements = computed(
    () =>
      Boolean(profile.value?.isSuperuser) ||
      ((profile.value?.accessLevel || 'read') === 'edit' &&
        Boolean(profile.value?.requirementFieldGrants?.deleteRequirement)),
  )

  function canEditRequirementField(key: string): boolean {
    if (canEditRequirementsFully.value) return true
    return Boolean(profile.value?.requirementFieldGrants?.[key])
  }

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
    canCommentRequirements,
    canEditRequirementsFully,
    hasPartialRequirementFieldEdit,
    canManageRequirementCard,
    canEditRequirementField,
    canEditGKContract,
    canEditGKStages,
    canEditGKFunctions,
    canDeleteRequirements,
    setAuth,
    setProfile,
    logout,
    isAuthenticated,
  }
})