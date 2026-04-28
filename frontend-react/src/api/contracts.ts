import apiClient from './client'
import type { ContractItem } from '@/types'

export async function fetchContracts() {
  const { data } = await apiClient.get<ContractItem[]>('/contracts')
  return data
}

export async function searchContracts(search: string) {
  const { data } = await apiClient.get<string[]>('/contracts/search', {
    params: { search },
  })
  return data
}
