import React, { useEffect, useState, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'

// ── Global error boundary — prevents white-screen crashes ─────────────────────
class ErrorBoundary extends React.Component<
 { children: ReactNode; fallback?: ReactNode },
 { hasError: boolean }
> {
 constructor(props: { children: ReactNode; fallback?: ReactNode }) {
 super(props)
 this.state = { hasError: false }
 }
 static getDerivedStateFromError() {
 return { hasError: true }
 }
 render() {
 if (this.state.hasError) {
 return this.props.fallback ?? (
 <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-6 p-8">
 <div className="text-[80px] leading-none select-none text-white/5 font-black font-mono">
 500
 </div>
 <p className="text-[10px] font-black uppercase tracking-[0.5em] text-red-500/60 ">
 Unexpected Error
 </p>
 <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold">
 An unexpected error occurred. Please refresh the page or contact support.
 </p>
 <button
 onClick={() => window.location.reload()}
 className="mt-4 px-6 py-2 border border-white/[0.08] text-[9px] font-black uppercase tracking-widest hover:border-red-500/30 hover:text-red-400 transition-all"
 >
 Reload
 </button>
 </div>
 )
 }
 return this.props.children
 }
}
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
import { BlockLibraryProvider } from './context/BlockLibraryContext'
import { GlobalComponentPickerModal } from './components/GlobalComponentPickerModal'
import { GlobalConfirmDialog } from './components/GlobalConfirmDialog'

// ── Code-split page bundles ────────────────────────────────────────────────────
const CollectionsPage = lazy(() => import('./pages/CollectionsPage'))
const CollectionHooksPage = lazy(() => import('./pages/CollectionHooksPage'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))
const MediaLibrary = lazy(() => import('./pages/MediaLibrary'))
const DemoFeatures = lazy(() => import('./pages/DemoFeatures'))
const SpatialEditor = lazy(() => import('./pages/SpatialEditor'))
const FlowBuilderPage = lazy(() => import('./pages/FlowBuilderPage'))
const ComponentBuilderPage = lazy(() => import('./pages/ComponentBuilderPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SystemHealthPage = lazy(() => import('./pages/SystemHealthPage'))
const AIWriterPage = lazy(() => import('./pages/AIWriterPage'))
const PluginsPage = lazy(() => import('./pages/PluginsPage'))
const SchemaBuilderPage = lazy(() => import('./pages/SchemaBuilderPage'))
const BlockBuilderPage = lazy(() => import('./pages/BlockBuilderPage'))
const DashboardBuilder = lazy(() => import('./pages/DashboardBuilder'))
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'))
const SetupWizard = lazy(() => import('./pages/SetupWizard'))
const RedirectsPage = lazy(() => import('./pages/RedirectsPage'))
const TrashPage = lazy(() => import('./pages/TrashPage'))
const BuilderPage = lazy(() => import('./pages/BuilderPage'))
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'))
const VisualGraphPage = lazy(() => import('./pages/VisualGraphPage'))

const PageLoader = () => (
 <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
 <div className="relative">
 <Cpu size={64} className="text-white animate-pulse" strokeWidth={0.5} />
 <div className="absolute inset-0 blur-3xl bg-white/10 animate-pulse" />
 </div>
 <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/20 animate-pulse">
 Loading Module...
 </p>
 </div>
)

const queryClient = new QueryClient({
 defaultOptions: {
 queries: {
 retry: 1,
 refetchOnWindowFocus: false,
 staleTime: 5 * 60 * 1000,
 gcTime: 10 * 60 * 1000,
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
 <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/20 animate-pulse">
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
 const activeWorkspaceId = localStorage.getItem('activeWorkspaceId')
 const activeSiteId = localStorage.getItem('activeSiteId')
 if (
 onboardingDone &&
 (!activeWorkspaceId || !activeSiteId) &&
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
 <BlockLibraryProvider>
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
 fontStyle: '',
 },
 }}
 />
 {/* Global component picker — available from all pages */}
 <GlobalComponentPickerModal />
 <GlobalConfirmDialog />
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
 path="/collections/:slug/new"
 element={
 <ProtectedRoute>
 <ErrorBoundary>
 <Suspense fallback={<PageLoader />}>
 <SpatialEditor />
 </Suspense>
 </ErrorBoundary>
 </ProtectedRoute>
 }
 />
 <Route
 path="/collections/:slug/singleton"
 element={
 <ProtectedRoute>
 <ErrorBoundary>
 <Suspense fallback={<PageLoader />}>
 <SpatialEditor />
 </Suspense>
 </ErrorBoundary>
 </ProtectedRoute>
 }
 />
 <Route
 path="/collections/:slug/:id"
 element={
 <ProtectedRoute>
 <ErrorBoundary>
 <Suspense fallback={<PageLoader />}>
 <SpatialEditor />
 </Suspense>
 </ErrorBoundary>
 </ProtectedRoute>
 }
 />
 <Route
 path="/globals/:slug"
 element={
 <ProtectedRoute>
 <ErrorBoundary>
 <Suspense fallback={<PageLoader />}>
 <SpatialEditor isGlobal />
 </Suspense>
 </ErrorBoundary>
 </ProtectedRoute>
 }
 />
 <Route
 path="/globals/:slug/:id"
 element={
 <ProtectedRoute>
 <ErrorBoundary>
 <Suspense fallback={<PageLoader />}>
 <SpatialEditor isGlobal />
 </Suspense>
 </ErrorBoundary>
 </ProtectedRoute>
 }
 />

 {/* 🏛️ Standard Operational Routes (Wrapped in DashboardLayout) */}
 <Route
 path="/*"
 element={
 <ProtectedRoute>
 <ErrorBoundary>
 <DashboardLayout>
 <Suspense fallback={<PageLoader />}>
 <Routes>
 <Route path="/" element={<DashboardBuilder />} />
 <Route path="/collections" element={<CollectionsPage />} />
 <Route path="/collections/:slug" element={<CollectionList />} />
 <Route path="/collections/:slug/hooks" element={<CollectionHooksPage />} />
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
 <Route path="/schema-builder" element={<SchemaBuilderPage />} />
 <Route path="/block-builder" element={<BlockBuilderPage />} />
 <Route path="/settings" element={<SettingsPage />} />
 <Route path="/ai-architect" element={<AIWriterPage />} />
 <Route path="/redirects" element={<RedirectsPage />} />
 <Route path="/trash" element={<TrashPage />} />
 <Route path="/system" element={<SystemHealthPage />} />
 <Route path="/component-builder" element={<ComponentBuilderPage />} />
 <Route path="/campaigns" element={<CampaignsPage />} />
 <Route path="/graph" element={<VisualGraphPage />} />
 <Route path="*" element={<Navigate to="/" replace />} />
 </Routes>
 </Suspense>
 </DashboardLayout>
 </ErrorBoundary>
 </ProtectedRoute>
 }
 />
 </Routes>
 </BrowserRouter>
 </BlockLibraryProvider>
 </QueryClientProvider>
 </ThemeProvider>
 )
}

export default App
