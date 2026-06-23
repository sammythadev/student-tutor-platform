import axios, { type AxiosRequestConfig } from 'axios'

// Reads from NEXT_PUBLIC_API_URL — never hardcoded
const BASE_URL = process.env.NEXT_PUBLIC_API_URL

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined. Check your .env.local file.')
}

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

// ─── Request interceptor: inject Bearer token ──────────────────────────────
api.interceptors.request.use((config) => {
  // Lazily import to avoid circular dependency / SSR issues
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('auth-store')
    if (raw) {
      try {
        const state = JSON.parse(raw)
        const token = state?.state?.accessToken
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`
        }
      } catch {
        // malformed storage — ignore
      }
    }
  }
  return config
})

// ─── Response interceptor: silent token refresh on 401 ────────────────────
let isRefreshing = false
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null) => {
  queue.forEach(({ resolve, reject }) => {
    if (token) resolve(token)
    else reject(error)
  })
  queue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              if (originalRequest.headers) {
                (originalRequest.headers as any)['Authorization'] = `Bearer ${token}`
              }
              resolve(api(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const raw = localStorage.getItem('auth-store')
        const state = raw ? JSON.parse(raw) : null
        const refreshToken: string | undefined = state?.state?.refreshToken

        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })

        const newAccessToken: string = data.accessToken
        const newRefreshToken: string = data.refreshToken

        // Persist new tokens into Zustand persisted store
        if (raw) {
          const parsed = JSON.parse(raw)
          parsed.state.accessToken = newAccessToken
          parsed.state.refreshToken = newRefreshToken
          localStorage.setItem('auth-store', JSON.stringify(parsed))
        }

        processQueue(null, newAccessToken)

        if (originalRequest.headers) {
          (originalRequest.headers as any)['Authorization'] = `Bearer ${newAccessToken}`
        }

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Clear stale session
        localStorage.removeItem('auth-store')
        if (typeof window !== 'undefined') {
          window.location.href = '/signin'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
