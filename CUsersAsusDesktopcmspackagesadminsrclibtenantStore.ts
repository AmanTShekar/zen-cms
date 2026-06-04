import { create } from 'zustand'
import { useSiteStore } from './siteStore'

/**
 * Central store for authentication and multi‑tenant context.
 * Writes to localStorage directly so values stay in sync with siteStore.
 */
interface TenantState {
  token: string | null
  activeSiteId: string | null
  activeSiteName: string | null
  setToken: (token: string | null) => void
  setActiveSiteId: (siteId: string | null, siteName?: string | null) => void
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage may be disabled or full
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export const useTenantStore = create<TenantState>((set) => ({
  token: safeGetItem('token'),
  activeSiteId: safeGetItem('activeSiteId'),
  activeSiteName: safeGetItem('activeSiteName'),

  setToken: (token) => {
    if (token) {
      safeSetItem('token', token)
    } else {
      safeRemoveItem('token')
    }
    set({ token })
  },

  setActiveSiteId: (siteId, siteName) => {
    if (siteId) {
      safeSetItem('activeSiteId', siteId)
    } else {
      safeRemoveItem('activeSiteId')
    }

    if (siteName) {
      safeSetItem('activeSiteName', siteName)
    } else if (siteId === null || siteId === '') {
      safeRemoveItem('activeSiteName')
    }

    set({ activeSiteId: siteId, activeSiteName: siteName ?? null })

    // Sync with siteStore so both stores share the same localStorage keys
    try {
      useSiteStore.getState().setActiveSiteId(siteId)
    } catch {
      // siteStore may not be mounted yet
    }
  },
}))
