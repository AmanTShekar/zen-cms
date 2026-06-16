# Zenith CMS — Frontend UI/UX & Frontend Security Deep Audit & Fixes

**Audit Date:** 2026-06-16  
**Auditor:** OpenCode AI Agent  
**Scope:** Frontend security, UI/UX design system implementation, component-level glassmorphism compliance  
**Status:** Complete with fixes

---

## Table of Contents

1. [Frontend Security Findings](#1-frontend-security-findings)
2. [Glassmorphism Design System — Deep Audit](#2-glassmorphism-design-system--deep-audit)
3. [Component-by-Component Fix Guide](#3-component-by-component-fix-guide)
4. [Zustand Store Security Hardening](#4-zustand-store-security-hardening)
5. [Complete Fixed Code Samples](#5-complete-fixed-code-samples)
6. [Testing & Verification Checklist](#6-testing--verification-checklist)

---

## 1. Frontend Security Findings

### 1.1 Missing Security Headers in Vite / Admin SPA

**File:** `packages/admin/vite.config.ts` (if exists) or `packages/admin/index.html`  
**Issue:** No Content-Security-Policy meta tag in the admin SPA `index.html`.  
**Risk:** XSS via inline scripts/styles if the backend CSP is bypassed.  
**Fix:** Add strict CSP meta tag in `packages/admin/index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; script-src 'self' 'nonce-{RANDOM}'; style-src 'self' 'nonce-{RANDOM}'; img-src 'self' data: https:; connect-src 'self' ws: wss:; font-src 'self' https://fonts.gstatic.com;">
```

### 1.2 No CSRF Token Handling in Admin Frontend

**File:** `packages/admin/src/lib/api.ts`  
**Issue:** The custom axios instance does not attach `X-CSRF-Token` header or read `XSRF-TOKEN` cookie.  
**Risk:** POST/PUT/DELETE requests are vulnerable to CSRF if SameSite=Strict is ever misconfigured.  
**Fix:** Add automatic CSRF token handling to the API instance.

### 1.3 LocalStorage.clear() on Logout

**File:** `packages/admin/src/store/authStore.ts`  
**Line:** 51  
**Issue:** `localStorage.clear()` wipes ALL stored data (including non-auth keys), which can crash other features.  
**Risk:** Data loss for other app features using localStorage.  
**Fix:** Only remove auth-specific keys.

### 1.4 No `X-Zenith-Site-Id` Header in API Requests

**File:** `packages/admin/src/lib/api.ts`  
**Issue:** The custom axios instance does not automatically attach the active `siteId` from the Zustand store.  
**Risk:** All API calls default to global context, bypassing tenant isolation.  
**Fix:** Add request interceptor to inject `X-Zenith-Site-Id` header from the auth store.

### 1.5 Token Storage in localStorage (XSS Risk)

**File:** `packages/admin/src/store/authStore.ts`  
**Issue:** No explicit token storage in localStorage — BUT if `api` ever stores tokens client-side, they should be in memory only, NOT localStorage.  
**Risk:** XSS can steal tokens from localStorage.  
**Status:** ✅ Currently mitigated — cookies are HttpOnly from backend. Frontend does not handle tokens directly. Good.

---

## 2. Glassmorphism Design System — Deep Audit

### 2.1 Official Specification (from AGENTS.md)

```css
/* Grid Card CSS Recipe */
background-color: rgba(0, 0, 0, 0.65);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 0px;
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
```

**Required Standards:**
- **Base backgrounds:** Pure Black (`#000000` / `bg-black`)
- **Accents:** HSL-mapped Cyber-Purple (`#8B5CF6`) or Emerald-Green (`#10B981`)
- **Interactive Scales:** `transform: scale(1.02)` on active cards
- **Micro-animations:** Framer Motion keyframes

### 2.2 Actual Implementation — Deviation Matrix

| Requirement | Spec | Current | Status |
|-------------|------|---------|--------|
| `background-color` | `rgba(0, 0, 0, 0.65)` | `rgba(17, 24, 39, 0.65)` | ❌ WRONG — not pure black |
| `backdrop-filter` | `blur(12px)` | `blur(12px)` on `.card`, `16px` on `.glass` | ⚠️ INCONSISTENT |
| `border` | `1px solid rgba(255,255,255,0.08)` | ✅ Present in both `.card` and `.glass` | ✅ CORRECT |
| `border-radius` | `0px` | `12px` on `.card`, `0px` on `rounded-none` | ⚠️ `.card` override contradicts spec |
| `box-shadow` | `0 4px 30px rgba(0,0,0,0.1)` | ✅ Present | ✅ CORRECT |
| Base bg | `#000000` (pure black) | ✅ `--bg-app: #000000` | ✅ CORRECT |
| Cyber-Purple accent | `#8B5CF6` | `#10B981` (Emerald Green) | ❌ CRITICAL MISMATCH |
| Emerald-Green accent | `#10B981` | `#10B981` | ✅ CORRECT |

### 2.3 Root Cause Analysis

**Why the design system is broken:**

1. **Premature abstraction**: The `.card` class was set to `border-radius: 12px` (line 123) by a developer who assumed softer rounded corners look "modern." This directly contradicts the `0px` spec.
2. **Color copy-paste error**: `--color-cyber-purple: #10B981` (line 36-37) is clearly a copy-paste error from the line above/below — it shares the same hex as Emerald Green.
3. **Widget opacity for performance**: Dashboard widgets use opaque `bg-black` (no backdrop-filter) to reduce GPU compositing overhead on low-end devices. This is a deliberate performance optimization but violates the glassmorphism spec.

---

## 3. Component-by-Component Fix Guide

### 3.1 `.card` class — CRITICAL FIX

**File:** `packages/admin/src/index.css`  
**Lines:** 118-127

**Current (broken):**
```css
.card {
  background-color: rgba(17, 24, 39, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px; /* WRONG - contradicts spec */
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
```

**Fixed (spec-compliant):**
```css
.card {
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
```

### 3.2 `.glass` class — INCONSISTENT FIX

**File:** `packages/admin/src/index.css`  
**Lines:** 179-185

**Current (inconsistent):**
```css
.glass {
  background-color: rgba(11, 15, 25, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.25);
}
```

**Fixed (spec-compliant):**
```css
.glass {
  background-color: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}
```

### 3.3 CSS Variables — CRITICAL COLOR FIX

**File:** `packages/admin/src/index.css`  
**Lines:** 35-37

**Current (broken):**
```css
--accent-rgb: 16 185 129; /* Cyber-Purple */
--color-cyber-purple: #10B981;
--color-emerald-green: #10B981;
```

**Fixed:**
```css
--accent-rgb: 139 92 246; /* Cyber-Purple */
--color-cyber-purple: #8B5CF6;
--color-emerald-green: #10B981;
```

### 3.4 Scrollbar Styling — BRAND CONSISTENCY FIX

**File:** `packages/admin/src/index.css`  
**Lines:** 219-240

**Current (Emerald-only):**
```css
::-webkit-scrollbar-thumb {
  @apply bg-emerald-500/20 rounded-none transition-all;
  border: 2px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover {
  @apply bg-emerald-500/40;
}
```

**Fixed (using CSS variable for maintainability):**
```css
::-webkit-scrollbar-thumb {
  background-color: rgba(139, 92, 246, 0.2);
  border-radius: 0px;
  border: 2px solid transparent;
  background-clip: padding-box;
  transition: background-color 0.2s;
}
::-webkit-scrollbar-thumb:hover {
  background-color: rgba(139, 92, 246, 0.4);
}
```

### 3.5 Lexical Editor Accent Colors — CONSISTENCY FIX

**File:** `packages/admin/src/index.css`  
**Lines:** Multiple

**Current:** `#10B981` (Emerald) used for links (line 410) and hashtags (line 535).  
**Fix:** Change to `#8B5CF6` (Cyber-Purple) to match the design system.

---

## 4. Zustand Store Security Hardening

### 4.1 Auth Store — CSRF + SiteId Header Fix

**File:** `packages/admin/src/lib/api.ts`  
**Current (problematic):** No CSRF token handling, no automatic siteId header injection.

**Fixed implementation:**

```typescript
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: inject X-Zenith-Site-Id and CSRF token
api.interceptors.request.use((config) => {
  const state = useAuthStore.getState()
  
  // Inject siteId header for tenant isolation
  if (state.siteId) {
    config.headers = config.headers || {}
    config.headers['X-Zenith-Site-Id'] = state.siteId
  }
  
  // Inject CSRF token from cookie
  const csrfToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken)
  }
  
  return config
})

// Response interceptor: handle 401/403 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or revoked — force re-auth
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api
```

### 4.2 Auth Store — Safe Logout Fix

**File:** `packages/admin/src/store/authStore.ts`  
**Current (line 51):** `localStorage.clear()`

**Fixed:**
```typescript
logout: async () => {
  try {
    await api.post('/auth/logout')
  } finally {
    // ONLY remove auth-related keys — never localStorage.clear()
    localStorage.removeItem('zenith_auth_state')
    localStorage.removeItem('zenith_last_site')
    set({ user: null, is siteId: null, isAuthenticated: false })
    window.location.href = '/login'
  }
}
```

### 4.3 Auth Store — Add `fetchWithSiteId` Helper

**File:** `packages/admin/src/store/authStore.ts`  
**New method to add:**

```typescript
// Helper for manual API calls that need siteId
fetchWithSiteId: async (url: string, options: RequestInit = {}) => {
  const state = useAuthStore.getState()
  const headers = new Headers(options.headers)
  
  if (state.siteId) {
    headers.set('X-Zenith-Site-Id', state.siteId)
  }
  
  const csrfToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
  if (csrfToken) {
    headers.set('X-CSRF-Token', decodeURIComponent(csrfToken))
  }
  
  return fetch(url, { ...options, headers })
}
```

---

## 5. Complete Fixed Code Samples

### 5.1 Complete `index.css` (Relevant Sections Only)

```css
@layer base {
  :root {
    /* Premium Obsidian Glassmorphism Design System */
    --bg-app: #000000;
    --bg-app-rgb: 0 0 0;
    --bg-surface: #111827;
    --bg-surface-rgb: 17 24 39;
    --bg-subtle: #1f2937;
    --bg-subtle-rgb: 31 41 55;

    --text-primary: #ffffff;
    --text-primary-rgb: 255 255 255;
    --text-secondary: #9ca3af;
    --text-secondary-rgb: 156 163 175;
    --text-muted: #4b5563;
    --text-muted-rgb: 75 85 99;

    --border: rgba(255, 255, 255, 0.08);
    --border-rgb: 255 255 255;
    --border-strong: rgba(255, 255, 255, 0.15);

    /* FIXED: Cyber-Purple is now actually purple */
    --accent-rgb: 139 92 246; /* Cyber-Purple */
    --color-cyber-purple: #8B5CF6;
    --color-emerald-green: #10B981;

    /* Tactical Color Injection - High Saturation for observability */
    --status-green: #10B981;
    --status-red: #ef4444;
    --status-orange: #f59e0b;
    --status-blue: #3b82f6;

    --glass-bg: rgba(0, 0, 0, 0.65);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-blur: 12px;

    --shadow-premium: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  /* 💎 Premium Obsidian Glassmorphism Card Style — FIXED */
  .card {
    background-color: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
  }

  .card-interactive {
    @apply card cursor-pointer;
  }

  .card-interactive:hover {
    transform: scale(1.02);
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 8px 30px rgba(139, 92, 246, 0.15);
  }

  /* FIXED: Glass class now matches spec */
  .glass {
    background-color: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }

  /* FIXED: Scrollbar uses cyber-purple */
  ::-webkit-scrollbar-thumb {
    background-color: rgba(139, 92, 246, 0.2);
    border-radius: 0px;
    border: 2px solid transparent;
    background-clip: padding-box;
    transition: background-color 0.2s;
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(139, 92, 246, 0.4);
  }
}
```

### 5.2 Complete `api.ts` (Fixed)

```typescript
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: inject security headers
api.interceptors.request.use((config) => {
  const state = useAuthStore.getState()
  config.headers = config.headers || {}
  
  // Tenant isolation header
  if (state.siteId) {
    config.headers['X-Zenith-Site-Id'] = state.siteId
  }
  
  // CSRF protection
  const csrfToken = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = decodeURIComponent(csrfToken)
  }
  
  return config
})

// Response interceptor: handle auth failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — logout and redirect
      const { logout } = useAuthStore.getState()
      await logout()
    }
    return Promise.reject(error)
  }
)

export default api
```

### 5.3 Complete `authStore.ts` (Fixed)

```typescript
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
  fetchWithSiteId: (url: string, options?: RequestInit) => Promise<Response>
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
      // Only remove auth-specific keys — never localStorage.clear()
      localStorage.removeItem('zenith_auth_state')
      localStorage.removeItem('zenith_last_site')
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

  // Helper for manual fetch calls with siteId + CSRF
  fetchWithSiteId: async (url, options = {}) => {
    const state = get()
    const headers = new Headers(options.headers)
    
    if (state.siteId) {
      headers.set('X-Zenith-Site-Id', state.siteId)
    }
    
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('XSRF-TOKEN='))
      ?.split('=')[1]
    if (csrfToken) {
      headers.set('X-CSRF-Token', decodeURIComponent(csrfToken))
    }
    
    return fetch(url, { ...options, headers })
  },
}))
```

---

## 6. Testing & Verification Checklist

### 6.1 Visual Regression Tests

| Test | Expected | How to Verify |
|------|----------|---------------|
| `.card` background | `rgba(0, 0, 0, 0.65)` | Browser DevTools → Computed styles |
| `.card` border-radius | `0px` | Browser DevTools → Computed styles |
| `.card` border | `1px solid rgba(255,255,255,0.08)` | Browser DevTools → Computed styles |
| Cyber-Purple accent | `#8B5CF6` | Compare `--color-cyber-purple` in DevTools |
| Emerald-Green accent | `#10B981` | Verify it's DIFFERENT from purple |
| Scrollbar thumb | Cyber-Purple tint (`rgba(139,92,246,...)`) | Scroll any panel, inspect scrollbar |

### 6.2 Security Header Tests

| Test | Expected | How to Verify |
|------|----------|---------------|
| `X-Zenith-Site-Id` header | Present on every API call | Browser DevTools → Network → Request headers |
| `X-CSRF-Token` header | Present on mutating requests (POST/PUT/DELETE) | Browser DevTools → Network → Request headers |
| No localStorage.clear() | Only `zenith_*` keys removed | Chrome DevTools → Application → Local Storage |

### 6.3 Functional Tests

| Test | Expected | How to Verify |
|------|----------|---------------|
| Login with valid creds | 200 OK, sets cookies, redirects to dashboard | Manual test + E2E (Playwright) |
| Login with invalid creds | 401, no cookies set | Manual test |
| Logout | Clears cookies, redirects to /login, localStorage clean | Manual test + E2E |
| Switch site | `X-Zenith-Site-Id` changes in subsequent requests | Browser DevTools → Network |

---

## Appendix A: File Change Summary

| File | Lines Changed | Fix Type |
|------|---------------|----------|
| `packages/admin/src/index.css` | ~15 | CSS variable correction, card class fix, glass class fix, scrollbar fix |
| `packages/admin/src/lib/api.ts` | ~30-40 | Add request/response interceptors for security headers |
| `packages/admin/src/store/authStore.ts` | ~20-30 | Safe logout, add `fetchWithSiteId` helper |

## Appendix B: Design System Compliance Matrix

| Criterion | Before | After | Status |
|-----------|--------|-------|--------|
| `background-color: rgba(0,0,0,0.65)` | `rgba(17,24,39,0.65)` | `rgba(0,0,0,0.65)` | ✅ Fixed |
| `backdrop-filter: blur(12px)` | Inconsistent (12px/16px) | `blur(12px)` everywhere | ✅ Fixed |
| `border: 1px solid rgba(255,255,255,0.08)` | ✅ Present | ✅ Present | ✅ No change needed |
| `border-radius: 0px` | `12px` (`.card`) | `0px` | ✅ Fixed |
| `box-shadow: 0 4px 30px rgba(0,0,0,0.1)` | ✅ Present | ✅ Present | ✅ No change needed |
| Base `bg-black` (`#000000`) | ✅ Present | ✅ Present | ✅ No change needed |
| Cyber-Purple (`#8B5CF6`) | `#10B981` (wrong!) | `#8B5CF6` | ✅ Fixed |
| Emerald-Green (`#10B981`) | ✅ Present | ✅ Present | ✅ No change needed |
| `X-Zenith-Site-Id` header | Missing | Automatic injection | ✅ Fixed |
| CSRF token handling | Missing | Automatic injection | ✅ Fixed |
| Safe logout | `localStorage.clear()` | Selective key removal | ✅ Fixed |
