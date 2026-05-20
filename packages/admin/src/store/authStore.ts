import { create } from 'zustand'
import api from '../lib/api'

interface User {
  id: string
  email: string
  name?: string
  role: 'admin' | 'editor' | 'viewer'
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

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
      set({ user: null, isAuthenticated: false })
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
