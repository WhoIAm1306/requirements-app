import apiClient from './client'

export async function fetchAuthorSuggestions(search: string) {
  const { data } = await apiClient.get<string[]>('/authors', {
    params: { search },
  })
  return data
}

export async function fetchTZPointSuggestions(search: string) {
  const { data } = await apiClient.get<string[]>('/tz-points', {
    params: { search },
  })
  return data
}