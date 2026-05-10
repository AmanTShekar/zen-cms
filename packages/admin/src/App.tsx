import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from './lib/api';
import { useAuthStore } from './store/authStore';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import CollectionList from './pages/CollectionList';
import CollectionDetail from './pages/CollectionDetail';
import AuditLogPage from './pages/AuditLogPage';
import MediaLibrary from './pages/MediaLibrary';
import DemoFeatures from './pages/DemoFeatures';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import SystemHealthPage from './pages/SystemHealthPage';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

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
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const Dashboard = () => {
  const [stats, setStats] = React.useState({ collections: 0, logs: 0, users: 1 });
  const [recentLogs, setRecentLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const healthRes = await api.get('/health');
        let logsData = { data: [], meta: { pagination: { total: 0 } } };
        
        try {
          const res = await api.get('/system/audit-logs?page=1&pageSize=5');
          logsData = res.data;
        } catch (e) {
          console.warn('Audit logs not available yet');
        }

        setStats({
          collections: healthRes.data.data.collections.length,
          logs: logsData.meta.pagination.total,
          users: 1
        });
        setRecentLogs(logsData.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Command Center</h1>
            <p className="text-text-secondary mt-1">Real-time overview of your Zenith CMS ecosystem</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 flex flex-col gap-2 bg-accent text-white border-none shadow-lg">
            <span className="text-sm font-medium opacity-80">Total Collections</span>
            <span className="text-4xl font-bold">{stats.collections}</span>
          </div>
          <div className="card p-6 flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">System Events</span>
            <span className="text-4xl font-bold text-text-primary">{stats.logs}</span>
          </div>
          <div className="card p-6 flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">API Status</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-success rounded-full animate-pulse"></span>
              <span className="text-xl font-bold text-text-primary">Healthy</span>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-app-surface flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Recent System Activity</h3>
            <Link to="/audit-logs" className="text-xs font-bold text-accent hover:underline">View all logs</Link>
          </div>
          <div className="p-0">
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>User</th>
                    <th>Collection</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-text-muted italic">No activity recorded yet</td></tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log._id}>
                        <td>
                          <span className="capitalize font-medium">{log.action}</span>
                        </td>
                        <td className="text-xs">{log.userEmail}</td>
                        <td className="capitalize text-xs text-text-secondary">{log.collectionName || 'System'}</td>
                        <td className="text-[10px] text-text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/collections" element={<Navigate to="/" replace />} />
                  <Route path="/collections/:slug" element={<CollectionList />} />
                  <Route path="/collections/:slug/:id" element={<CollectionDetail />} />
                  <Route path="/globals/:slug" element={<CollectionDetail isGlobal />} />
                  <Route path="/globals/:slug/:id" element={<CollectionDetail isGlobal />} />
                  <Route path="/audit-logs" element={<AuditLogPage />} />
                  <Route path="/media" element={<MediaLibrary />} />
                  <Route path="/playground" element={<DemoFeatures />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/system" element={<SystemHealthPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
