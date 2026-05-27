// Typed API wrapper for admin package
// Provides generic signatures that return the data payload directly, improving type safety.

import apiInstance from './api'

export interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Headers
}

function wrap<T>(promise: Promise<ApiResponse<T>>): Promise<T> {
  return promise.then(res => res.data)
}

export const typedApi = {
  async get<T = any>(path: string, config?: { params?: Record<string, any>; headers?: Record<string, string> }): Promise<T> {
    return wrap<T>(apiInstance.get<T>(path, config))
  },
  async post<T = any>(path: string, body?: unknown, config?: { headers?: Record<string, string>; params?: Record<string, any> }): Promise<T> {
    return wrap<T>(apiInstance.post<T>(path, body, config))
  },
  async patch<T = any>(path: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<T> {
    return wrap<T>(apiInstance.patch<T>(path, body, config))
  },
  async put<T = any>(path: string, body?: unknown, config?: { headers?: Record<string, string> }): Promise<T> {
    return wrap<T>(apiInstance.put<T>(path, body, config))
  },
  async delete<T = any>(path: string, config?: { headers?: Record<string, string> }): Promise<T> {
    return wrap<T>(apiInstance.delete<T>(path, config))
  },
}
