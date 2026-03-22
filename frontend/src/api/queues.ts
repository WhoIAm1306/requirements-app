import apiClient from './client'
import type { QueueItem } from '@/types'

export async function fetchQueues() {
  const { data } = await apiClient.get<QueueItem[]>('/queues')
  return data
}

export async function createQueue(number: number) {
  const { data } = await apiClient.post<QueueItem>('/queues', { number })
  return data
}