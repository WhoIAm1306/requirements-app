import apiClient from './client'
import type { Requirement, RequirementPayload } from '@/types'

/**
 * Получение списка предложений.
 */
export async function fetchRequirements(params?: {
  systemType?: string
  status?: string
  search?: string
  includeArchived?: boolean
  archivedOnly?: boolean
  noFunction?: boolean
  implementationQueue?: string
}) {
  const { data } = await apiClient.get<Requirement[]>('/requirements', { params })
  return data
}

/**
 * Получение одной карточки предложения.
 */
export async function fetchRequirementById(id: number) {
  const { data } = await apiClient.get<Requirement>(`/requirements/${id}`)
  return data
}

/**
 * Создание предложения.
 */
export async function createRequirement(payload: RequirementPayload) {
  const { data } = await apiClient.post<Requirement>('/requirements', payload)
  return data
}

/**
 * Обновление предложения.
 */
export async function updateRequirement(id: number, payload: RequirementPayload) {
  const { data } = await apiClient.put<Requirement>(`/requirements/${id}`, payload)
  return data
}

/**
 * Добавление комментария к предложению.
 */
export async function addRequirementComment(id: number, commentText: string) {
  const { data } = await apiClient.post(`/requirements/${id}/comments`, {
    commentText,
  })
  return data
}

/**
 * Архивирование предложения.
 */
export async function archiveRequirement(id: number) {
  const { data } = await apiClient.post(`/requirements/${id}/archive`)
  return data
}

/**
 * Восстановление предложения из архива.
 */
export async function restoreRequirement(id: number) {
  const { data } = await apiClient.post(`/requirements/${id}/restore`)
  return data
}

export async function deleteRequirement(id: number) {
  await apiClient.delete(`/requirements/${id}`)
}

/** Удалить все предложения (только суперпользователь). */
export async function deleteAllRequirements() {
  const { data } = await apiClient.delete<{ deleted: number; message: string }>('/admin/requirements')
  return data
}

export interface RequirementGKLinkInfo {
  hasFunction: boolean
  contractId: number
  functionId: number
  contractStageId: number
  contractName: string
  stageNumber: number
  stageName: string
  functionName: string
  tzSectionNumber: string
  nmckFunctionNumber: string
  jiraLink: string
  tzPointText: string
  nmckPointText: string
}

export async function fetchRequirementGKLink(id: number) {
  const { data } = await apiClient.get<RequirementGKLinkInfo>(`/requirements/${id}/gk-link`)
  return data
}