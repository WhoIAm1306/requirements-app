import apiClient from './client'
import type { ChangePasswordPayload, LoginPayload, LoginResponse, UserProfile } from '@/types'

export async function login(payload: LoginPayload) {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function fetchMe() {
  const { data } = await apiClient.get<UserProfile>('/auth/me')
  return data
}

export async function changePassword(payload: ChangePasswordPayload) {
  const { data } = await apiClient.post<{ message: string }>('/auth/change-password', payload)
  return data
}
