import apiClient from './client'

export async function exportRequirementsFile(params?: {
  systemType?: string
  status?: string
  search?: string
  includeArchived?: boolean
  implementationQueue?: string
}) {
  const response = await apiClient.get('/export/requirements', {
    params,
    responseType: 'blob',
  })

  return response.data
}