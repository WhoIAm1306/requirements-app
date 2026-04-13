import axios from 'axios'

/**
 * Единый HTTP-клиент к `/api`: Bearer из localStorage, редирект на /login при 401.
 * baseURL — VITE_API_BASE_URL или относительный `/api` за reverse-proxy.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

// Перед каждым запросом автоматически подставляем Bearer token.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// На 401 очищаем локальную сессию и отправляем на логин.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('profile')

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default apiClient