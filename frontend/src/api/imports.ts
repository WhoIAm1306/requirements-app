import apiClient from './client'

export interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: string[]
}

export async function importRequirementsFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post<ImportResult>('/import/requirements', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}

export async function importTZPointsFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post<ImportResult>('/import/tz-points', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}