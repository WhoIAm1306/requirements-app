import apiClient from './client'
import type {
  Requirement,
  RequirementAttachmentLibraryItem,
  RequirementPayload,
} from '@/types'

/** Общие query-параметры списка и экспорта Excel (совпадают с бэкендом). */
export type RequirementListQuery = {
  systemType?: string
  /** true — только раздел «Телефония»; false — без этого раздела (в сочетании с systemType). */
  telephonySection?: 'true' | 'false'
  status?: string
  search?: string
  includeArchived?: boolean
  archivedOnly?: boolean
  noFunction?: boolean
  implementationQueue?: string
  /** Порядок по порядковому номеру: asc — старые сверху, desc — новые сверху. */
  sortOrder?: 'asc' | 'desc'
}

export type ArchiveRequirementReason = 'completed' | 'outdated'

/**
 * Получение списка предложений.
 */
export async function fetchRequirements(params?: RequirementListQuery) {
  const { data } = await apiClient.get<Requirement[]>('/requirements', { params })
  return data
}

/** Экспорт таблицы предложений в Excel (тот же фильтр, что у списка). */
export async function exportRequirementsFile(params?: RequirementListQuery) {
  const response = await apiClient.get('/export/requirements', {
    params,
    responseType: 'blob',
  })
  return response.data as Blob
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
 * Удаление комментария к предложению.
 */
export async function deleteRequirementComment(id: number, commentId: number) {
  await apiClient.delete(`/requirements/${id}/comments/${commentId}`)
}

/**
 * Архивирование предложения.
 */
export async function archiveRequirement(id: number, reason: ArchiveRequirementReason) {
  const { data } = await apiClient.post(`/requirements/${id}/archive`, { reason })
  return data
}

/**
 * Восстановление предложения из архива.
 */
export async function restoreRequirement(id: number) {
  const { data } = await apiClient.post(`/requirements/${id}/restore`)
  return data
}

export async function unlinkRequirementGK(id: number) {
  const { data } = await apiClient.post(`/requirements/${id}/unlink-gk`)
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
  confluenceLinks?: string[]
  jiraEpicLinks?: string[]
  tzPointText: string
  nmckPointText: string
}

export async function fetchRequirementGKLink(id: number) {
  const { data } = await apiClient.get<RequirementGKLinkInfo>(`/requirements/${id}/gk-link`)
  return data
}

/** Справочник ранее загруженных файлов (подсказки для прикрепления). */
export async function fetchRequirementAttachmentLibrary(search?: string) {
  const { data } = await apiClient.get<RequirementAttachmentLibraryItem[]>(
    '/requirements/attachment-library',
    { params: search?.trim() ? { search: search.trim() } : {} },
  )
  return data
}

export async function uploadRequirementAttachments(id: number, files: File[]) {
  const formData = new FormData()
  for (const f of files) {
    formData.append('files', f)
  }
  const { data } = await apiClient.post<{ created: number }>(
    `/requirements/${id}/attachments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

export async function attachRequirementFromLibrary(id: number, libraryFileId: number) {
  const { data } = await apiClient.post<unknown>(`/requirements/${id}/attachments/from-library`, {
    libraryFileId,
  })
  return data
}

export async function downloadRequirementAttachment(attachmentId: number) {
  return apiClient.get(`/requirements/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  })
}

export async function deleteRequirementAttachment(attachmentId: number) {
  await apiClient.delete(`/requirements/attachments/${attachmentId}`)
}