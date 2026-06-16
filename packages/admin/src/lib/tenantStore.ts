import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Central store for authentication and multi‑tenant context.
 * It persists to localStorage so the values survive page reloads.
 */
interface TenantState {
 token: string | null
 activeSiteId: string | null
 activeSiteName: string | null
 setToken: (token: string | null) => void
 setActiveSiteId: (siteId: string | null, siteName?: string | null) => void
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

function getLegacySiteName(): string | null {
 try {
 return localStorage.getItem('activeSiteName')
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
 activeSiteName: getLegacySiteName(),
 setToken: (token) => set({ token }),
 setActiveSiteId: (siteId, siteName) =>
 set((state) => ({
 activeSiteId: siteId,
 activeSiteName: siteName ?? state.activeSiteName,
 })),
 }),
 {
 name: 'zenith-tenant-store',
 // SECURITY: Never persist the auth token to localStorage — it must live in
 // memory only. The server uses HttpOnly cookies for actual authentication.
 // Storing the token in localStorage makes it extractable via XSS attacks.
 partialize: (state) => ({
  activeSiteId: state.activeSiteId,
  activeSiteName: state.activeSiteName,
 }),
 }
 )
)
