import { useEffect, useState } from 'react'
import {
  Database,
  Activity,
  Users,
  ArrowUpRight,
  Loader2,
  Box,
  Monitor,
  Cpu,
  Network,
  History,
  Fingerprint,
  RefreshCw,
  HardDrive,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import { toast } from 'react-hot-toast'

interface SystemStats {
  members?: number
  users?: number
  [key: string]: unknown
}

interface HealthData {
  database?: { status?: string }
  system?: { uptime?: number }
  cpu?: { usage?: string }
  memory?: { used?: string }
  [key: string]: unknown
}

interface AuditLogEntry {
  _id?: string
  action?: string
  collection?: string
  timestamp: string | number | Date
  user?: { email?: string }
  [key: string]: unknown
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  // --- CORE STATE: ADMINISTRATIVE TELEMETRY ---
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString())

  /**
   * SYNC PROTOCOL: HARVEST SYSTEM-WIDE METRICS
   * Orchestrates parallel fetching from core infrastructure nodes.
   * Independent catch blocks prevent a single endpoint failure from blocking the entire refresh.
   */
  const fetchData = async (silent = false) => {
    if (!silent) setIsRefreshing(true)

    try {
      // Execute telemetry harvest in parallel streams
      const fetchCounts = api
        .get('/system/counts')
        .then((r) => setStats(r.data.data))
        .catch(() => toast.error('Failed to load system counts'))

      const fetchHealth = api
        .get('/system/health')
        .then((r) => setHealthData(r.data.data))
        .catch(() => toast.error('Failed to load system health'))

      const fetchLogs = api
        .get('/system/audit-logs?limit=5')
        .then((r) => setAuditLogs(r.data.data))
        .catch(() => toast.error('Failed to load audit logs'))

      // Wait for all active streams to resolve
      await Promise.all([fetchCounts, fetchHealth, fetchLogs])

      setLastUpdated(new Date().toLocaleTimeString())

      if (!silent) {
        toast.success('System synchronized successfully')
      }
    } catch {
      console.error('Critical Dashboard Handshake Failure')
      if (!silent) toast.error('Partial synchronization failure')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // INITIALIZATION HANDSHAKE: Trigger initial load and periodic background sync
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(true)
    }, 0)
    const interval = setInterval(() => {
      api.get('/system/health').then((res) => setHealthData(res.data.data))
    }, 10000)
    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [])

  if (loading)
    return (
      <div
        className={cn(
          'h-screen w-full flex flex-col items-center justify-center gap-6',
          theme === 'dark' ? 'bg-[#0B0F19]' : 'bg-[#fafafa]'
        )}
      >
        <Loader2 size={32} className="animate-spin text-purple-500" strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 animate-pulse italic">
          Loading Dashboard...
        </p>
      </div>
    )

  return (
    <div
      className={cn(
        'p-6 space-y-8 animate-fade-in min-h-full transition-colors duration-500',
        theme === 'dark' ? 'bg-[#0B0F19] text-white' : 'bg-[#fafafa] text-gray-900'
      )}
    >
      {/* 🏛️ Compact Tactical Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all border',
              theme === 'dark' ? 'bg-purple-600/20 border-purple-500/30 text-purple-400' : 'bg-gray-900 border-gray-800 text-white'
            )}
          >
            <Monitor size={24} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.4em] italic">
                Zenith Command Center
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none text-white">
              System Dashboard
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 italic opacity-60">
              Welcome back. Manage your platform content and infrastructure below.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1 opacity-60">
              Last Synchronized
            </span>
            <span className="text-[11px] font-black text-purple-400 italic tracking-tighter leading-none">
              {lastUpdated}
            </span>
          </div>
          <button
            onClick={() => fetchData()}
            title="Synchronize System Data"
            className={cn(
              'w-12 h-12 border rounded-xl flex items-center justify-center transition-all shadow-sm',
              theme === 'dark'
                ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-purple-500/30'
                : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'
            )}
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* 🚀 Quick Start / Guided Onboarding for Non-Technical Users */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        {[
          {
            title: 'Initialize Content',
            sub: 'Create new records in your collection',
            icon: Plus,
            action: () => navigate('/collections/products'),
            color: 'bg-purple-600 shadow-purple-900/30 border border-purple-500/30',
          },
          {
            title: 'Media Assets',
            sub: 'Upload and manage visual media',
            icon: Box,
            action: () => navigate('/media'),
            color: 'bg-emerald-600 shadow-emerald-900/30 border border-emerald-500/30',
          },
          {
            title: 'AI Assistant',
            sub: 'Generate content with Zenith AI',
            icon: Sparkles,
            action: () => navigate('/ai-architect'),
            color: 'bg-amber-600 shadow-amber-900/30 border border-amber-500/30',
          },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className={cn(
              'p-6 rounded-2xl flex items-center gap-6 group transition-all text-left border',
              theme === 'dark'
                ? 'card-interactive hover:border-purple-500/40'
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110',
                item.color
              )}
            >
              <item.icon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-black uppercase italic leading-none mb-2">
                {item.title}
              </span>
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                {item.sub}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 📊 High-Density Metrics Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Network Integrity',
            value: healthData?.database?.status === 'healthy' ? 'OPERATIONAL' : 'DEGRADED',
            sub: 'System Status',
            icon: Activity,
            color:
              healthData?.database?.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400',
            path: '/system',
          },
          {
            label: 'Content Assets',
            value: stats
              ? Object.values(stats as Record<string, number>)
                  .reduce((a, b) => a + b, 0)
                  .toLocaleString()
              : '0',
            sub: 'Total Records',
            icon: Database,
            color: 'text-purple-400',
            path: '/collections',
          },
          {
            label: 'Audience Registry',
            value: stats ? (stats.members || stats.users || 0).toLocaleString() : '0',
            sub: 'Personnel Records',
            icon: Users,
            color: 'text-purple-400',
            path: '/collections/members',
          },
          {
            label: 'System Uptime',
            value: healthData?.system?.uptime
              ? `${Math.floor(healthData.system.uptime / 3600)}h ${Math.floor((healthData.system.uptime % 3600) / 60)}m`
              : '0h 0m',
            sub: 'Uptime Status',
            icon: Cpu,
            color: 'text-emerald-400',
            path: '/system',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => navigate(stat.path)}
            className={cn(
              'rounded-2xl p-6 relative group overflow-hidden transition-all cursor-pointer border',
              theme === 'dark'
                ? 'card-interactive hover:border-purple-500/40'
                : 'bg-white border-gray-100 shadow-sm hover:border-indigo-500/20'
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center transition-all border',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/5 text-gray-400 group-hover:text-white group-hover:border-purple-500/20'
                    : 'bg-gray-50 border-gray-100 text-gray-400 group-hover:text-indigo-600'
                )}
              >
                <stat.icon size={18} />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-[7px] font-black uppercase tracking-widest italic',
                    stat.color
                  )}
                >
                  Active
                </span>
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]',
                    stat.color.replace('text-', 'bg-')
                  )}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest italic mb-1.5">
                {stat.label}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black italic tracking-tighter uppercase leading-none text-white">
                  {stat.value}
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-gray-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </div>
              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-3 opacity-60">
                {stat.sub}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* System Telemetry Module - Expanded to Full Width */}
        <div
          className={cn(
            'xl:col-span-3 rounded-2xl p-8 space-y-8 relative overflow-hidden transition-all border',
            theme === 'dark' ? 'card bg-slate-900/40' : 'bg-white border-gray-100 shadow-sm'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-xl font-black uppercase italic leading-none text-white">
                System Infrastructure
              </h3>
              <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-2">
                Real-time System Metrics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase italic tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                System Synced
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                label: 'Processor Load',
                value: healthData?.cpu?.usage || '0%',
                icon: Cpu,
                type: 'progress',
              },
              {
                label: 'Memory Allocation',
                value: healthData?.memory?.used || '0MB',
                icon: HardDrive,
                type: 'stat',
              },
              { label: 'Service Cluster', value: '7 Active', icon: Network, type: 'stat' },
            ].map((item, i) => (
              <div
                key={i}
                className={cn(
                  'p-5 rounded-xl border transition-colors',
                  theme === 'dark'
                    ? 'bg-white/[0.02] border-white/5'
                    : 'bg-gray-50/50 border-gray-100'
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <item.icon size={14} className="text-purple-400" />
                  <span className="text-[9px] font-black uppercase italic tracking-tight text-gray-400">
                    {item.label}
                  </span>
                </div>
                <span className="text-xl font-black italic tracking-tighter leading-none text-white">
                  {item.value}
                </span>
                {item.type === 'progress' && (
                  <div className="h-1.5 w-full bg-white/5 rounded-full mt-4 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                      style={{ width: item.value }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 🕰️ Dynamic Activity Feed */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2 pt-6 border-t border-white/[0.03]">
              <h4 className="text-[10px] font-black uppercase tracking-widest italic text-purple-400">
                Audit Logs
              </h4>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/audit-log')}
                  className="text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-purple-400 transition-colors"
                >
                  View All
                </button>
                <History size={14} className="text-gray-400" />
              </div>
            </div>
            <div className="space-y-4">
              {auditLogs.map((log, i) => (
                <div
                  key={log._id || i}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border transition-all group',
                    theme === 'dark'
                      ? 'bg-white/[0.01] border-white/5 hover:border-purple-500/20'
                      : 'bg-gray-50/30 border-gray-50'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center transition-all border',
                        log.action === 'create'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : log.action === 'delete'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      )}
                    >
                      <Fingerprint size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black uppercase italic leading-none text-white">
                        {(log.collection || 'SYSTEM').replace(/-/g, ' ').replace(/_/g, ' ')}:{' '}
                        {log.action}
                      </span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1.5">
                        {new Date(log.timestamp).toLocaleTimeString()} by{' '}
                        {log.user?.email || 'System'}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
