import apiClient from './client'
import type { AdminUser, CreateAdminUserPayload, UpdateAdminUserPayload } from '@/types'

export interface AdminUsersImportResult {
  created: number
  updated: number
  failed: number
  errors: string[]
}

// Список пользователей для административной панели.
export async function fetchAdminUsers() {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users')
  return data
}

// Создание пользователя.
export async function createAdminUser(payload: CreateAdminUserPayload) {
  const { data } = await apiClient.post<AdminUser>('/admin/users', payload)
  return data
}

// Обновление пользователя.
export async function updateAdminUser(id: number, payload: UpdateAdminUserPayload) {
  const { data } = await apiClient.put<AdminUser>(`/admin/users/${id}`, payload)
  return data
}

// Удаление пользователя (суперпользователь).
export async function deleteAdminUser(id: number) {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/users/${id}`)
  return data
}

// Смена пароля выбранного пользователя администратором.
export async function changeAdminUserPassword(id: number, newPassword: string) {
  const { data } = await apiClient.post<{ message: string }>(`/admin/users/${id}/change-password`, {
    newPassword,
  })
  return data
}

// Экспорт таблицы пользователей и прав.
export async function exportAdminUsersFile() {
  const { data } = await apiClient.get<Blob>('/admin/users/export', { responseType: 'blob' })
  return data
}

// Импорт новых пользователей из Excel.
export async function importAdminUsersFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<AdminUsersImportResult>('/admin/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}