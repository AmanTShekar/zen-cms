import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Server,
  Cpu,
  Database,
  RefreshCw,
  Zap,
  Terminal,
  Signal,
  Key,
  Globe,
  Loader2,
  Lock,
  Network,
  Radio,
} from 'lucide-react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import { toast } from 'react-hot-toast'

interface TelemetryCardProps {
  title: string
  status: string
  icon: React.ElementType
  detail: string | number
  subdetail: string
  trend?: boolean
  theme: 'light' | 'dark'
}

const TelemetryCard = ({
  title,
  status,
  icon: Icon,
  detail,
  subdetail,
  trend,
  theme,
}: TelemetryCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'p-8 border rounded-none transition-all duration-500 relative group overflow-hidden',
      theme === 'dark'
        ? 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.08]'
        : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
    )}
  >
    <div className="absolute top-0 right-0 p-8 text-emerald-500/[0.02] pointer-events-none group-hover:text-emerald-500/[0.05] transition-colors">
      <Icon size={100} strokeWidth={0.5} />
    </div>

    <div className="flex items-center justify-between mb-8 relative z-10">
      <div
        className={cn(
          'w-12 h-12 flex items-center justify-center transition-all',
          theme === 'dark' ? 'bg-white/5 text-white' : 'bg-gray-900 text-white'
        )}
      >
        <Icon size={20} />
      </div>
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] italic border',
          status === 'healthy' || status === 'up' || status === 'ok'
            ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10'
            : 'bg-amber-500/5 text-amber-500 border-amber-500/10'
        )}
      >
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-none',
            status === 'healthy' || status === 'up' || status === 'ok'
              ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
              : 'bg-amber-500'
          )}
        />
        {status === 'healthy' || status === 'up' || status === 'ok' ? 'Online' : 'Degraded'}
      </div>
    </div>

    <div className="relative z-10">
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] italic mb-3">
        {title}
      </p>
      <h3 className="text-3xl font-black tracking-tighter uppercase italic leading-none">
        {detail}
      </h3>
      <div className="flex items-center justify-between mt-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic opacity-60">
          {subdetail}
        </p>
        {trend && (
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter flex items-center gap-1">
            <Zap size={10} /> Optimal
          </span>
        )}
      </div>
    </div>
  </motion.div>
)

interface HealthData {
  version: string
  database: string
  uptime: number
  environment: string
  memory: {
    used: string
    total: string
  }
  cpu: {
    cores: number
    usage: string
  }
  services: {
    storage: string
    email: string
    ai: string
  }
}

