import { useCallback } from 'react'
import { useSiteStore } from '../lib/siteStore'

/** Keys used in localStorage for tenant context */
export const TENANT_KEYS = {
  siteId: 'activeSiteId',
  siteSlug: 'activeSiteSlug',
  siteDomain: 'activeSiteDomain',
  workspaceId: 'activeWorkspaceId',
} as const

/** Routes that are allowed to operate without a resolved siteId */
const TENANT_EXEMPT_PATHS = ['/login', '/select-site', '/sites', '/auth']

function isTenantExempt(): boolean {
  if (typeof window === 'undefined') return true
  return TENANT_EXEMPT_PATHS.some((p) => window.location.pathname.startsWith(p))
}

/**
 * useTenantStorage
 *
 * Single source of truth for all tenant-scoped values.
 *
 * - Reads `siteId` and `workspaceId` from Zustand (`useSiteStore`) as primary source.
 * - Falls back to localStorage for `siteSlug` / `siteDomain` (not in Zustand yet).
 * - `requireSiteId()` throws if `siteId` is null and we are not on an exempt route.
 *   Call this at the top of any component that must operate within a tenant context.
 */
export function useTenantStorage() {
  const { activeSiteId, activeWorkspaceId, setActiveSiteId, setActiveWorkspaceId } = useSiteStore()

  const safeGet = (key: string): string => {
    try { return localStorage.getItem(key) || '' } catch { return '' }
  }

  const safeSet = (key: string, value: string) => {
    try { localStorage.setItem(key, value) } catch { /* ignore */ }
  }

  const safeRemove = (key: string) => {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }

  const siteId = activeSiteId || safeGet(TENANT_KEYS.siteId)
  const siteSlug = safeGet(TENANT_KEYS.siteSlug)
  const siteDomain = safeGet(TENANT_KEYS.siteDomain)
  const workspaceId = activeWorkspaceId || safeGet(TENANT_KEYS.workspaceId)

  /**
   * Asserts that a valid siteId is available.
   * Throws a descriptive error if missing and not on an exempt route.
   */
  const requireSiteId = useCallback((): string => {
    if (siteId) return siteId
    if (isTenantExempt()) return ''
    throw Object.assign(
      new Error(
        'Tenant context is required but activeSiteId is missing. ' +
        'Navigate to Site Selection to choose an active site.'
      ),
      { code: 'ERR_NO_TENANT' }
    )
  }, [siteId])

  /**
   * Set the active site — updates both Zustand store and localStorage.
   */
  const setSite = useCallback((id: string, slug?: string, domain?: string) => {
    setActiveSiteId(id)
    if (slug) safeSet(TENANT_KEYS.siteSlug, slug)
    if (domain) safeSet(TENANT_KEYS.siteDomain, domain)
  }, [setActiveSiteId])

  /**
   * Clear the active tenant context — used on logout or site switch.
   */
  const clearSite = useCallback(() => {
    setActiveSiteId(null)
    safeRemove(TENANT_KEYS.siteSlug)
    safeRemove(TENANT_KEYS.siteDomain)
  }, [setActiveSiteId])

  const setWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id)
  }, [setActiveWorkspaceId])

  return {
    siteId,
    siteSlug,
    siteDomain,
    workspaceId,
    requireSiteId,
    setSite,
    clearSite,
    setWorkspace,
  }
}
