import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Central store for authentication and multi‑tenant context.
 * It persists to localStorage so the values survive page reloads.
 *
 * Migration: on first load it reads legacy `token` and `activeSiteId`
 * keys from localStorage so existing sessions are not lost.
 */
interface TenantState {
  token: string | null
  activeSiteId: string | null
  setToken: (token: string | null) => void
  setActiveSiteId: (siteId: string | null) => void
}

function getLegacyToken(): string | null {
  try {
    return localStorage.getItem('token')
  } catch {
    return null
  }
}

function getLegacySiteId(): string | null {
  try {
    return localStorage.getItem('activeSiteId')
  } catch {
    return null
  }
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      // First try the persisted store; fall back to legacy localStorage keys
      token: getLegacyToken(),
      activeSiteId: getLegacySiteId(),
      setToken: (token) => set({ token }),
      setActiveSiteId: (siteId) => set({ activeSiteId: siteId }),
    }),
    {
      name: 'zenith-tenant-store',
    }
  )
)