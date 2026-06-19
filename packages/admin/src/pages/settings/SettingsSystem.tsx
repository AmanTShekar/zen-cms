import React, { useState, useEffect, useCallback } from 'react'
import {
  Server, RefreshCw, Zap, Cpu, HardDrive, Trash2, Loader2,
  CheckCircle2, AlertTriangle, Activity, Database, Clock,
  Gauge, Terminal, Info, Archive
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { confirm } from '../../store/confirmStore'

interface SettingsSystemProps {
  theme: 'light' | 'dark'
}

const SettingsSystem: React.FC<SettingsSystemProps> = ({ theme }) => {
  const dark = theme === 'dark'
  const [runningOperation, setRunningOperation] = useState<string | null>(null)
  const [healthData, setHealthData] = useState<any>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [logs, setLogs] = useState<string[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await api.get('/system/health')
      setHealthData(res.data?.data || res.data)
    } catch {
      // Use fallback
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  // Auto-refresh health every 30s
  useEffect(() => {
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const res = await api.get('/system/ops/logs', { params: { lines: 50 } })
      setLogs(res.data?.data || ['Log streaming not available in current environment'])
    } catch {
      setLogs(['Unable to retrieve server logs. Ensure sufficient permissions.'])
    } finally {
      setLogsLoading(false)
    }
  }

  const handleSystemAction = async (actionName: string, endpoint: string, requiresConfirm = true) => {
    if (requiresConfirm) {
      if (!await confirm({ message: `Execute: ${actionName}? This may cause temporary downtime.` })) return
    }
    setRunningOperation(actionName)
    try {
      const res = await api.post(endpoint)
      toast.success(res.data?.message || `${actionName} executed successfully`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to execute ${actionName}`)
    } finally {
      setRunningOperation(null)
    }
  }

  const operations = [
    {
      id: 'restart-backend',
      title: 'Restart Backend Node',
      description: 'Gracefully drains active connections and restarts the core Node.js server. PM2/nodemon will catch the exit.',
      icon: Server,
      color: 'text-z-active-text',
      bg: 'bg-z-active-bg',
      border: 'border-z-active-border',
      action: () => handleSystemAction('Restart Backend', '/system/ops/restart-backend'),
    },
    {
      id: 'restart-frontend',
      title: 'Restart Admin UI',
      description: 'Sends a reload signal to the frontend service or triggers a Vercel/PM2 restart for the admin dashboard.',
      icon: Cpu,
      color: 'text-z-active-text',
      bg: 'bg-z-accent/10',
      border: 'border-z-accent/20',
      action: () => handleSystemAction('Restart Frontend', '/system/ops/restart-frontend'),
    },
    {
      id: 'clear-cache',
      title: 'Flush System Cache',
      description: 'Purges Redis / in-memory caches, compiled templates, and temporary files. Forces fresh state.',
      icon: Trash2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      action: () => handleSystemAction('Clear Cache', '/system/ops/clear-cache', false),
    },
    {
      id: 'rebuild-backend',
      title: 'Rebuild Core API',
      description: 'Runs the TypeScript compiler and rebuilds the backend bundle before an automatic restart.',
      icon: HardDrive,
      color: 'text-z-active-text',
      bg: 'bg-z-active-bg',
      border: 'border-z-accent/20',
      action: () => handleSystemAction('Rebuild Backend', '/system/ops/rebuild-backend'),
    },
    {
      id: 'restart-all',
      title: 'Full Infrastructure Restart',
      description: 'Executes a cold boot of all services, databases, and caches. Use only for critical recovery.',
      icon: Zap,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      action: () => handleSystemAction('Restart All Systems', '/system/ops/restart-all'),
    },
    {
      id: 'create-backup',
      title: 'Create Database Backup',
      description: 'Snapshots the active database to a compressed archive. Download from the Database tab.',
      icon: Archive,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      action: () => handleSystemAction('Create Backup', '/system/backup/create', false),
    }
  ]

  // Health metrics
  const memUsage = healthData?.memoryUsage
  const memUsedMB = memUsage?.heapUsed ? (memUsage.heapUsed / 1024 / 1024).toFixed(0) : '—'
  const memTotalMB = memUsage?.heapTotal ? (memUsage.heapTotal / 1024 / 1024).toFixed(0) : '—'
  const uptime = healthData?.uptime
  const uptimeStr = uptime ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m` : '—'
  const dbStatus = healthData?.database || 'unknown'
  const systemStatus = healthData?.status || 'unknown'

  const card = cn(
    'border rounded-none transition-all shadow-[var(--z-active-glow)]',
    dark ? 'bg-z-panel backdrop-blur-md border-z-border' : 'bg-z-input border-z-border shadow-sm'
  )

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className={cn('p-5 border flex items-start gap-4', dark ? 'bg-amber-500/5 border-amber-500/30' : 'bg-amber-50 border-amber-200 shadow-sm')}>
        <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className={cn('text-[11px] font-black uppercase tracking-widest', dark ? 'text-amber-400' : 'text-amber-700')}>System Level Operations</h3>
          <p className={cn('text-[8px] font-bold uppercase tracking-widest mt-1', dark ? 'text-z-muted' : 'text-gray-600')}>
            These operations directly manipulate process management (PM2, Docker) and may cause temporary service interruptions. Ensure all users are offline before executing destructive operations.
          </p>
        </div>
      </div>

      {/* Live System Health */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary">Live System Health</p>
          <button onClick={fetchHealth} className={cn('flex items-center gap-1 text-[8px] font-black uppercase tracking-widest', dark ? 'text-z-secondary hover:text-white' : 'text-z-muted hover:text-gray-800')}>
            <RefreshCw size={10} className={healthLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'System Status',
              value: systemStatus.toUpperCase(),
              icon: Activity,
              color: systemStatus === 'ok' ? 'text-z-active-text' : 'text-red-400',
              bg: systemStatus === 'ok' ? 'bg-z-active-bg' : 'bg-red-500/10',
              border: systemStatus === 'ok' ? 'border-z-accent/20' : 'border-red-500/20',
            },
            {
              label: 'Database',
              value: dbStatus.toUpperCase(),
              icon: Database,
              color: dbStatus === 'ok' ? 'text-z-active-text' : 'text-amber-400',
              bg: dbStatus === 'ok' ? 'bg-z-active-bg' : 'bg-amber-500/10',
              border: dbStatus === 'ok' ? 'border-z-accent/20' : 'border-amber-500/20',
            },
            {
              label: 'Memory',
              value: healthLoading ? '...' : `${memUsedMB}/${memTotalMB} MB`,
              icon: HardDrive,
              color: 'text-z-active-text',
              bg: 'bg-z-accent/10',
              border: 'border-z-accent/20',
            },
            {
              label: 'Uptime',
              value: healthLoading ? '...' : uptimeStr,
              icon: Clock,
              color: 'text-z-active-text',
              bg: 'bg-z-active-bg',
              border: 'border-z-active-border',
            },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={cn(card, 'p-4 flex items-center gap-3')}>
              <div className={cn('w-9 h-9 flex items-center justify-center border', bg, border)}>
                <Icon size={15} className={color} />
              </div>
              <div>
                <p className={cn('text-sm font-black', dark ? 'text-white' : 'text-z-primary')}>{healthLoading ? '...' : value}</p>
                <p className="text-[7px] font-black uppercase tracking-widest text-z-secondary">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Version Info */}
        {healthData && (
          <div className={cn(card, 'px-5 py-4 flex flex-wrap gap-4')}>
            {[
              { label: 'CMS Version', value: healthData.version || '—' },
              { label: 'Node.js', value: healthData.nodeVersion || '—' },
              { label: 'Environment', value: (healthData.environment || import.meta.env.MODE || 'production').toUpperCase() },
              { label: 'Platform', value: navigator.platform || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-0.5">
                <p className="text-[7px] font-black uppercase tracking-widest text-gray-600">{label}</p>
                <p className={cn('text-[10px] font-mono font-bold', dark ? 'text-gray-300' : 'text-gray-700')}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {operations.map(op => (
          <div key={op.id} className={cn(card, 'flex flex-col justify-between p-6 group')}>
            <div className="space-y-4">
              <div className={cn('w-12 h-12 flex items-center justify-center border', op.bg, op.border, op.color)}>
                <op.icon size={20} />
              </div>
              <div>
                <h4 className={cn('text-[11px] font-black uppercase tracking-wider', dark ? 'text-white' : 'text-z-primary')}>{op.title}</h4>
                <p className={cn('text-[8px] font-bold uppercase tracking-widest leading-relaxed mt-2', dark ? 'text-z-secondary' : 'text-z-secondary')}>{op.description}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t" style={{ borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              <button
                onClick={op.action}
                disabled={runningOperation !== null}
                className={cn('w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40',
                  dark ? 'bg-z-hover hover:bg-white/10 text-white border border-white/10 hover:border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-z-primary border border-transparent')}
              >
                {runningOperation === op.title ? (
                  <><Loader2 size={12} className="animate-spin" />Executing...</>
                ) : (
                  <><RefreshCw size={12} />Execute</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Server Log Viewer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary">Server Log Stream</p>
          <button
            onClick={() => { setShowLogs(!showLogs); if (!showLogs) fetchLogs() }}
            className={cn('text-[8px] font-black uppercase tracking-widest flex items-center gap-1', dark ? 'text-z-active-text hover:text-z-active-text' : 'text-z-accent hover:text-z-active-text')}
          >
            <Terminal size={11} />
            {showLogs ? 'Hide' : 'Show'} Logs
          </button>
        </div>
        {showLogs && (
          <div className={cn('border rounded-none overflow-hidden', dark ? 'bg-black border-z-border' : 'bg-gray-900 border-gray-700')}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-z-border">
              <span className="text-[8px] font-black uppercase tracking-widest text-green-400">● LIVE</span>
              <button onClick={fetchLogs} disabled={logsLoading} className="text-[8px] text-z-secondary hover:text-white">
                <RefreshCw size={10} className={logsLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="p-4 font-mono text-[10px] text-green-400/80 max-h-64 overflow-y-auto space-y-0.5">
              {logsLoading ? (
                <Loader2 size={14} className="animate-spin text-green-400" />
              ) : logs.length === 0 ? (
                <p className="text-gray-600">No log entries available</p>
              ) : (
                logs.map((line, i) => (
                  <p key={i} className="leading-5">{line}</p>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsSystem
