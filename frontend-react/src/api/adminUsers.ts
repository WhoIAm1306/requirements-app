import apiClient from './client'
import type { AdminUser, CreateAdminUserPayload, UpdateAdminUserPayload } from '@/types'

export interface AdminUsersImportResult {
  created: number
  updated: number
  failed: number
  errors: string[]
}

export interface JiraAPIConfig {
  userEmail: string
  hasToken: boolean
  hasBearerToken?: boolean
  preferredAuth?: 'bearer' | 'basic' | string
}

export async function fetchAdminUsers() {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users')
  return data
}

export async function createAdminUser(payload: CreateAdminUserPayload) {
  const { data } = await apiClient.post<AdminUser>('/admin/users', payload)
  return data
}

export async function updateAdminUser(id: number, payload: UpdateAdminUserPayload) {
  const { data } = await apiClient.put<AdminUser>(`/admin/users/${id}`, payload)
  return data
}

export async function deleteAdminUser(id: number) {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/users/${id}`)
  return data
}

export async function exportAdminUsersFile() {
  const { data } = await apiClient.get<Blob>('/admin/users/export', { responseType: 'blob' })
  return data
}

export async function importAdminUsersFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<AdminUsersImportResult>('/admin/users/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteAllRequirements() {
  const { data } = await apiClient.delete<{ message: string; deleted?: number }>('/admin/requirements')
  return data
}

export async function fetchJiraAPIConfig() {
  const { data } = await apiClient.get<JiraAPIConfig>('/admin/actions/jira-api')
  return data
}

export async function saveJiraAPIConfig(payload: { userEmail?: string; apiToken?: string; bearerToken?: string; preferredAuth?: 'bearer' | 'basic' }) {
  const { data } = await apiClient.post<{ message: string }>('/admin/actions/jira-api', payload)
  return data
}