const SystemHealthPage = () => {
  const { theme } = useTheme()
  // --- INFRASTRUCTURE TELEMETRY STATE ---
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  /**
   * TELEMETRY HEARTBEAT: POLL SYSTEM KERNEL
   * Fetches real-time hardware and service health from the /system/health node.
   * This logic maintains the 'Live Pulse' of the administrative hub.
   */
  const fetchHealth = useCallback(
    async (silent = false) => {
      if (!silent) setIsRefreshing(true)
      try {
        const res = await api.get('/system/health')
        setHealth(res.data.data)
        if (!silent && !loading) {
          toast.success('Telemetry synchronized')
        }
      } catch {
        console.error('Health check failure: Connection interrupted')
        if (!silent) toast.error('Sync failure: Connection interrupted')
      } finally {
        setLoading(false)
        setIsRefreshing(false)
      }
    },
    [loading]
  )

  /**
   * INITIALIZATION & POLLING LIFECYCLE
   * Orchestrates the 5-second automatic telemetry heartbeat.
   */
  useEffect(() => {
    const initTelemetry = async () => {
      await fetchHealth(true)
    }
    initTelemetry()

    const interval = setInterval(() => {
      void fetchHealth(true)
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchHealth])

  if (loading)
    return (
      <div
        className={cn(
          'h-full w-full flex flex-col items-center justify-center gap-8',
          theme === 'dark' ? 'bg-black' : 'bg-[#fafafa]'
        )}
      >
        <div className="relative w-24 h-24">
          <Loader2
            size={32}
            className="absolute inset-0 m-auto animate-spin text-emerald-500"
            strokeWidth={1.5}
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full border border-emerald-500/10 border-t-emerald-500/40"
          />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 italic mb-2">
            Establishing Uplink
          </p>
          <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em] animate-pulse">
            Scanning System Core...
          </p>
        </div>
      </div>
    )

  return (
    <div
      className={cn(
        'p-6 space-y-12 animate-fade-in transition-colors duration-500',
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      )}
    >
      {/* 👑 Tactical Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-12 h-12 flex items-center justify-center shadow-lg transition-all',
              theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
            )}
          >
            <Radio size={24} className="animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em] italic">
                Telemetry Stream
              </span>
              <div className="w-1.5 h-1.5 bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
              System Health
            </h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 italic opacity-60">
              Real-time performance audit and infrastructure heartbeat.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchHealth()}
          disabled={isRefreshing}
          className={cn(
            'px-8 py-3 rounded-none font-black text-[11px] uppercase tracking-[0.2em] italic flex items-center gap-3 transition-all active:scale-95',
            theme === 'dark'
              ? 'bg-white text-black hover:bg-gray-200'
              : 'bg-gray-900 text-white hover:bg-black'
          )}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Sync Telemetry</span>
        </button>
      </header>

      {/* 📊 High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TelemetryCard
          title="Engine Build"
          status="up"
          icon={Zap}
          detail={health?.version || 'v6.0.45'}
          subdetail="Production Stable"
          trend={true}
          theme={theme}
        />
        <TelemetryCard
          title="Data Link"
          status={health?.database === 'healthy' ? 'up' : 'down'}
          icon={Database}
          detail={health?.database === 'healthy' ? 'Optimal' : 'Degraded'}
          subdetail="Mongo Cluster 0"
          trend={health?.database === 'healthy'}
          theme={theme}
        />
        <TelemetryCard
          title="Core Uptime"
          status="up"
          icon={Server}
          detail={`${Math.floor((health?.uptime || 0) / 3600)}h ${Math.floor(((health?.uptime || 0) % 3600) / 60)}m`}
          subdetail="System Uptime"
          theme={theme}
        />
        <TelemetryCard
          title="Infrastructure"
          status="up"
          icon={Globe}
          detail={(health?.environment || 'PROD').toUpperCase()}
          subdetail="Active Environment"
          theme={theme}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 🧠 Neural Load / Resources */}
        <div
          className={cn(
            'p-10 border rounded-none relative group overflow-hidden',
            theme === 'dark'
              ? 'bg-white/[0.02] border-white/[0.05]'
              : 'bg-white border-gray-100 shadow-sm'
          )}
        >
          <div className="absolute top-0 right-0 p-12 text-emerald-500/[0.01] pointer-events-none group-hover:text-emerald-500/[0.03] transition-colors">
            <Cpu size={200} strokeWidth={0.5} />
          </div>

          <div className="flex items-center gap-6 mb-12 relative z-10">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 italic font-black text-xl">
              C
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight uppercase italic leading-none">
                Compute Resources
              </h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 italic leading-none">
                Real-time hardware utilization
              </p>
            </div>
          </div>

          <div className="space-y-10 relative z-10">
            {/* Memory Bar */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">
                    Memory Allocation
                  </p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {health?.memory.used} / {health?.memory.total}
                  </p>
                </div>
                <span className="text-2xl font-black italic tracking-tighter">
                  {health?.memory?.used?.includes('MB') && health?.memory?.total?.includes('GB')
                    ? Math.round(
                        (parseInt(health?.memory?.used) /
                          (parseInt(health?.memory?.total) * 1024)) *
                          100
                      )
                    : Math.round(
                        (parseInt(health?.memory?.used || '0') /
                          parseInt(health?.memory?.total || '1')) *
                          100
                      )}
                  %
                </span>
              </div>
              <div className="h-2 w-full bg-emerald-500/5 rounded-none overflow-hidden p-[2px] border border-emerald-500/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      health?.memory?.used?.includes('MB') && health?.memory?.total?.includes('GB')
                        ? Math.round(
                            (parseInt(health?.memory?.used) /
                              (parseInt(health?.memory?.total) * 1024)) *
                              100
                          )
                        : Math.round(
                            (parseInt(health?.memory?.used || '0') /
                              parseInt(health?.memory?.total || '1')) *
                              100
                          )
                    }%`,
                  }}
                  className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                />
              </div>
            </div>

            {/* CPU Bar */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">
                    Processor Load
                  </p>
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    Throughput: {health?.cpu?.cores || 0} Cores Active
                  </p>
                </div>
                <span className="text-2xl font-black italic tracking-tighter">
                  {health?.cpu?.usage || '0%'}
                </span>
              </div>
              <div className="h-2 w-full bg-emerald-500/5 rounded-none overflow-hidden p-[2px] border border-emerald-500/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: health?.cpu?.usage || '0%' }}
                  className="h-full bg-emerald-500/40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 🔐 Security / Integrity */}
        <div
          className={cn(
            'p-10 border rounded-none relative group overflow-hidden',
            theme === 'dark'
              ? 'bg-white/[0.02] border-white/[0.05]'
              : 'bg-white border-gray-100 shadow-sm'
          )}
        >
          <div className="absolute top-0 right-0 p-12 text-emerald-500/[0.01] pointer-events-none group-hover:text-emerald-500/[0.03] transition-colors">
            <Lock size={200} strokeWidth={0.5} />
          </div>

          <div className="flex items-center gap-6 mb-12 relative z-10">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight uppercase italic leading-none">
                Security Protocols
              </h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 italic leading-none">
                Integrity and authentication audit
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {[
              {
                label: 'Token Auth',
                status: 'Active',
                icon: Key,
                detail: 'HS256 Verified',
                path: '/settings?tab=security',
              },
              {
                label: 'Cloud Storage',
                status: health?.services?.storage === 'cloudinary' ? 'Active' : 'Local',
                icon: Network,
                detail: health?.services?.storage?.toUpperCase() || 'LOCAL',
                path: '/settings?tab=database',
              },
              {
                label: 'Email Relay',
                status: health?.services?.email === 'configured' ? 'Active' : 'Offline',
                icon: Signal,
                detail: 'Resend.com',
                path: '/settings?tab=notifications',
              },
              {
                label: 'AI Engine',
                status: health?.services?.ai === 'configured' ? 'Active' : 'Disabled',
                icon: Terminal,
                detail: 'LLM Orchestrator',
                path: '/settings?tab=ai',
              },
            ].map((svc, i) => (
              <Link
                to={svc.path}
                key={i}
                className={cn(
                  'p-6 border transition-all hover:bg-white/[0.02] group block',
                  theme === 'dark'
                    ? 'bg-black/40 border-white/[0.08] hover:border-emerald-500/20'
                    : 'bg-white border-gray-100 hover:border-emerald-500/10 shadow-sm'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-none flex items-center justify-center border transition-colors',
                        theme === 'dark'
                          ? 'bg-white/5 border-white/[0.08] group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20'
                          : 'bg-gray-50 border-gray-100 group-hover:bg-emerald-50 group-hover:border-emerald-200'
                      )}
                    >
                      <svc.icon
                        size={20}
                        className="text-gray-400 group-hover:text-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-[12px] font-black uppercase italic leading-none">
                        {svc.label}
                      </span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2">
                        {svc.detail}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={cn(
                        'text-[9px] font-black uppercase px-3 py-1 border rounded-none italic',
                        svc.status === 'Active'
                          ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                          : 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                      )}
                    >
                      {svc.status}
                    </span>
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      Configure →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 📜 Audit History Shortcut */}
      <motion.div
        whileHover={{ x: 5 }}
        onClick={() => toast.success('Redirecting to Audit Logs')}
        className={cn(
          'p-8 border rounded-none flex items-center justify-between group cursor-pointer transition-all',
          theme === 'dark'
            ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/5'
            : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
        )}
      >
        <div className="flex items-center gap-8">
          <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Terminal size={24} />
          </div>
          <div>
            <p className="text-[14px] font-black uppercase italic tracking-tight leading-none mb-2">
              View System Audit Logs
            </p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic leading-none opacity-60">
              Complete history of administrative operations and system events.
            </p>
          </div>
        </div>
        <div className="w-12 h-12 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
          <Zap size={20} />
        </div>
      </motion.div>
    </div>
  )
}

export default SystemHealthPage
