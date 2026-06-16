import { create } from 'zustand'
import api from '../lib/api'

interface User {
 id: string
 email: string
 name?: string
 role: 'admin' | 'editor' | 'viewer'
 twoFactorEnabled?: boolean
}

interface AuthState {
 user: User | null
 isAuthenticated: boolean
 isLoading: boolean
 siteId: string | null
 setUser: (user: User | null) => void
 setSiteId: (siteId: string | null) => void
 login: (email: string, password: string) => Promise<void>
 logout: () => Promise<void>
 checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
 user: null,
 isAuthenticated: false,
 isLoading: true,
 siteId: null,

 setUser: (user) => set({ user, isAuthenticated: !!user }),

 setSiteId: (siteId) => set({ siteId }),

 login: async (email, password) => {
 try {
 const res = await api.post('/auth/login', { email, password })
 const { user } = res.data.data
 set({ user, isAuthenticated: true })
 } catch (error) {
 console.error('Login failed', error)
 throw error
 }
 },

 logout: async () => {
 try {
 await api.post('/auth/logout')
 } finally {
 localStorage.removeItem('zenith_auth_state')
 localStorage.removeItem('activeSiteId')
 set({ user: null, isAuthenticated: false, siteId: null })
 window.location.href = '/login'
 }
 },

 checkAuth: async () => {
 set({ isLoading: true })
 try {
 const res = await api.get('/auth/me')
 set({ user: res.data.data, isAuthenticated: true })
 } catch {
 set({ user: null, isAuthenticated: false })
 } finally {
 set({ isLoading: false })
 }
 },
}))
