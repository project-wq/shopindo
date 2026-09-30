import axios from 'axios'

const TOKEN_KEY = 'shopindo_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { Accept: 'application/json' },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear()
      window.dispatchEvent(new Event('auth:logout'))
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error) {
  const data = error?.response?.data
  if (error?.response?.status === 429) return 'Terlalu banyak permintaan. Coba lagi sebentar.'
  if (data?.errors) return Object.values(data.errors).flat()[0]
  return data?.message || error?.message || 'Terjadi kesalahan.'
}

export function toFormData(values) {
  const fd = new FormData()
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== null && typeof v === 'object' && !(v instanceof File)) {
          Object.entries(v).forEach(([k, vv]) => vv !== undefined && vv !== null && fd.append(`${key}[${i}][${k}]`, vv))
        } else {
          fd.append(`${key}[]`, v)
        }
      })
    } else if (typeof value === 'boolean') {
      fd.append(key, value ? '1' : '0')
    } else {
      fd.append(key, value)
    }
  })
  return fd
}

export default api
