import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// api import removed as it was unused
import { useAuthStore } from './store/authStore';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import CollectionList from './pages/CollectionList';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetail from './pages/CollectionDetail';
import AuditLogPage from './pages/AuditLogPage';
import MediaLibrary from './pages/MediaLibrary';
import DemoFeatures from './pages/DemoFeatures';
import SpatialEditor from './pages/SpatialEditor';
import FlowBuilderPage from './pages/FlowBuilderPage';
import SettingsPage from './pages/SettingsPage';
import SystemHealthPage from './pages/SystemHealthPage';
import AIWriterPage from './pages/AIWriterPage';
import PluginsPage from './pages/PluginsPage';
import Dashboard from './pages/Dashboard';
import { Cpu } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-8">
        <div className="relative">
           <Cpu size={64} className="text-white animate-pulse" strokeWidth={0.5} />
           <div className="absolute inset-0 blur-3xl bg-white/10 animate-pulse"></div>
        </div>
        <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/20 italic animate-pulse">Initializing System...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

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
              fontStyle: 'italic'
            }
          }}
        />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* 🌑 Standalone Focused Spatial Architecture (No Sidebar) */}
          <Route 
            path="/collections/pages/:id" 
            element={<ProtectedRoute><SpatialEditor /></ProtectedRoute>} 
          />
          <Route 
            path="/collections/pages/new" 
            element={<ProtectedRoute><SpatialEditor /></ProtectedRoute>} 
          />
          <Route 
            path="/globals/landing-page" 
            element={<ProtectedRoute><SpatialEditor isGlobal /></ProtectedRoute>} 
          />
          
          {/* 🏛️ Standard Operational Routes (Wrapped in DashboardLayout) */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/collections" element={<CollectionsPage />} />
                    <Route path="/collections/:slug" element={<CollectionList />} />
                    <Route path="/collections/:slug/:id" element={<CollectionDetail />} />
                    <Route path="/globals/:slug" element={<CollectionDetail isGlobal />} />
                    <Route path="/globals/:slug/:id" element={<CollectionDetail isGlobal />} />
                    <Route path="/audit-log" element={<AuditLogPage />} />
                    <Route path="/media" element={<MediaLibrary />} />
                    <Route path="/playground" element={<DemoFeatures />} />
                    <Route path="/members" element={<Navigate to="/collections/members" replace />} />
                    <Route path="/automations" element={<FlowBuilderPage />} />
                    <Route path="/plugins" element={<PluginsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/ai-architect" element={<AIWriterPage />} />
                    <Route path="/system" element={<SystemHealthPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
