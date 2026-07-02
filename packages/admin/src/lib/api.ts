import { useTenantStore } from './tenantStore'
import { ApiError } from './ApiError'

let isRefreshing = false
let failedQueue: { resolve: (value: any) => void; reject: (reason?: any) => void }[] = []

const processQueue = (error: any, _token: string | null = null) => {
 failedQueue.forEach((prom) => {
 if (error) {
 prom.reject(error)
 } else {
 prom.resolve(_token)
 }
 })
 failedQueue = []
}

// Wrapped version ensures rejection handler throws don't break the redirect
const safeProcessQueue = (error: any, token: string | null) => {
 try {
 processQueue(error, token)
 } catch { /* ignore — queue handlers should not throw */ }
}

const getCookie = (name: string): string | null => {
 if (typeof document === 'undefined') return null
 const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
 return match ? decodeURIComponent(match[2]) : null
}

// Security: Never hardcode localhost as a fallback in production.
// If VITE_API_URL is not set, fall back to '/api/v1' (same-host relative path).
// If the admin and API are on different hosts, VITE_API_URL must be explicitly configured.
let BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
if (import.meta.env.PROD && BASE_URL.startsWith('http://') && !BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1')) {
  console.warn('Insecure HTTP API URL used in production. Upgrading to HTTPS.')
  BASE_URL = BASE_URL.replace('http://', 'https://')
}

interface ApiResponse<T = any> {
 data: T
 status: number
 headers: Headers
}

function buildUrl(path: string, config?: { params?: any }): string {
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

function isFormData(body: any): body is FormData {
 return typeof FormData !== 'undefined' && body instanceof FormData
}

async function fetchWithAuth(method: string, path: string, body?: any, config?: { headers?: Record<string, string>; params?: any }): Promise<ApiResponse<any>> {
 const url = buildUrl(path, config)

 const headers: Record<string, string> = {
 'Content-Type': 'application/json',
 ...config?.headers,
 }

 const storeToken = useTenantStore.getState().token
 if (storeToken) {
 headers['Authorization'] = `Bearer ${storeToken}`
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
 const currentSiteId = useTenantStore.getState().activeSiteId
 if (currentSiteId && !headers['x-zenith-site-id']) {
 headers['x-zenith-site-id'] = currentSiteId
 }

 // Hard tenant guard — abort any tenant-scoped request missing x-zenith-site-id.
 // Exempt: auth, site listing, uploads, health, and protocol paths that run before
 // a site is selected (globals editor, document locks, collab presence, media proxy).
 const isTenantExempt =
 path.startsWith('/auth') ||
 path === '/sites' ||
 path.startsWith('/sites?') ||
 path.startsWith('/sites/') ||
 path.startsWith('/uploads') ||
 path.startsWith('/health') ||
 path.startsWith('/system') ||
 path.startsWith('/globals') ||
 path.startsWith('/locks') ||
 path.startsWith('/presence') ||
 path.startsWith('/media') ||
 path.startsWith('/versions') ||
 path.startsWith('/releases') ||
 path.startsWith('/workspaces')
 if (!currentSiteId && !headers['x-zenith-site-id'] && !isTenantExempt) {
 throw new ApiError({
 message:
 'Missing tenant context: x-zenith-site-id is required for this request. ' +
 'Ensure activeSiteId is set in localStorage before making API calls.',
 code: 'ERR_NO_TENANT',
 })
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
 // Network error — throw ApiError so callers catch a consistent shape
 throw new ApiError({ message: 'Network Error', code: 'ERR_NETWORK' })
 }
}

async function request<T = any>(
 method: string,
 path: string,
 body?: any,
 config?: { headers?: Record<string, string>; params?: any }
): Promise<ApiResponse<T>> {
 const result = await fetchWithAuth(method, path, body, config)

 // Handle 401 with token refresh (skip for login requests, as 401 means invalid credentials)
 if (result.status === 401 && !path.includes('/login')) {
 if (isRefreshing) {
 // Queue this request until refresh completes
 return new Promise<any>((resolve, reject) => {
 failedQueue.push({ resolve, reject })
 }).then(async () => {
 return fetchWithAuth(method, path, body, config) as Promise<ApiResponse<T>>
 })
 }

 isRefreshing = true
 try {
 const newToken = await refreshToken()
 safeProcessQueue(null, newToken)
 return fetchWithAuth(method, path, body, config) as Promise<ApiResponse<T>>
 } catch (refreshError: any) {
 safeProcessQueue(refreshError, null)
 if ((refreshError as any)?.status === 401 && !window.location.pathname.includes('/login')) {
 localStorage.clear()
 window.location.href = '/login'
 }
 throw refreshError
 } finally {
 isRefreshing = false
 }
 }

 // Throw for non-2xx status codes (ApiError with response payload)
 if (result.status >= 400) {
 const errorMsg = result.data?.error?.message || result.data?.message || '';
 if (result.status === 403 && (errorMsg.includes('Access denied to this site') || errorMsg.includes('site_access') || errorMsg.includes('Forbidden'))) {
 useTenantStore.getState().setActiveSiteId('')
 localStorage.removeItem('activeSiteId')
 if (!window.location.pathname.includes('/sites')) {
 window.location.href = '/sites'
 }
 }

 throw new ApiError({
 message: result.data?.message || `Request failed with status ${result.status}`,
 status: result.status,
 code: 'ERR_HTTP',
 response: { data: result.data, status: result.status, headers: result.headers },
 })
 }

 return result as ApiResponse<T>
}

async function refreshToken(): Promise<string> {
 const res = await fetch(`${BASE_URL}/auth/refresh`, {
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 })
 if (!res.ok) throw new ApiError({ message: 'Token refresh failed', status: res.status, code: 'ERR_REFRESH' })
 const body = await res.json()
 const newToken: string | undefined = body?.token || body?.accessToken
 if (newToken) {
 useTenantStore.getState().setToken(newToken)
 }
 return newToken || ''
}

const getInitialSiteId = (): string => {
 if (typeof window !== 'undefined' && window.localStorage) {
 // First try from the store (which persists), fall back to raw localStorage for backward compatibility
 const storeSiteId = useTenantStore.getState().activeSiteId
 if (storeSiteId) return storeSiteId
 const legacySiteId = window.localStorage.getItem('activeSiteId')
 if (legacySiteId) {
 useTenantStore.getState().setActiveSiteId(legacySiteId)
 return legacySiteId
 }
 }
 return ''
}

const apiInstance = {
 defaults: {
 headers: {
 ...(getInitialSiteId() ? { 'x-zenith-site-id': getInitialSiteId() } : {})
 } as Record<string, string>,
 },

 async get<T = any>(path: string, config?: { params?: any; headers?: Record<string, string> }): Promise<ApiResponse<T>> {
 return request<T>('GET', path, undefined, config)
 },

 async post<T = any>(path: string, body?: any, config?: { headers?: Record<string, string>; params?: any }): Promise<ApiResponse<T>> {
 return request<T>('POST', path, body, config)
 },

 async patch<T = any>(path: string, body?: any, config?: { headers?: Record<string, string>; params?: any }): Promise<ApiResponse<T>> {
 return request<T>('PATCH', path, body, config)
 },

 async put<T = any>(path: string, body?: any, config?: { headers?: Record<string, string>; params?: any }): Promise<ApiResponse<T>> {
 return request<T>('PUT', path, body, config)
 },

 async delete<T = any>(path: string, config?: { headers?: Record<string, string>; params?: any }): Promise<ApiResponse<T>> {
 return request<T>('DELETE', path, undefined, config)
 },
}

export default apiInstance
