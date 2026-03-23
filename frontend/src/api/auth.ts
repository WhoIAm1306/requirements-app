import apiClient from './client'
import type { ChangePasswordPayload, LoginPayload, LoginResponse, UserProfile } from '@/types'

// Логин по email/паролю.
export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
  return data
}

// Чтение текущего профиля по JWT.
export async function fetchMe() {
  const { data } = await apiClient.get<UserProfile>('/auth/me')
  return data
}

// Смена собственного пароля.
export async function changePassword(payload: ChangePasswordPayload) {
  const { data } = await apiClient.post<{ message: string }>('/auth/change-password', payload)
  return data
}