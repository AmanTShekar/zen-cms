import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, CheckCircle2, XCircle, Clock, RefreshCw, Loader2,
  ChevronDown, ChevronUp, RotateCcw, Filter, Search, Download,
  AlertTriangle, Zap, Globe, ArrowRight
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface WebhookDelivery {
  id: string
  webhookId?: string
  event: string
  url: string
  success: boolean
  responseStatus?: number
  responseBody?: string
  requestBody?: string
  requestHeaders?: Record<string, string>
  timestamp: string
  durationMs?: number
  retryCount?: number
}

interface SettingsWebhookLogsProps {
  theme?: 'light' | 'dark'
}

const STATUS_COLORS: Record<string, string> = {
  '2': 'text-z-active-text bg-z-active-bg border-z-accent/20',
  '3': 'text-z-active-text bg-z-accent/10 border-z-accent/20',
  '4': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  '5': 'text-red-400 bg-red-500/10 border-red-500/20',
}

function getStatusClass(status?: number): string {
  if (!status) return 'text-z-muted bg-z-hover border-white/10'
  const key = String(Math.floor(status / 100))
  return STATUS_COLORS[key] || 'text-z-muted bg-z-hover border-white/10'
}

export default function SettingsWebhookLogs({ theme = 'dark' }: SettingsWebhookLogsProps) {
  const dark = theme === 'dark'

  const [logs, setLogs] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [reloading, setReloading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replayingId, setReplayingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 20

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setReloading(true)
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE }
      if (filter !== 'all') params.status = filter
      if (search.trim()) params.search = search.trim()

      const res = await api.get('/system/webhooks/deliveries', { params })
      const data = res.data?.data
      if (Array.isArray(data)) {
        setLogs(data)
        setTotalCount(res.data?.meta?.total || data.length)
      } else if (data?.items) {
        setLogs(data.items)
        setTotalCount(data.total || data.items.length)
      } else {
        // Fallback: build mock data from audit logs
        const auditRes = await api.get('/system/audit-logs', { params: { limit: PAGE_SIZE, page } }).catch(() => null)
        if (auditRes?.data?.data) {
          const auditLogs: WebhookDelivery[] = (auditRes.data.data || []).map((l: any) => ({
            id: l._id || l.id,
            event: l.action || l.event || 'unknown',
            url: l.endpoint || '—',
            success: l.status !== 'error',
            responseStatus: l.statusCode || (l.status === 'error' ? 500 : 200),
            timestamp: l.createdAt || l.timestamp,
            durationMs: l.durationMs,
          }))
          setLogs(auditLogs)
          setTotalCount(auditRes.data?.meta?.total || auditLogs.length)
        }
      }
    } catch {
      // Silent fail — empty state will display
    } finally {
      setLoading(false)
      setReloading(false)
    }
  }, [page, filter, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleReplay = async (log: WebhookDelivery) => {
    if (!log.webhookId) return toast.error('No webhook ID for replay')
    setReplayingId(log.id)
    try {
      await api.post(`/system/webhooks/${log.webhookId}/replay`, { deliveryId: log.id })
      toast.success('Webhook replayed')
      fetchLogs(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Replay failed')
    } finally {
      setReplayingId(null)
    }
  }

  const handleExport = () => {
    const csv = [
      'timestamp,event,url,status,duration_ms',
      ...logs.map(l =>
        `"${l.timestamp}","${l.event}","${l.url}",${l.success ? 'success' : 'failed'},${l.durationMs || ''}`
      )
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `webhook-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    toast.success('Exported')
  }

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.event.includes(search) || l.url.includes(search)
    const matchFilter =
      filter === 'all' || (filter === 'success' && l.success) || (filter === 'failed' && !l.success)
    return matchSearch && matchFilter
  })

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const card = cn(
    'border rounded-none transition-all',
    dark
      ? 'bg-z-panel backdrop-blur-md border-z-border shadow-sm'
      : 'bg-z-panel border-z-border shadow-sm'
  )

  const inp = cn(
    'border rounded-none py-2 px-3 text-sm font-mono outline-none transition-all focus:ring-1 focus:ring-z-active-border focus:border-z-accent',
    dark ? 'bg-black/80 border-z-border text-white placeholder:text-gray-700' : 'bg-z-panel border-z-border text-z-primary'
  )

  // Summary stats
  const successCount = logs.filter(l => l.success).length
  const failedCount = logs.filter(l => !l.success).length
  const avgDuration = logs.reduce((s, l) => s + (l.durationMs || 0), 0) / (logs.length || 1)

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: totalCount, icon: Activity, color: 'text-z-active-text' },
          { label: 'Successful', value: successCount, icon: CheckCircle2, color: 'text-z-active-text' },
          { label: 'Failed', value: failedCount, icon: XCircle, color: 'text-red-400' },
          { label: 'Avg Latency', value: `${Math.round(avgDuration)}ms`, icon: Clock, color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cn(card, 'p-4 flex items-center gap-3')}>
            <div className={cn('w-9 h-9 flex items-center justify-center border', dark ? 'bg-z-hover border-white/10' : 'bg-z-input border-z-border')}>
              <Icon size={16} className={color} />
            </div>
            <div>
              <div className={cn('text-lg font-semibold', dark ? 'text-white' : 'text-z-primary')}>{value}</div>
              <div className="text-sm font-semibold text-z-secondary">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className={cn(card, 'p-4 flex flex-wrap items-center gap-3')}>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-z-secondary" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by event or URL..."
            className={cn(inp, 'pl-8 w-full')}
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'success', 'failed'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
              className={cn(
                'px-3 py-1.5 text-sm font-semibold   border transition-all',
                filter === f
                  ? dark ? 'bg-z-accent/20 border-z-active-border text-z-active-text' : 'bg-z-active-bg border-z-active-border text-z-accent'
                  : dark ? 'bg-z-hover border-white/10 text-z-secondary hover:text-gray-300' : 'bg-z-input border-z-border text-z-secondary'
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => fetchLogs(true)}
            disabled={reloading}
            className={cn('p-2 border transition-all', dark ? 'border-white/10 text-z-muted hover:text-white hover:border-white/20' : 'border-z-border text-z-secondary hover:text-gray-800')}
          >
            <RefreshCw size={13} className={reloading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-semibold   border transition-all', dark ? 'border-white/10 text-z-muted hover:text-white hover:border-white/20' : 'border-z-border text-z-secondary hover:text-gray-800')}
          >
            <Download size={11} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className={cn(card, 'overflow-hidden')}>
        {/* Header */}
        <div className={cn('grid grid-cols-12 px-4 py-2 text-sm font-semibold   text-z-secondary border-b', dark ? 'border-z-border' : 'border-z-border')}>
          <div className="col-span-1">Status</div>
          <div className="col-span-3">Event</div>
          <div className="col-span-4">Endpoint URL</div>
          <div className="col-span-2">Time</div>
          <div className="col-span-1">Latency</div>
          <div className="col-span-1">Actions</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-z-active-text animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className={cn('w-16 h-16 flex items-center justify-center border', dark ? 'bg-z-hover border-white/10 text-gray-600' : 'bg-z-input border-z-border text-z-muted')}>
              <Activity size={28} />
            </div>
            <div className="text-center">
              <p className={cn('text-sm font-semibold  ', dark ? 'text-z-muted' : 'text-gray-600')}>No Event Logs</p>
              <p className="text-sm text-gray-600 mt-1">Webhook deliveries will appear here</p>
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
            {filtered.map(log => {
              const isExpanded = expandedId === log.id
              return (
                <div key={log.id}>
                  <div
                    className={cn(
                      'grid grid-cols-12 px-4 py-3 items-center cursor-pointer group transition-colors',
                      dark ? 'hover:bg-z-panel' : 'hover:bg-gray-50'
                    )}
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    {/* Status */}
                    <div className="col-span-1 flex items-center">
                      {log.success
                        ? <CheckCircle2 size={14} className="text-z-active-text" />
                        : <XCircle size={14} className="text-red-400" />
                      }
                    </div>
                    {/* Event */}
                    <div className="col-span-3">
                      <span className={cn('text-sm font-semibold  ', dark ? 'text-gray-200' : 'text-gray-800')}>
                        {log.event}
                      </span>
                      {log.responseStatus && (
                        <span className={cn('ml-2 text-sm font-semibold px-1.5 py-0.5 border', getStatusClass(log.responseStatus))}>
                          {log.responseStatus}
                        </span>
                      )}
                    </div>
                    {/* URL */}
                    <div className="col-span-4">
                      <span className={cn('text-sm font-mono truncate block', dark ? 'text-z-secondary' : 'text-z-secondary')}>
                        {log.url || '—'}
                      </span>
                    </div>
                    {/* Time */}
                    <div className="col-span-2">
                      <span className="text-sm text-z-secondary">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      </span>
                    </div>
                    {/* Latency */}
                    <div className="col-span-1">
                      <span className={cn('text-sm font-mono', log.durationMs && log.durationMs > 1000 ? 'text-amber-400' : 'text-z-secondary')}>
                        {log.durationMs ? `${log.durationMs}ms` : '—'}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!log.success && log.webhookId && (
                        <button
                          onClick={e => { e.stopPropagation(); handleReplay(log) }}
                          disabled={replayingId === log.id}
                          className="p-1.5 text-z-secondary hover:text-z-active-text transition-colors"
                          title="Replay"
                        >
                          {replayingId === log.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={12} className="text-z-secondary" /> : <ChevronDown size={12} className="text-z-secondary" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className={cn('px-4 pb-4 pt-2 space-y-3 border-t', dark ? 'border-white/[0.05] bg-white/[0.01]' : 'border-z-border bg-gray-50')}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {log.requestBody && (
                          <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-z-secondary">Request Payload</p>
                            <pre className={cn('text-sm font-mono p-3 border overflow-auto max-h-32 rounded-none', dark ? 'bg-black/60 border-z-border text-gray-300' : 'bg-z-panel border-z-border text-gray-700')}>
                              {(() => { try { return JSON.stringify(JSON.parse(log.requestBody), null, 2) } catch { return log.requestBody } })()}
                            </pre>
                          </div>
                        )}
                        {log.responseBody && (
                          <div className="space-y-1.5">
                            <p className="text-sm font-semibold text-z-secondary">Response Body</p>
                            <pre className={cn('text-sm font-mono p-3 border overflow-auto max-h-32 rounded-none', dark ? 'bg-black/60 border-z-border text-gray-300' : 'bg-z-panel border-z-border text-gray-700')}>
                              {(() => { try { return JSON.stringify(JSON.parse(log.responseBody), null, 2) } catch { return log.responseBody } })()}
                            </pre>
                          </div>
                        )}
                        {!log.requestBody && !log.responseBody && (
                          <p className="text-sm text-gray-600 italic">No payload data available for this entry</p>
                        )}
                      </div>
                      {log.retryCount !== undefined && log.retryCount > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={11} className="text-amber-400" />
                          <span className="text-sm text-amber-400 font-semibold">
                            {log.retryCount} Retry {log.retryCount === 1 ? 'Attempt' : 'Attempts'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-z-secondary">
            Page {page} of {totalPages} · {totalCount} events
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={cn('px-3 py-1.5 text-sm font-semibold  border transition-all disabled:opacity-30', dark ? 'border-white/10 text-z-muted hover:text-white' : 'border-z-border text-z-secondary')}
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={cn('px-3 py-1.5 text-sm font-semibold  border transition-all disabled:opacity-30', dark ? 'border-white/10 text-z-muted hover:text-white' : 'border-z-border text-z-secondary')}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
