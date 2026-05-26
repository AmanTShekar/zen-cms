let isRefreshing = false
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = []

const processQueue = (error: unknown, _token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(_token)
    }
  })
  failedQueue = []
}

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Headers
}

function buildUrl(path: string, config?: { params?: Record<string, any> }): string {
  if (path.startsWith('http')) return path
  let url = `${BASE_URL}${path}`
  if (config?.params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    }
    const qs = searchParams.toString()
    if (qs) url += (path.includes('?') ? '&' : '?') + qs
  }
  return url
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData
}

async function fetchWithAuth(method: string, path: string, body?: unknown, config?: { headers?: Record<string, string>; params?: Record<string, any> }): Promise<ApiResponse<any>> {
  const url = buildUrl(path, config)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config?.headers,
  }

  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Apply default headers set dynamically via api.defaults.headers
  if (apiInstance.defaults.headers) {
    for (const [key, value] of Object.entries(apiInstance.defaults.headers)) {
      if (value !== undefined && !headers[key]) {
        headers[key] = value
      }
    }
  }

  // Ensure active site ID is dynamically set on every request to prevent tenant leaking
  const currentSiteId = localStorage.getItem('activeSiteId')
  if (currentSiteId && !headers['x-zenith-site-id']) {
    headers['x-zenith-site-id'] = currentSiteId
  }

  // Double-Submit Cookie CSRF for mutating requests
  if (['post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
    const csrfToken = getCookie('XSRF-TOKEN')
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken
    }
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (isFormData(body)) {
    delete headers['Content-Type']
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    credentials: 'include' as RequestCredentials,
  }
  if (body !== undefined) {
    fetchOptions.body = isFormData(body) ? body : JSON.stringify(body)
  }

  try {
    return await fetch(url, fetchOptions).then(async (response) => {
      let data: any
      try { data = await response.json() } catch { data = null }
      return { data, status: response.status, headers: response.headers }
    })
  } catch {
    // Network error — throw axios-compatible error so callers catch it
    const error: any = new Error('Network Error')
    error.code = 'ERR_NETWORK'
    error.response = undefined
    throw error
  }
}

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
  config?: { headers?: Record<string, string>; params?: Record<string, any> }
): Promise<ApiResponse<T>> {
  const result = await fetchWithAuth(method, path, body, config)

  // Handle 401 with token refresh
  if (result.status === 401) {
    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise<unknown>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(async () => {
        return fetchWithAuth(method, path, body, config) as Promise<ApiResponse<T>>
      })
    }

    isRefreshing = true
    try {
      const newToken = await refreshToken()
      processQueue(null, newToken)
      return fetchWithAuth(method, path, body, config) as Promise<ApiResponse<T>>
    } catch (refreshError: unknown) {
      processQueue(refreshError, null)
      const err = refreshError as { status?: number }
      if (err?.status === 401 && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      throw refreshError
    } finally {
      isRefreshing = false
    }
  }

  // Throw for non-2xx status codes (axios-compatible error shape)
  if (result.status >= 400) {
    const error: any = new Error(result.data?.message || `Request failed with status ${result.status}`)
    error.response = { data: result.data, status: result.status, headers: result.headers }
    throw error
  }

  return result as ApiResponse<T>
}

async function refreshToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw { status: res.status }
  const body = await res.json()
  const newToken: string | undefined = body?.token || body?.accessToken
  if (newToken) {
    localStorage.setItem('token', newToken)
  }
  return newToken || ''
}

const getInitialSiteId = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem('activeSiteId') || ''
  }
  return ''
}

const apiInstance = {
  defaults: {
    headers: {
      ...(getInitialSiteId() ? { 'x-zenith-site-id': getInitialSiteId() } : {})
    } as Record<string, string>,
  },

  async get<T = any>(path: string, config?: { params?: Record<string, any>; headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return request<T>('GET', path, undefined, config)
  },

  async post<T = any>(path: string, body?: unknown, config?: { headers?: Record<string, string>; params?: Record<string, any> }): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body, config)
  },

  async patch<T = any>(path: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return request<T>('PATCH', path, body, config)
  },

  async put<T = any>(path: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return request<T>('PUT', path, body, config)
  },

  async delete<T = any>(path: string, config?: { headers?: Record<string, string> }): Promise<ApiResponse<T>> {
    return request<T>('DELETE', path, undefined, config)
  },
}

export default apiInstance