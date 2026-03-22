import axios from 'axios'

function encodeHeaderValue(value: string) {
  return btoa(unescape(encodeURIComponent(value)))
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

apiClient.interceptors.request.use((config) => {
  const fullName = localStorage.getItem('fullName')
  const organization = localStorage.getItem('organization')

  if (fullName) {
    config.headers['X-User-Name'] = encodeHeaderValue(fullName)
  }

  if (organization) {
    config.headers['X-User-Org'] = encodeHeaderValue(organization)
  }

  return config
})

export default apiClient