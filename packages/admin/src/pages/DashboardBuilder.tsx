import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  FileText,
  History,
  ImageIcon,
  Layers,
  Loader2,
  Plus,
  Radio,
  Sparkles,
  Users,
  XCircle,
  Globe,
  KeyRound,
  Zap,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import { PageHeader } from '../components/ui/PageHeader'
import api from '../lib/api'
import { DashboardCard } from './dashboard/DashboardCard'

// ── Types ──────────────────────────────────────────────────────────────────────
interface HealthData {
  status: string
  database: string
  version: string
  environment: string
  uptime: number
  memory: { heapUsed: string; heapTotal: string; rss: string }
}
interface AuditEntry {
  _id: string
  action: string
  collection?: string
  collectionName?: string
  user?: { email?: string }
  userEmail?: string
  timestamp: string
  status?: string
}
interface AuditStats {
  total: number
  failed: number
  success: number
  byAction: Record<string, number>
}
interface CollectionInfo {
  name: string
  label?: string
  count?: number
  drafts?: boolean
  icon?: string
}
interface PresenceMember {
  userId: string
  email?: string
  collection?: string
  documentId?: string
  color?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(ts: string) {
  const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function uptimeStr(seconds: number) {
  if (!seconds) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const ACTION_PALETTE: Record<string, string> = {
  create: 'text-z-active-text bg-z-active-bg',
  update: 'text-z-active-text bg-z-active-bg',
  delete: 'text-rose-400 bg-rose-500/10',
  login: 'text-sky-400 bg-sky-500/10',
  logout: 'text-z-muted bg-gray-500/10',
}

const INITIALS_COLORS = [
  'bg-z-accent', 'bg-z-accent', 'bg-sky-600',
  'bg-amber-600', 'bg-rose-600', 'bg-z-accent',
]

// ── Stat Pill ─────────────────────────────────────────────────────────────────
function StatPill({
  label, value, sub, icon: Icon, accent, loading,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent?: 'purple' | 'emerald' | 'red'; loading?: boolean
}) {
  const { theme } = useTheme()
  const accentClass =
    accent === 'purple' ? 'text-z-active-text' :
    accent === 'emerald' ? 'text-z-active-text' :
    accent === 'red' ? 'text-rose-400' :
    theme === 'dark' ? 'text-white' : 'text-z-primary'

  return (
    <div className={cn(
      'flex flex-col justify-between gap-2 p-5 border transition-colors z-panel backdrop-blur-md shadow-sm'
    )} style={{ background: 'var(--z-bg-panel)', borderColor: 'var(--z-border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-z-secondary">{label}</span>
        <Icon size={13} className="text-gray-600" />
      </div>
      <div>
        <span className={cn('text-2xl font-semibold  leading-none tabular-nums', accentClass)}>
          {loading ? <span className="text-gray-600 text-base">—</span> : value}
        </span>
        {sub && <p className="text-sm text-gray-600 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ── Environment Badge ──────────────────────────────────────────────────────────
function EnvBadge({ env }: { env?: string }) {
  if (!env) return null
  const isProd = env === 'production'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold   border',
      isProd
        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', isProd ? 'bg-rose-400 animate-pulse' : 'bg-amber-400')} />
      {env}
    </span>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { theme } = useTheme()
  const navigate = useNavigate()

  const [health, setHealth] = useState<HealthData | null>(null)
  const [latency, setLatency] = useState<number | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null)
  const [collections, setCollections] = useState<CollectionInfo[]>([])
  const [totalRecords, setTotalRecords] = useState<string>('—')
  const [mediaCount, setMediaCount] = useState<number | null>(null)
  const [membersOnline, setMembersOnline] = useState<PresenceMember[]>([])
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const t0 = performance.now()
      const results = await Promise.allSettled([
        api.get('/system/health'),          // 0
        api.get('/system/audit-logs?limit=8'),  // 1
        api.get('/system/audit-logs/stats'),    // 2
        api.get('/system/schemas'),             // 3 — collections list
        api.get('/system/counts'),              // 4
        api.get('/media?pageSize=1&sort=-createdAt'), // 5 — just for total count
        api.get('/presence'),                   // 6
      ])

      if (results[0].status === 'fulfilled') {
        setLatency(Math.round(performance.now() - t0))
        setHealth(results[0].value.data?.data || null)
      }
      if (results[1].status === 'fulfilled') {
        setAuditLogs(results[1].value.data?.data || [])
      }
      if (results[2].status === 'fulfilled') {
        setAuditStats(results[2].value.data?.data || null)
      }

      // Build collections from schemas + counts
      const counts: Record<string, number> = results[4].status === 'fulfilled'
        ? results[4].value.data?.data || {}
        : {}

      if (results[3].status === 'fulfilled') {
        const schemas = results[3].value.data?.data
        const cols: any[] = schemas?.collections || (Array.isArray(schemas) ? schemas : [])
        setCollections(cols.map((c: any) => ({
          name: c.slug || c.name,
          label: c.label || c.labels?.plural || c.slug || c.name,
          count: counts[c.slug || c.name],
          drafts: !!c.drafts,
          icon: c.admin?.icon,
        })))
        // total records = sum of all counts (excluding internal z_ collections)
        const total = Object.entries(counts)
          .filter(([k]) => !k.startsWith('z_'))
          .reduce((a, [, v]) => a + (v as number), 0)
        setTotalRecords(total > 0 ? total.toLocaleString() : '0')
        // member count from counts
        if (counts['z_users'] != null) setMemberCount(counts['z_users'])
        else if (counts['members'] != null) setMemberCount(counts['members'])
      }

      if (results[5].status === 'fulfilled') {
        const pagination = results[5].value.data?.meta?.pagination
        setMediaCount(pagination?.total ?? results[5].value.data?.data?.length ?? null)
      }
      if (results[6].status === 'fulfilled') {
        setMembersOnline(results[6].value.data?.data || [])
      }
    } catch {
      // partial failures are fine
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    // Only refresh presence every 30s — everything else is static on page load
    const presenceInterval = setInterval(() => {
      api.get('/presence').then(r => setMembersOnline(r.data?.data || [])).catch(() => {})
    }, 30_000)
    return () => clearInterval(presenceInterval)
  }, [fetchAll])

  const isHealthOk = health?.status === 'ok'
  const isDbOk = health?.database === 'ok'

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4">
        <Loader2 size={26} className="animate-spin text-gray-600" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-z-secondary animate-pulse">Loading…</p>
      </div>
    )
  }

  const QUICK_ACTIONS = [
    { label: 'New Content', icon: Plus, path: '/collections', color: 'bg-z-accent hover:bg-z-accent text-white' },
    { label: 'Media Library', icon: ImageIcon, path: '/media', color: theme === 'dark' ? 'bg-z-hover hover:bg-white/[0.08] text-gray-300 border border-z-border' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-z-border' },
    { label: 'AI Writer', icon: Sparkles, path: '/ai-architect', color: 'bg-z-accent hover:opacity-90 text-white' },
    { label: 'Schema Builder', icon: Layers, path: '/schema-builder', color: theme === 'dark' ? 'bg-z-hover hover:bg-white/[0.08] text-gray-300 border border-z-border' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-z-border' },
    { label: 'API Keys', icon: KeyRound, path: '/settings/api-keys', color: theme === 'dark' ? 'bg-z-hover hover:bg-white/[0.08] text-gray-300 border border-z-border' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-z-border' },
    { label: 'Audit Log', icon: History, path: '/audit-log', color: theme === 'dark' ? 'bg-z-hover hover:bg-white/[0.08] text-gray-300 border border-z-border' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-z-border' },
  ]

  return (
    <div className="min-h-full transition-colors duration-300">
      <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">

        {/* Page Header */}
        <PageHeader
          title="Dashboard"
          description="System overview for your Zenith CMS workspace."
          icon={<Activity size={20} />}
          actions={
            <div className="flex items-center gap-2">
              <EnvBadge env={health?.environment} />
              {health?.version && (
                <span className="text-sm font-semibold text-gray-600">
                  v{health.version}
                </span>
              )}
            </div>
          }
        />

        {/* ── Row 1: Key stats ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatPill label="Content Records" value={totalRecords} icon={FileText} />
          <StatPill label="Collections" value={String(collections.length || '—')} icon={Database} />
          <StatPill
            label="Media Files"
            value={mediaCount != null ? mediaCount.toLocaleString() : '—'}
            icon={ImageIcon}
          />
          <StatPill
            label="Team Members"
            value={memberCount != null ? String(memberCount) : '—'}
            sub={membersOnline.length > 0 ? `${membersOnline.length} online now` : undefined}
            icon={Users}
          />
          <StatPill
            label="API Status"
            value={health ? (isHealthOk ? 'Operational' : 'Degraded') : '—'}
            sub={latency != null ? `${latency}ms` : undefined}
            icon={Radio}
            accent={!health ? undefined : isHealthOk ? 'emerald' : 'red'}
          />
          <StatPill
            label="Database"
            value={health ? (isDbOk ? 'Connected' : 'Degraded') : '—'}
            sub={uptimeStr(health?.uptime ?? 0) !== '—' ? `Up ${uptimeStr(health?.uptime ?? 0)}` : undefined}
            icon={Activity}
            accent={!health ? undefined : isDbOk ? 'emerald' : 'red'}
          />
        </div>

        {/* ── Row 2: Audit stats ───────────────────────────────────────────── */}
        {auditStats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatPill label="Total Events" value={auditStats.total.toLocaleString()} icon={History} />
            <StatPill label="Successful Ops" value={auditStats.success.toLocaleString()} icon={CheckCircle2} accent="emerald" />
            <StatPill label="Failed Ops" value={auditStats.failed.toLocaleString()} icon={XCircle} accent={auditStats.failed > 0 ? 'red' : undefined} />
          </div>
        )}

        {/* ── Row 3: Quick Actions ────────────────────────────────────────────── */}
        <DashboardCard title="Quick Actions" icon={<Zap size={13} />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.path)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold  tracking-wide transition-all',
                  a.color
                )}
              >
                <a.icon size={14} />
                {a.label}
              </button>
            ))}
          </div>
        </DashboardCard>

        {/* ── Row 4: Collections + Activity ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Collections */}
          <DashboardCard
            title="Collections"
            icon={<Database size={13} />}
            noPadding
            action={
              <Link to="/schema-builder" className={cn('text-sm font-semibold   flex items-center gap-1 transition-colors', theme === 'dark' ? 'text-gray-600 hover:text-gray-300' : 'text-z-muted hover:text-gray-700')}>
                Manage <ArrowRight size={11} />
              </Link>
            }
          >
            {collections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-4 px-6">
                <Database size={32} className="text-gray-700" strokeWidth={1} />
                <div className="text-center">
                  <p className="text-sm font-bold text-z-muted">No collections yet</p>
                  <p className="text-sm text-gray-600 mt-1">Create your first collection to start managing content.</p>
                </div>
                <Link to="/schema-builder" className="px-5 py-2.5 bg-z-accent hover:opacity-90 text-white text-sm font-semibold transition-colors">
                  + Create Collection
                </Link>
              </div>
            ) : (
              <div>
                {collections.slice(0, 8).map((col) => (
                  <Link
                    key={col.name}
                    to={`/collections/${col.name}`}
                    className={cn(
                      'flex items-center justify-between px-5 py-3 group transition-colors border-b last:border-b-0',
                      theme === 'dark' ? 'border-z-border hover:bg-z-hover' : 'border-z-border hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-6 h-6 flex items-center justify-center border text-z-secondary', theme === 'dark' ? 'bg-z-hover border-z-border' : 'bg-z-input border-z-border')}>
                        <Layers size={11} />
                      </div>
                      <div>
                        <span className={cn('text-sm font-bold capitalize', theme === 'dark' ? 'text-gray-200' : 'text-gray-800')}>
                          {col.label || col.name}
                        </span>
                        {col.drafts && (
                          <span className="ml-2 text-sm font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5">
                            Drafts
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {col.count != null && (
                        <span className="text-sm font-semibold tabular-nums text-gray-600">
                          {col.count.toLocaleString()}
                        </span>
                      )}
                      <ArrowRight size={12} className={cn('transition-transform group-hover:translate-x-0.5', theme === 'dark' ? 'text-gray-700' : 'text-gray-300')} />
                    </div>
                  </Link>
                ))}
                {collections.length > 8 && (
                  <div className={cn('px-5 py-3 border-t', 'border-z-border')}>
                    <Link to="/schema-builder" className="text-sm font-semibold text-gray-600 hover:text-z-active-text transition-colors">
                      +{collections.length - 8} more collections →
                    </Link>
                  </div>
                )}
                <div className={cn('px-5 py-3 border-t', 'border-z-border')}>
                  <Link to="/schema-builder" className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-z-active-text transition-colors w-fit">
                    <Plus size={11} /> New Collection
                  </Link>
                </div>
              </div>
            )}
          </DashboardCard>

          {/* Recent Activity */}
          <DashboardCard
            title="Recent Activity"
            icon={<History size={13} />}
            noPadding
            action={
              <Link to="/audit-log" className={cn('text-sm font-semibold   flex items-center gap-1 transition-colors', theme === 'dark' ? 'text-gray-600 hover:text-gray-300' : 'text-z-muted hover:text-gray-700')}>
                Full Log <ArrowRight size={11} />
              </Link>
            }
          >
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-2">
                <History size={28} className="text-gray-700" strokeWidth={1} />
                <p className="text-sm text-gray-600">No activity recorded yet.</p>
              </div>
            ) : (
              <div>
                {auditLogs.map((log) => {
                  const actor = log.userEmail || log.user?.email || 'System'
                  const initials = actor === 'System' ? 'SY' : actor.slice(0, 2).toUpperCase()
                  const colorIdx = actor.charCodeAt(0) % INITIALS_COLORS.length
                  const collection = (log.collectionName || log.collection || 'system').replace(/-/g, ' ')
                  const isFailed = log.status === 'failed'

                  return (
                    <div
                      key={log._id}
                      onClick={() => navigate('/audit-log')}
                      className={cn(
                        'flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors border-b last:border-b-0',
                        theme === 'dark' ? 'border-z-border hover:bg-z-hover' : 'border-z-border hover:bg-gray-50',
                        isFailed && (theme === 'dark' ? 'bg-rose-500/[0.03]' : 'bg-rose-50/50')
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn('w-6 h-6 flex items-center justify-center text-white text-sm font-semibold shrink-0', INITIALS_COLORS[colorIdx])}>
                        {initials}
                      </div>
                      {/* Action badge */}
                      <span className={cn(
                        'inline-flex px-1.5 py-0.5 text-sm font-semibold   shrink-0',
                        isFailed ? 'text-rose-400 bg-rose-500/10' : (ACTION_PALETTE[log.action?.toLowerCase()] || 'text-z-muted bg-gray-500/10')
                      )}>
                        {log.action}
                      </span>
                      {/* Collection */}
                      <span className={cn('text-sm font-medium flex-1 truncate capitalize', theme === 'dark' ? 'text-z-muted' : 'text-gray-600')}>
                        {collection}
                      </span>
                      {/* Time */}
                      <span className="text-sm text-gray-600 shrink-0 tabular-nums">{timeAgo(log.timestamp)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </DashboardCard>

        </div>

        {/* ── Row 5: Who's online + API health strip ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Who's Editing — Google Docs style */}
          <DashboardCard title="Who's Editing" icon={<Users size={13} />}>
            {membersOnline.length === 0 ? (
              <div className="flex items-center gap-2.5">
                <div className={cn('w-2 h-2 rounded-full', theme === 'dark' ? 'bg-white/10' : 'bg-gray-200')} />
                <p className="text-sm text-gray-600">No one else is editing right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {membersOnline.map((m, i) => {
                  const email = m.email || m.userId || 'Unknown'
                  const name = email.split('@')[0]
                  const initials = name.slice(0, 2).toUpperCase()
                  const collection = m.collection
                    ? m.collection.replace(/-/g, ' ')
                    : null
                  const avatarColor = m.color || INITIALS_COLORS[i % INITIALS_COLORS.length]

                  return (
                    <div key={m.userId || i} className="flex items-center gap-3">
                      {/* Avatar with live pulse */}
                      <div className="relative shrink-0">
                        <div
                          className="w-7 h-7 flex items-center justify-center text-white text-sm font-semibold"
                          style={{ backgroundColor: avatarColor }}
                          title={email}
                        >
                          {initials}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-z-accent rounded-full border-2 border-black" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-bold truncate', theme === 'dark' ? 'text-gray-200' : 'text-gray-800')}>
                          {name}
                        </p>
                        {collection ? (
                          <p className="text-sm text-z-secondary truncate">
                            Editing <span className="capitalize font-medium text-z-muted">{collection}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600">Browsing the CMS</p>
                        )}
                      </div>
                      {/* Live indicator */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-z-accent animate-pulse" />
                        <span className="text-sm text-gray-600">Live</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </DashboardCard>

          {/* API / DB Health strip */}
          <DashboardCard title="System Status" icon={<Globe size={13} />}>
            <div className="space-y-3">
              {[
                {
                  label: 'REST API',
                  ok: isHealthOk,
                  detail: latency != null ? `${latency}ms latency` : 'Checking…',
                },
                {
                  label: 'Database',
                  ok: isDbOk,
                  detail: health?.database || 'Unknown',
                },
                {
                  label: 'Memory',
                  ok: true,
                  detail: health?.memory?.heapUsed
                    ? `${health.memory.heapUsed} / ${health.memory.heapTotal} heap`
                    : '—',
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.ok
                      ? <CheckCircle2 size={13} className="text-z-active-text shrink-0" />
                      : <AlertTriangle size={13} className="text-rose-400 shrink-0" />}
                    <span className={cn('text-sm font-bold', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>{item.label}</span>
                  </div>
                  <span className="text-sm text-gray-600">{item.detail}</span>
                </div>
              ))}
              {health?.uptime != null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-gray-600 shrink-0" />
                    <span className={cn('text-sm font-bold', theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}>Uptime</span>
                  </div>
                  <span className="text-sm text-gray-600">{uptimeStr(health.uptime)}</span>
                </div>
              )}
            </div>
          </DashboardCard>

        </div>

      </div>
    </div>
  )
}
