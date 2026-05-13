import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken } = res.data.data;
      localStorage.setItem('token', accessToken);
      set({ user, isAuthenticated: true });
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      set({ user: null, isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    
    set({ isLoading: true });
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.data, isAuthenticated: true });
    } catch (error) {
      set({ user: null, isAuthenticated: false });
      localStorage.removeItem('token');
    } finally {
      set({ isLoading: false });
    }
  },
}));
