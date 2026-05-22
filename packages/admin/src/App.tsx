import React, { useEffect, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'
import DashboardLayout from './layouts/DashboardLayout'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SitePicker from './pages/SitePicker'
import CollectionList from './pages/CollectionList'
import { Cpu } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import api from './lib/api'
import { ThemeProvider } from './context/ThemeContext'

// ── Code-split page bundles ────────────────────────────────────────────────────
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'))
const CollectionDetail = lazy(() => import('./pages/CollectionDetail'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))
const MediaLibrary = lazy(() => import('./pages/MediaLibrary'))
const DemoFeatures = lazy(() => import('./pages/DemoFeatures'))
const SpatialEditor = lazy(() => import('./pages/SpatialEditor'))
const FlowBuilderPage = lazy(() => import('./pages/FlowBuilderPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage'))
const AIWriterPage = lazy(() => import('./pages/AIWriterPage'))
const PluginsPage = lazy(() => import('./pages/PluginsPage'))
const DashboardBuilder = lazy(() => import('./pages/DashboardBuilder'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const SetupWizard = lazy(() => import('./pages/SetupWizard'))

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
    <div className="relative">
      <Cpu size={64} className="text-white animate-pulse" strokeWidth={0.5} />
      <div className="absolute inset-0 blur-3xl bg-white/10 animate-pulse" />
    </div>
    <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/20 italic animate-pulse">
      Loading Module...
    </p>
  </div>
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore()
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isAuthenticated) return
    api
      .get('/system/onboarding')
      .then((r) => setOnboardingDone(!!r.data?.data?.completed))
      .catch(() => setOnboardingDone(true)) // fail open
  }, [isAuthenticated])

  if (isLoading || (isAuthenticated && onboardingDone === null)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
        <div className="relative">
          <Cpu size={64} className="text-white animate-pulse" strokeWidth={0.5} />
          <div className="absolute inset-0 blur-3xl bg-white/10 animate-pulse"></div>
        </div>
        <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/20 italic animate-pulse">
          Initializing System...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />

  // Show wizard if onboarding incomplete (but not if already on /setup)
  if (!onboardingDone && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  // Ensure active site workspace is selected if onboarding is done
  const activeSiteId = localStorage.getItem('activeSiteId')
  if (
    onboardingDone &&
    !activeSiteId &&
    location.pathname !== '/sites' &&
    location.pathname !== '/setup'
  ) {
    return <Navigate to="/sites" replace />
  }

  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#000',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: '11px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              padding: '16px 24px',
              borderRadius: '0px',
              fontStyle: 'italic',
            },
          }}
        />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/setup"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SetupWizard />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sites"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SitePicker />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            {/* 🌑 Standalone Focused Spatial Architecture (No Sidebar) */}
            <Route
              path="/collections/pages/:id"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SpatialEditor />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/collections/pages/new"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SpatialEditor />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/globals/landing-page"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <SpatialEditor isGlobal />
                  </Suspense>
                </ProtectedRoute>
              }
            />

            {/* 🏛️ Standard Operational Routes (Wrapped in DashboardLayout) */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<DashboardBuilder />} />
                        <Route path="/collections" element={<CollectionsPage />} />
                        <Route path="/collections/:slug" element={<CollectionList />} />
                        <Route path="/collections/:slug/:id" element={<CollectionDetail />} />
                        <Route path="/globals/:slug" element={<CollectionDetail isGlobal />} />
                        <Route path="/globals/:slug/:id" element={<CollectionDetail isGlobal />} />
                        <Route path="/audit-log" element={<AuditLogPage />} />
                        <Route path="/media" element={<MediaLibrary />} />
                        <Route path="/playground" element={<DemoFeatures />} />
                        <Route
                          path="/members"
                          element={<Navigate to="/collections/members" replace />}
                        />
                        <Route path="/automations" element={<FlowBuilderPage />} />
                        <Route path="/templates" element={<TemplatesPage />} />
                        <Route path="/plugins" element={<PluginsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/ai-architect" element={<AIWriterPage />} />
                        <Route path="/system" element={<SystemHealthPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </Suspense>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
