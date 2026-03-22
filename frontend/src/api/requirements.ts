import apiClient from './client'
import type { Requirement, RequirementPayload, CommentItem } from '@/types'

export async function fetchRequirements(params?: {
  systemType?: string
  status?: string
  search?: string
  includeArchived?: boolean
  implementationQueue?: string
}) {
  const { data } = await apiClient.get<Requirement[]>('/requirements', { params })
  return data
}

export async function fetchRequirementById(id: number) {
  const { data } = await apiClient.get<Requirement>(`/requirements/${id}`)
  return data
}

export async function createRequirement(payload: RequirementPayload) {
  const { data } = await apiClient.post<Requirement>('/requirements', payload)
  return data
}

export async function updateRequirement(id: number, payload: RequirementPayload) {
  const { data } = await apiClient.put<Requirement>(`/requirements/${id}`, payload)
  return data
}

export async function addRequirementComment(id: number, commentText: string) {
  const { data } = await apiClient.post<CommentItem>(`/requirements/${id}/comments`, {
    commentText,
  })
  return data
}

export async function archiveRequirement(id: number) {
  const { data } = await apiClient.post<Requirement>(`/requirements/${id}/archive`)
  return data
}

export async function restoreRequirement(id: number) {
  const { data } = await apiClient.post<Requirement>(`/requirements/${id}/restore`)
  return data
}