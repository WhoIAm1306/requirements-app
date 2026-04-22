import apiClient from './client'
import type {
  CreateGKContractPayload,
  CreateGKStagePayload,
  ContractAttachmentItem,
  GKContractDetails,
  GKFunction,
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

