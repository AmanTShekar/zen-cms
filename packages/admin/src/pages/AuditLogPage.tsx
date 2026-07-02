import React, { useEffect, useState, useCallback } from 'react'
import {
  History,
  Search,
  Download,
  RefreshCw,
  KeyRound,
  Zap,
  ArrowRight,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  Shield,
  Globe,
  AlertTriangle,
} from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { PageHeader } from '../components/ui/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

interface AuditLogEntry {
  _id?: string
  id?: string
  userEmail?: string
  userName?: string
  userId?: string
  action: string
  collectionName?: string
  documentId?: string
  changes?: any
  ip?: string
  userAgent?: string
  timestamp: string
  status?: string
  resource?: string
  siteId?: string
  hash?: string
  previousHash?: string
}

interface AuditStats {
  total: number
  failed: number
  success: number
  byAction: Record<string, number>
}

const AuditLogPage: React.FC = () => {
  const { theme } = useTheme()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [purging, setPurging] = useState(false)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState('')
  const [showPurgeModal, setShowPurgeModal] = useState(false)
  const [purgeExpectedCode, setPurgeExpectedCode] = useState('')
  const [purgeInputCode, setPurgeInputCode] = useState('')
  const [purgeDays, setPurgeDays] = useState(30)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 25 }
      if (searchQuery) params.search = searchQuery
      if (filterAction) params.action = filterAction
      const res = await api.get('/system/audit-logs', { params })
      setLogs(res.data.data || [])
      if (res.data.meta?.pagination) {
        setTotal(res.data.meta.pagination.total)
        setTotalPages(res.data.meta.pagination.totalPages)
      }
    } catch {
      toast.error('Failed to fetch audit logs')
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }, [page, searchQuery, filterAction])

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/system/audit-logs/stats')
      if (res.data.data) setStats(res.data.data)
    } catch {
      // stats are non-critical
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [fetchLogs, fetchStats])

  const handleSearch = () => {
    setPage(1)
    fetchLogs()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await api.get('/system/audit-logs', { params: { limit: 500 } })
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `ZENITH_AUDIT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Report exported')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handlePurgeClick = () => {
    setPurgeExpectedCode(Math.floor(100000 + Math.random() * 900000).toString())
    setPurgeInputCode('')
    setPurgeDays(30)
    setShowPurgeModal(true)
  }

  const executePurge = () => {
    if (purgeInputCode !== purgeExpectedCode) {
      toast.error('Authorization code does not match')
      return
    }
    
    setShowPurgeModal(false)
    setPurging(true)
    const before = new Date(Date.now() - purgeDays * 24 * 60 * 60 * 1000).toISOString()
    toast
      .promise(api.post('/system/audit-logs/purge', { before }), {
        loading: `Purging audit logs...`,
        success: (res: any) => {
          fetchLogs()
          fetchStats()
          return res.data?.data?.message || `Purged ${res.data?.data?.deleted || 0} audit log entries`
        },
        error: 'Purge failed',
      })
      .finally(() => setPurging(false))
  }

  const formatAction = (action: string): string => action?.toUpperCase() || 'UNKNOWN'

  const getActionColor = (action: string) => {
    const upper = action?.toUpperCase()
    if (upper === 'CREATE')
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
    if (upper === 'UPDATE')
      return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
    if (upper === 'DELETE') 
      return 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-200 dark:border-red-500/20'
    return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
  }

  const displayName = (log: AuditLogEntry) => log.userName || log.userEmail || 'System'

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Header */}
      <PageHeader
        title="Audit Logs"
        description="System History"
        icon={<History size={24} />}
        backLink={{ to: '/', label: 'Dashboard' }}
        actions={
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'px-6 py-2 border rounded-lg flex items-center gap-8 shadow-sm transition-all',
                theme === 'dark'
                  ? 'bg-z-panel border-z-border'
                  : 'bg-z-panel border-z-border'
              )}
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-z-muted opacity-60">
                  Total Logs
                </span>
                <span className="text-xl font-semibold leading-none text-z-secondary ">
                  {total.toLocaleString()}
                </span>
              </div>
              {stats && (
                <>
                  <div
                    className={cn('w-px h-8', theme === 'dark' ? 'bg-z-hover' : 'bg-[var(--z-bg-hover)]')}
                  />
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-z-muted opacity-60">
                      Failed
                    </span>
                    <span className="text-xl font-semibold leading-none text-red-500">
                      {stats.failed}
                    </span>
                  </div>
                  <div
                    className={cn('w-px h-8', theme === 'dark' ? 'bg-z-hover' : 'bg-[var(--z-bg-hover)]')}
                  />
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-z-muted opacity-60">
                      Status
                    </span>
                    <span className="text-xs font-semibold text-z-secondary  leading-none">
                      Stable
                    </span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => {
                setPage(1)
                fetchLogs()
              }}
              className={cn(
                'w-10 h-10 border rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-sm',
                theme === 'dark'
                  ? 'bg-z-panel border-z-border text-z-muted hover:border-z-border'
                  : 'bg-z-panel border-z-border text-z-muted hover:border-[var(--z-border-strong)]'
              )}
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        }
      />

      <div
        className={cn(
          'flex-1 overflow-y-auto p-10 space-y-6 transition-colors duration-500',
          theme === 'dark' ? 'bg-app text-z-primary' : 'bg-[#fafafa] text-z-primary'
        )}
      >
        {/* Table Card */}
        <div
          className={cn(
            'flex flex-col border rounded-xl shadow-sm transition-all overflow-hidden',
            theme === 'dark'
              ? 'bg-z-panel border-z-border'
              : 'bg-z-panel border-z-border'
          )}
        >
          {/* Control Bar */}
          <div
            className={cn(
              'px-8 py-5 border-b flex items-center justify-between gap-6 transition-colors',
              'border-z-border'
            )}
          >
            <div className="flex items-center gap-4 flex-1">
              <div
                className={cn(
                  'flex items-center gap-3 border px-4 py-2 rounded-md w-full max-w-md shadow-sm transition-all group relative overflow-hidden',
                  theme === 'dark'
                    ? 'bg-[#1c1c1c] border-z-border focus-within:border-z-accent'
                    : 'bg-z-panel border-[var(--z-border-strong)] focus-within:border-z-accent'
                )}
              >
                <Search
                  size={16}
                  className="text-z-secondary group-focus-within:text-z-secondary  transition-colors"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by email, name, collection..."
                  className="bg-transparent border-none outline-none text-sm w-full placeholder:text-z-muted dark:placeholder:text-z-secondary"
                />
              </div>

              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value)
                  setPage(1)
                }}
                className={cn(
                  'px-4 py-2 border rounded-md text-sm outline-none transition-all shadow-sm',
                  theme === 'dark'
                    ? 'bg-[#1c1c1c] border-z-border text-z-primary focus:border-z-accent'
                    : 'bg-z-panel border-[var(--z-border-strong)] text-z-primary focus:border-z-accent'
                )}
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="publish">Publish</option>
                <option value="unpublish">Unpublish</option>
                <option value="login">Login</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePurgeClick}
                disabled={purging}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/20',
                  theme === 'dark'
                    ? 'bg-[#1c1c1c] border-z-border text-z-muted'
                    : 'bg-z-panel border-[var(--z-border-strong)] text-z-secondary'
                )}
              >
                <Trash2 size={14} />
                Purge
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-all shadow-sm active:scale-95',
                  theme === 'dark'
                    ? 'bg-z-panel text-z-primary hover:bg-[var(--z-border)]'
                    : 'bg-z-accent text-z-primary hover:brightness-110'
                )}
              >
                {exporting ? (
                  <RefreshCw className="animate-spin" size={14} />
                ) : (
                  <Download size={14} />
                )}
                Export
              </button>
            </div>
          </div>

          {/* Log Table */}
          <div className="overflow-x-auto">
            <div className="overflow-x-auto min-w-full pb-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr
                    className={cn(
                      'border-b text-left',
                      theme === 'dark'
                        ? 'border-z-border bg-[#1c1c1c]'
                        : 'border-z-border bg-[var(--z-bg-input)]'
                    )}
                  >
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-z-muted">
                      Operator
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-z-muted">
                      Action
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-z-muted">
                      Collection
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-z-muted">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-z-muted text-right">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={cn(
                    'divide-y',
                    theme === 'dark' ? 'divide-z-border' : 'divide-z-border'
                  )}
                >
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Loader2
                          size={24}
                          className="animate-spin text-z-secondary  mx-auto opacity-40"
                        />
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="text-z-secondary text-sm font-bold">
                          No audit logs found
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <motion.tr
                        key={log._id || log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() =>
                          setShowDetails(
                            showDetails === (log._id || log.id) ? null : log._id || log.id
                          )
                        }
                        className="hover:bg-z-border/[0.02] transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0',
                                theme === 'dark'
                                  ? 'bg-[#2c2c2c] border-z-border text-z-secondary'
                                  : 'bg-[var(--z-bg-hover)] border-z-border text-z-secondary'
                              )}
                            >
                              <KeyRound size={14} />
                            </div>
                            <div className="flex flex-col">
                              <span className={cn("text-sm font-semibold leading-none", theme === 'dark' ? "text-z-primary" : "text-z-primary")}>
                                {displayName(log)}
                              </span>
                              <span className="text-xs text-z-muted mt-1">
                                {log.userId
                                  ? `ID: ${log.userId.slice(-8).toUpperCase()}`
                                  : 'SYSTEM'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={cn(
                              'px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 border',
                              getActionColor(log.action)
                            )}
                          >
                            <Zap size={10} fill="currentColor" />
                            {formatAction(log.action)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-medium leading-none", theme === 'dark' ? "text-z-primary" : "text-z-primary")}>
                              {log.collectionName || 'SYSTEM'}
                            </span>
                            {log.documentId && (
                              <div className="flex items-center gap-1.5 mt-1 text-z-muted">
                                <ArrowRight size={10} />
                                <span className="text-xs font-mono">
                                  DOC_{log.documentId.slice(-12).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'text-sm font-medium',
                              log.status === 'failed'
                                ? 'text-red-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                            )}
                          >
                            {log.status === 'failed' ? 'Failed' : 'Success'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={cn("text-sm font-medium leading-none", theme === 'dark' ? "text-z-secondary" : "text-z-primary")}>
                              {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : '-'}
                            </span>
                            <span className="text-xs text-z-muted leading-none">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '-'}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Expand */}
          {showDetails &&
            (() => {
              const log = logs.find((l) => (l._id || l.id) === showDetails)
              if (!log) return null
              return (
                <div
                  className={cn(
                    'px-8 py-6 border-t transition-colors',
                    theme === 'dark'
                      ? 'bg-[#151515] border-z-border'
                      : 'bg-[#fafafa] border-z-border'
                  )}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm font-mono">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-z-muted mb-1">
                        IP Address
                      </div>
                      <div className="text-sm font-medium">{log.ip || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-z-muted mb-1">
                        User Agent
                      </div>
                      <div className="text-sm font-medium truncate" title={log.userAgent}>
                        {log.userAgent || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-z-muted mb-1">
                        Resource
                      </div>
                      <div className="text-sm font-medium truncate" title={log.resource}>
                        {log.resource || 'N/A'}
                      </div>
                    </div>
                    {log.siteId && (
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-z-muted mb-1">
                          Site ID
                        </div>
                        <div className="text-sm font-medium">{log.siteId}</div>
                      </div>
                    )}
                    {log.hash && (
                      <>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-z-muted mb-1">
                            Audit Hash
                          </div>
                          <div className="text-sm font-medium truncate font-mono" title={log.hash}>
                            {log.hash.slice(0, 24)}...
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-z-muted mb-1">
                            Prev Hash
                          </div>
                          <div className="text-sm font-medium truncate font-mono" title={log.previousHash}>
                            {log.previousHash ? log.previousHash.slice(0, 24) + '...' : 'GENESIS'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {log.changes && (
                    <div className="mt-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-z-muted mb-2">
                        Changes
                      </div>
                      <pre
                        className={cn(
                          'p-4 rounded-md text-xs font-mono max-h-48 overflow-auto border shadow-sm',
                          theme === 'dark'
                            ? 'bg-[#111111] border-z-border text-z-secondary'
                            : 'bg-z-panel border-z-border text-z-primary'
                        )}
                      >
                        {JSON.stringify(log.changes, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })()}

          {/* Footer */}
          <div
            className={cn(
              'px-8 py-5 border-t flex items-center justify-between transition-colors rounded-b-xl',
              theme === 'dark' ? 'bg-[#1c1c1c] border-z-border' : 'bg-[var(--z-bg-input)] border-z-border'
            )}
          >
            <div className="flex items-center gap-4">
              <Cpu size={14} className="text-z-muted" />
              <span className="text-xs font-semibold uppercase tracking-wider text-z-muted">
                SECURE AUDIT TRAIL
              </span>
              {stats?.byAction && Object.keys(stats.byAction).length > 0 && (
                <div className="flex items-center gap-3 ml-4">
                  {Object.entries(stats.byAction).map(([action, count]) => (
                    <span
                      key={action}
                      className="text-xs font-semibold uppercase tracking-wider text-z-muted"
                    >
                      {action}:{count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-z-muted tracking-wider uppercase mr-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className={cn(
                  'w-8 h-8 border rounded-md flex items-center justify-center transition-all disabled:opacity-20',
                  theme === 'dark'
                    ? 'bg-[#2c2c2c] border-z-border text-z-secondary hover:bg-[#3c3c3c]'
                    : 'bg-z-panel border-[var(--z-border-strong)] shadow-sm text-z-secondary hover:bg-[var(--z-bg-input)]'
                )}
              >
                <ChevronLeft size={16} />
              </button>

              <div
                className={cn(
                  'px-3 py-1 rounded-md text-sm font-medium border shadow-sm',
                  theme === 'dark'
                    ? 'bg-z-panel text-z-primary border-z-border'
                    : 'bg-z-accent border-z-border text-z-primary'
                )}
              >
                {page}
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className={cn(
                  'w-8 h-8 border rounded-md flex items-center justify-center transition-all disabled:opacity-20',
                  theme === 'dark'
                    ? 'bg-[#2c2c2c] border-z-border text-z-secondary hover:bg-[#3c3c3c]'
                    : 'bg-z-panel border-[var(--z-border-strong)] shadow-sm text-z-secondary hover:bg-[var(--z-bg-input)]'
                )}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "w-full max-w-md rounded-xl p-8 shadow-2xl border",
              theme === 'dark' ? "bg-z-panel border-z-border" : "bg-z-panel border-z-border"
            )}
          >
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertTriangle size={24} />
              <h2 className="text-xl font-bold text-z-primary tracking-tight">Purge Audit Logs</h2>
            </div>
            <p className={cn("text-sm mb-6 leading-relaxed", theme === 'dark' ? "text-z-muted" : "text-z-muted")}>
              This action is <span className="font-bold text-red-500">irreversible</span>. It will permanently delete audit logs matching your criteria.
            </p>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-2", theme === 'dark' ? "text-z-secondary" : "text-z-secondary")}>
                  Logs older than (days):
                </label>
                <input
                  type="number"
                  min="0"
                  value={purgeDays}
                  onChange={(e) => setPurgeDays(parseInt(e.target.value) || 0)}
                  className={cn(
                    "w-full border rounded-md px-4 py-2.5 text-sm outline-none transition-all",
                    theme === 'dark' 
                      ? "bg-[#1c1c1c] border-z-border text-z-primary focus:border-red-500/50" 
                      : "bg-[var(--z-bg-input)] border-[var(--z-border-strong)] text-z-primary focus:border-red-500/50"
                  )}
                />
                <p className="text-[10px] text-z-muted mt-1.5 font-medium uppercase tracking-wide">Set to 0 to delete all logs.</p>
              </div>
              
              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-2", theme === 'dark' ? "text-z-secondary" : "text-z-secondary")}>
                  Authorization Code: <span className="text-red-400 font-mono select-all font-bold tracking-widest">{purgeExpectedCode}</span>
                </label>
                <input
                  type="text"
                  value={purgeInputCode}
                  onChange={(e) => setPurgeInputCode(e.target.value)}
                  placeholder="Enter the 6-digit code above"
                  className={cn(
                    "w-full border rounded-md px-4 py-2.5 text-sm outline-none transition-all font-mono tracking-widest",
                    theme === 'dark' 
                      ? "bg-[#1c1c1c] border-z-border text-z-primary focus:border-red-500/50" 
                      : "bg-[var(--z-bg-input)] border-[var(--z-border-strong)] text-z-primary focus:border-red-500/50"
                  )}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPurgeModal(false)}
                className={cn(
                  "px-5 py-2.5 text-sm font-semibold border rounded-md transition-all",
                  theme === 'dark' 
                    ? "border-z-border bg-z-panel text-z-muted hover:text-z-primary hover:brightness-110" 
                    : "border-z-border bg-z-panel text-z-secondary hover:bg-[var(--z-bg-input)]"
                )}
              >
                Cancel
              </button>
              <button
                onClick={executePurge}
                disabled={purgeInputCode !== purgeExpectedCode}
                className="px-5 py-2.5 text-sm font-semibold bg-red-500/10 text-red-500 border border-red-500/20 rounded-md hover:bg-red-500 hover:text-z-primary transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                Confirm Purge
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  )
}

export default AuditLogPage
