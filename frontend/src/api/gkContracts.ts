import apiClient from './client'
import type {
  CreateGKContractPayload,
  CreateGKStagePayload,
  ContractAttachmentItem,
  GKContractDetails,
  GKFunction,
  GKFunctionCardView,
  JiraEpicStatusItem,
  JiraEpicStatusesFunctionItem,
  GKStage,
  Requirement,
  UpdateGKContractPayload,
  UpsertGKFunctionPayload,
} from '@/types'

export async function fetchGKContracts() {
  const { data } = await apiClient.get(`/contracts`)
  return data as any
}

export async function fetchGKContractDetails(contractId: number) {
  const { data } = await apiClient.get<GKContractDetails>(`/contracts/${contractId}`)
  return data
}

export async function fetchGKStages(contractId: number) {
  const { data } = await apiClient.get<GKStage[]>(`/contracts/${contractId}/stages`)
  return data
}

export async function fetchGKFunctionsForStage(contractId: number, stageNumber: number) {
  const { data } = await apiClient.get<GKFunction[]>(
    `/contracts/${contractId}/stages/${stageNumber}/functions`,
  )
  return data
}

export function normalizeGKFunctionCards(items: GKFunction[]): GKFunctionCardView[] {
  return normalizeGKFunctionCardsWithStatuses(items, {})
}

function deriveSyncStatus(epics: JiraEpicStatusItem[]) {
  if (epics.length === 0) return 'unknown' as const
  if (epics.some((x) => x.syncStatus === 'error')) return 'error' as const
  if (epics.some((x) => x.syncStatus === 'synced')) return 'synced' as const
  return 'planned' as const
}

export function normalizeGKFunctionCardsWithStatuses(
  items: GKFunction[],
  statusesByFunction: Record<number, JiraEpicStatusItem[]>,
): GKFunctionCardView[] {
  return items.map((item) => {
    const confluenceLinks = Array.isArray(item.confluenceLinks) ? item.confluenceLinks.filter(Boolean) : []
    const jiraEpicLinks = Array.isArray(item.jiraEpicLinks) ? item.jiraEpicLinks.filter(Boolean) : []
    const epicStatuses = statusesByFunction[item.id] || []
    return {
      id: item.id,
      contractId: item.contractId,
      contractStageId: item.contractStageId,
      functionName: item.functionName || '',
      nmckFunctionNumber: item.nmckFunctionNumber || '',
      tzSectionNumber: item.tzSectionNumber || '',
      confluenceLinks,
      jiraEpicLinks,
      confluenceCount: confluenceLinks.length,
      jiraEpicCount: jiraEpicLinks.length,
      linksCount: confluenceLinks.length + jiraEpicLinks.length,
      jiraEpicSyncStatus: deriveSyncStatus(epicStatuses),
      jiraEpicStatuses: epicStatuses,
    }
  })
}

export async function fetchStageJiraEpicStatuses(contractId: number, stageNumber: number) {
  const { data } = await apiClient.get<{ items: JiraEpicStatusesFunctionItem[] }>(
    `/contracts/${contractId}/stages/${stageNumber}/functions/jira-epic-statuses`,
  )
  const byFunction: Record<number, JiraEpicStatusItem[]> = {}
  for (const row of data.items || []) {
    byFunction[row.functionId] = Array.isArray(row.epics) ? row.epics : []
  }
  return byFunction
}

export async function previewJiraEpicStatuses(links: string[]) {
  const { data } = await apiClient.post<{ items: JiraEpicStatusItem[] }>(`/contracts/jira-epic-status-preview`, {
    links,
  })
  return Array.isArray(data.items) ? data.items : []
}

export async function fetchFunctionRequirements(contractId: number, functionId: number) {
  const { data } = await apiClient.get<Requirement[]>(`/contracts/${contractId}/functions/${functionId}/requirements`)
  return data
}

export async function bindRequirementsToFunction(contractId: number, functionId: number, requirementIds: number[]) {
  const { data } = await apiClient.post(`/contracts/${contractId}/functions/${functionId}/requirements/bind`, {
    requirementIds,
  })
  return data as { updated: number }
}

export async function unbindRequirementsFromFunction(contractId: number, functionId: number, requirementIds: number[]) {
  const { data } = await apiClient.post(`/contracts/${contractId}/functions/${functionId}/requirements/unbind`, {
    requirementIds,
  })
  return data as { updated: number }
}

export async function createGKContract(payload: CreateGKContractPayload) {
  const { data } = await apiClient.post(`/contracts`, payload)
  return data as GKContractDetails
}

export async function updateGKContract(contractId: number, payload: UpdateGKContractPayload) {
  const { data } = await apiClient.put(`/contracts/${contractId}`, payload)
  return data
}

export async function createGKStage(contractId: number, payload: CreateGKStagePayload) {
  const { data } = await apiClient.post(`/contracts/${contractId}/stages`, payload)
  return data
}

export async function updateGKStage(contractId: number, stageNumber: number, stageName: string) {
  const { data } = await apiClient.put(`/contracts/${contractId}/stages/${stageNumber}`, { stageName })
  return data
}

export async function upsertGKFunction(contractId: number, payload: UpsertGKFunctionPayload) {
  const { data } = await apiClient.post(`/contracts/${contractId}/functions`, payload)
  return data
}

export async function fetchGKAttachments(contractId: number) {
  const { data } = await apiClient.get<ContractAttachmentItem[]>(`/contracts/${contractId}/attachments`)
  return data
}

export async function uploadGKAttachments(
  contractId: number,
  type: 'tz' | 'nmck',
  files: File[],
) {
  const formData = new FormData()
  formData.append('type', type)
  files.forEach((f) => formData.append('files', f))

  const { data } = await apiClient.post(`/contracts/${contractId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return data
}

export async function downloadGKAttachment(attachmentId: number) {
  const response = await apiClient.get(`/contracts/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  })
  return response
}

export async function deleteGKContract(contractId: number) {
  await apiClient.delete(`/contracts/${contractId}`)
}

export async function deleteGKStage(contractId: number, stageNumber: number) {
  await apiClient.delete(`/contracts/${contractId}/stages/${stageNumber}`)
}

export async function deleteGKFunction(contractId: number, functionId: number) {
  await apiClient.delete(`/contracts/${contractId}/functions/${functionId}`)
}

export async function deleteGKAttachment(attachmentId: number) {
  await apiClient.delete(`/contracts/attachments/${attachmentId}`)
}

