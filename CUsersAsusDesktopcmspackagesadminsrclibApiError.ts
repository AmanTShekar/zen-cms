/**
 * Unified, typed error for all API-layer failures.
 *
 * Every `api` call throws `ApiError` on failure, so callers can catch
 * with predictable properties instead of casting `unknown` / `any`.
 *
 * ```ts
 * import api from './api'
 * import { ApiError } from './ApiError'
 *
 * try {
 *   await api.post('/collections', data)
 * } catch (err) {
 *   if (err instanceof ApiError) {
 *     console.error(err.status, err.code, err.message)
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** HTTP status code, or 0 for network/tenant errors */
  status: number
  /** Machine-readable short code: 'ERR_NETWORK', 'ERR_NO_TENANT', 'ERR_CSRF', etc. */
  code: string
  /** The raw response payload (if any) */
  response?: { data: unknown; status: number; headers?: Headers }

  constructor(opts: {
    message: string
    status?: number
    code?: string
    response?: { data: unknown; status: number; headers?: Headers }
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.status = opts.status ?? 0
    this.code = opts.code ?? 'ERR_UNKNOWN'
    this.response = opts.response
  }
}
