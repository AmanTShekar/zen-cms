import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  User, 
  Calendar, 
  Clock, 
  Database, 
  Tag, 
  Globe,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import DashboardLayout from '../layouts/DashboardLayout';

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/system/audit-logs?page=${page}`);
        setLogs(res.data.data);
        setTotal(res.data.meta.pagination.total);
      } catch (err) {
        console.error('Failed to fetch audit logs');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-success/10 text-success border-success/20';
      case 'update': return 'bg-warning/10 text-warning border-warning/20';
      case 'delete': return 'bg-danger/10 text-danger border-danger/20';
      case 'publish': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-app-subtle text-text-muted border-border';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Audit Logs</h1>
            <p className="text-text-secondary mt-1">Real-time stream of all system changes and user actions</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 size={32} className="animate-spin text-accent" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>User</th>
                    <th>Collection</th>
                    <th>ID</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-app-subtle/30 transition-colors">
                      <td>
                        <span className={`badge border capitalize ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-app-subtle rounded-full flex items-center justify-center text-[10px] font-bold">
                            {log.userEmail.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{log.userEmail}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Database size={14} />
                          <span className="text-sm capitalize">{log.collectionName || 'System'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-[10px] text-text-muted">{log.documentId || '-'}</span>
                      </td>
                      <td>
                        <div className="flex flex-col text-xs">
                          <span className="text-text-primary">{new Date(log.timestamp).toLocaleDateString()}</span>
                          <span className="text-text-muted">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border bg-app-surface flex items-center justify-between">
            <span className="text-sm text-text-muted">
              Total {total} events tracked
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 hover:bg-app-subtle rounded disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium">Page {page}</span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={logs.length < 50}
                className="p-1.5 hover:bg-app-subtle rounded disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogPage;
