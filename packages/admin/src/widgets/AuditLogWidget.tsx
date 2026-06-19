import { useEffect, useState } from 'react'
import { History, ArrowRight, Activity, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function AuditLogWidget({ theme, title, isPreview }: WidgetProps) {
  const fetchLimit = 5
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(!isPreview)

  useEffect(() => {
    if (isPreview) {
      setLogs([
        { action: 'UPDATE', resource: 'Article', user: { name: 'Admin' }, createdAt: new Date().toISOString() },
        { action: 'CREATE', resource: 'User', user: { name: 'System' }, createdAt: new Date().toISOString() },
        { action: 'DELETE', resource: 'Media', user: { name: 'Editor' }, createdAt: new Date().toISOString() }
      ]);
      return;
    }
    api
      .get(`/system/audit-logs?limit=${fetchLimit}`)
      .then((r) => setLogs(r.data?.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [isPreview])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-z-secondary font-bold uppercase tracking-widest gap-2">
        <Activity size={14} className="animate-spin" /> Fetching Logs...
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-tight flex items-center gap-2">
          <History size={14} className="text-z-secondary" /> {title || 'Audit & Activity Log'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto custom-editor-scrollbar pr-2 mb-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={cn(
              "text-[9px] font-black uppercase tracking-widest border-b",
              'border-z-border text-z-secondary'
            )}>
              <th className="pb-2 font-black">Action</th>
              <th className="pb-2 font-black">Resource</th>
              <th className="pb-2 font-black">User</th>
              <th className="pb-2 font-black text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[11px] text-z-secondary">
                  No recent activity recorded.
                </td>
              </tr>
            )}
            {logs.map((log: any, i: number) => (
              <tr 
                key={log._id || i}
                onClick={() => window.location.href = '/audit-log'}
                className={cn(
                  "border-b last:border-b-0 transition-colors hover:bg-black/[0.02] dark:hover:bg-z-panel cursor-pointer group",
                  'border-z-border'
                )}
              >
                <td className="py-2.5">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-none-none",
                    log.action === 'create' ? 'bg-z-active-bg text-z-accent dark:text-z-active-text' :
                    log.action === 'delete' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    'bg-gray-500/10 text-gray-600 dark:text-z-muted'
                  )}>
                    {log.action}
                  </span>
                </td>
                <td className="py-2.5 text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {(log.collection || 'system').replace(/-/g, ' ')}
                </td>
                <td className="py-2.5 text-[11px] text-z-secondary truncate max-w-[100px]">
                  {log.user?.email || 'System'}
                </td>
                <td className="py-2.5 text-[10px] text-z-muted font-medium text-right whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link
        to="/audit-log"
        className={cn(
          'w-full py-3 text-[11px] font-bold uppercase tracking-widest transition-all border text-center flex items-center justify-center gap-2 group',
          theme === 'dark'
            ? 'bg-z-active-bg border-z-accent/20 text-z-active-text hover:bg-z-active-bg'
            : 'bg-z-active-bg border-z-active-border text-z-accent hover:bg-z-active-bg'
        )}
      >
        View Full Audit Log <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  )
}
