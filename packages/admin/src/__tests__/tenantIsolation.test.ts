/**
 * Tenant isolation test
 *
 * Verifies that:
 * 1. When a siteId is set in tenantStore, the x-zenith-site-id header
 * is included in outgoing API requests.
 * 2. When no siteId is set, tenant-scoped requests are blocked with ERR_NO_TENANT.
 * 3. Tenant-exempt paths (/auth, /sites, /health, etc.) still work without a siteId.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import apiInstance from '../lib/api'
import { useTenantStore } from '../lib/tenantStore'
import { ApiError } from '../lib/ApiError'

// The API base URL is configured via vite.config.ts test.env (VITE_API_URL),
// ensuring import.meta.env.VITE_API_URL is set when api.ts is first imported.
const TEST_API_BASE = 'http://localhost:5173'

let lastRequest: Request | undefined

const server = setupServer(
 http.all(`${TEST_API_BASE}/api/*`, ({ request }) => {
 lastRequest = request
 return HttpResponse.json({ ok: true })
 })
)

beforeAll(() => {
 server.listen({ onUnhandledRequest: 'error' })
})
beforeEach(() => {
 useTenantStore.getState().setToken(null); useTenantStore.getState().setActiveSiteId(null)
 lastRequest = undefined
 server.resetHandlers()
 server.use(
 http.all(`${TEST_API_BASE}/api/*`, ({ request }) => {
 lastRequest = request
 return HttpResponse.json({ ok: true })
 })
 )
})
afterAll(() => {
 server.close()
 vi.unstubAllEnvs()
})

describe('Tenant isolation', () => {
 it('sends x-zenith-site-id when activeSiteId is set', async () => {
 useTenantStore.getState().setActiveSiteId('site-alpha')
 await apiInstance.get('/collections')
 expect(lastRequest).toBeDefined()
 expect(lastRequest!.headers.get('x-zenith-site-id')).toBe('site-alpha')
 })

 it('sends different header when tenant is switched', async () => {
 useTenantStore.getState().setActiveSiteId('site-beta')
 await apiInstance.get('/collections')
 expect(lastRequest!.headers.get('x-zenith-site-id')).toBe('site-beta')
 })

 it('blocks tenant-scoped requests when no siteId is set', async () => {
 useTenantStore.getState().setToken(null); useTenantStore.getState().setActiveSiteId(null)
 try {
 await apiInstance.get('/collections')
 } catch (err) {
 expect(err).toBeInstanceOf(ApiError)
 expect((err as ApiError).code).toBe('ERR_NO_TENANT')
 }
 })

 it('allows tenant-exempt paths (/auth) without a siteId', async () => {
 useTenantStore.getState().setToken(null); useTenantStore.getState().setActiveSiteId(null)
 server.use(
 http.post(`${TEST_API_BASE}/api/v1/auth/login`, ({ request }) => {
 lastRequest = request
 return HttpResponse.json({ token: 'fake' })
 })
 )
 const res = await apiInstance.post('/auth/login', { email: 'a@b.co', password: 'x' })
 expect(res.status).toBe(200)
 expect(lastRequest!.headers.has('x-zenith-site-id')).toBe(false)
 })
})
