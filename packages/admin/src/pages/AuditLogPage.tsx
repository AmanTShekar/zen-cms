import React, { useEffect, useState, useCallback } from 'react'
import {
 History,
 Search,
 Download,
 RefreshCw,
 Fingerprint,
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
 const [filterAction, setFilterAction] = useState('')
 const [showDetails, setShowDetails] = useState<string | null>(null)

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

 const handlePurge = () => {
 const code = Math.floor(100000 + Math.random() * 900000)
 const userInput = window.prompt(`[SECURITY] Enter code ${code} to authorize audit log purge:`)
 if (userInput !== code.toString()) {
 toast.error('Purge cancelled — authorization code did not match')
 return
 }

 const daysStr = window.prompt('Purge logs older than how many days? (default: 30):')
 const days = parseInt(daysStr || '30')
 if (isNaN(days) || days < 1) {
 toast.error('Invalid number of days')
 return
 }

 setPurging(true)
 const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
 toast.promise(
 api.post('/system/audit-logs/purge', { before }),
 {
 loading: `Purging audit logs older than ${days} days...`,
 success: (res: any) => {
 fetchLogs()
 fetchStats()
 return `Purged ${res.data?.data?.deleted || 0} audit log entries`
 },
 error: 'Purge failed',
 }
 ).finally(() => setPurging(false))
 }

 const formatAction = (action: string): string => action?.toUpperCase() || 'UNKNOWN'

 const getActionColor = (action: string) => {
 const upper = action?.toUpperCase()
 if (upper === 'CREATE') return 'bg-gray-500/5 text-gray-600 dark:text-gray-500 border-gray-500/10'
 if (upper === 'UPDATE') return 'bg-gray-500/5 text-gray-600 dark:text-gray-500 border-gray-500/10'
 if (upper === 'DELETE') return 'bg-red-500/5 text-red-500 border-red-500/10'
 return 'bg-amber-500/5 text-amber-500 border-amber-500/10'
 }

 const displayName = (log: AuditLogEntry) =>
 log.userName || log.userEmail || 'System'

 return (
 <div
 className={cn(
 'flex flex-col min-h-screen p-6 space-y-6 transition-colors duration-500',
 theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900'
 )}
 >
 {/* Header */}
 <header className="flex items-center justify-between">
 <div className="flex items-center gap-5">
 <div
 className={cn(
 'w-12 h-12 rounded-none flex items-center justify-center shadow-lg transition-all',
 theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
 )}
 >
 <History size={24} />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-3 mb-1">
 <span className="text-[8px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-[0.3em] ">
 System History
 </span>
 <div className="w-1.5 h-1.5 rounded-none bg-gray-500 shadow-[0_0_8px_#10b981]" />
 </div>
 <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
 Audit Logs
 </h1>
 </div>
 </div>

 <div className="flex items-center gap-4">
 <div
 className={cn(
 'px-6 py-3 border rounded-none flex items-center gap-8 shadow-sm backdrop-blur-xl',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
 )}
 >
 <div className="flex flex-col items-end">
 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-60">
 Total Logs
 </span>
 <span className="text-xl font-black tracking-tighter leading-none text-gray-600 dark:text-gray-500">
 {total.toLocaleString()}
 </span>
 </div>
 {stats && (
 <>
 <div className={cn('w-px h-8', theme === 'dark' ? 'bg-white/5' : 'bg-gray-100')} />
 <div className="flex flex-col items-end">
 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-60">
 Failed
 </span>
 <span className="text-xl font-black tracking-tighter leading-none text-red-500">
 {stats.failed}
 </span>
 </div>
 <div className={cn('w-px h-8', theme === 'dark' ? 'bg-white/5' : 'bg-gray-100')} />
 <div className="flex flex-col items-end">
 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest opacity-60">
 Status
 </span>
 <span className="text-xs font-black text-gray-600 dark:text-gray-500 tracking-tighter uppercase leading-none">
 Stable
 </span>
 </div>
 </>
 )}
 </div>

 <button
 onClick={() => { setPage(1); fetchLogs() }}
 className={cn(
 'w-12 h-12 border rounded-none flex items-center justify-center transition-all hover:scale-105 active:scale-95',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400'
 : 'bg-white border-gray-200 shadow-sm text-gray-400'
 )}
 >
 <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
 </button>
 </div>
 </header>

 {/* Table Card */}
 <div
 className={cn(
 'border rounded-none shadow-sm flex flex-col relative transition-colors backdrop-blur-3xl overflow-hidden',
 theme === 'dark' ? 'bg-black/80 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
 )}
 >
 {/* Control Bar */}
 <div
 className={cn(
 'px-8 py-5 border-b flex items-center justify-between gap-6 transition-colors',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50/30 border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center gap-4 flex-1">
 <div
 className={cn(
 'flex items-center gap-4 border px-6 py-3 rounded-none w-full max-w-md shadow-inner transition-all group relative overflow-hidden',
 theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'
 )}
 >
 <Search
 size={16}
 className="text-gray-500 group-focus-within:text-gray-600 dark:text-gray-500 transition-colors"
 />
 <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
 placeholder="Search by email, name, collection..."
 className="bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black text-xs font-black text-gray-400 w-full placeholder:text-gray-700 uppercase tracking-tight"
 />
 </div>

 <select
 value={filterAction}
 onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}
 className={cn(
 'px-4 py-3 border rounded-none text-[9px] font-black uppercase tracking-widest ',
 theme === 'dark' ? 'bg-black border-white/[0.08] text-gray-400' : 'bg-white border-gray-200 shadow-sm text-gray-400'
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
 onClick={handlePurge}
 disabled={purging}
 className={cn(
 'flex items-center gap-3 px-6 py-3 border rounded-none text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400'
 : 'bg-white border-gray-200 shadow-sm text-gray-400'
 )}
 >
 <Trash2 size={14} />
 Purge
 </button>
 <button
 onClick={handleExport}
 disabled={exporting}
 className={cn(
 'flex items-center gap-3 px-8 py-3 rounded-none font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-lg leading-none active:scale-95',
 theme === 'dark'
 ? 'bg-white text-black hover:bg-gray-200'
 : 'bg-gray-900 text-white hover:bg-black shadow-gray-900/20'
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
 <div className="overflow-x-auto min-w-full pb-4"><table className="w-full border-collapse">
 <thead>
 <tr
 className={cn(
 'border-b text-left',
 theme === 'dark'
 ? 'border-white/[0.08] bg-white/[0.01]'
 : 'border-gray-50 bg-gray-50/10'
 )}
 >
 <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ">
 Operator
 </th>
 <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ">
 Action
 </th>
 <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ">
 Collection
 </th>
 <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ">
 Status
 </th>
 <th className="px-8 py-4 text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] text-right">
 Timestamp
 </th>
 </tr>
 </thead>
 <tbody
 className={cn('divide-y', theme === 'dark' ? 'divide-white/5' : 'divide-gray-50')}
 >
 {loading ? (
 <tr>
 <td colSpan={5} className="py-20 text-center">
 <Loader2
 size={24}
 className="animate-spin text-gray-600 dark:text-gray-500 mx-auto opacity-40"
 />
 </td>
 </tr>
 ) : logs.length === 0 ? (
 <tr>
 <td colSpan={5} className="py-20 text-center">
 <div className="text-gray-500 text-sm font-bold uppercase tracking-widest ">
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
 onClick={() => setShowDetails(showDetails === (log._id || log.id) ? null : (log._id || log.id))}
 className="hover:bg-gray-500/[0.02] transition-colors cursor-pointer group"
 >
 <td className="px-8 py-4">
 <div className="flex items-center gap-3">
 <div
 className={cn(
 'w-8 h-8 rounded-none border flex items-center justify-center text-gray-500',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08]'
 : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 <Fingerprint size={16} />
 </div>
 <div className="flex flex-col">
 <span className="text-[11px] font-black uppercase leading-none">
 {displayName(log)}
 </span>
 <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest mt-1">
 {log.userId ? `ID: ${log.userId.slice(-8).toUpperCase()}` : 'SYSTEM'}
 </span>
 </div>
 </div>
 </td>
 <td className="px-8 py-4">
 <div
 className={cn(
 'px-3 py-1 rounded-none text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-2 border',
 getActionColor(log.action)
 )}
 >
 <Zap size={10} fill="currentColor" />
 {formatAction(log.action)}
 </div>
 </td>
 <td className="px-8 py-4">
 <div className="flex flex-col">
 <span className="text-[11px] font-black uppercase leading-none">
 {log.collectionName || 'SYSTEM'}
 </span>
 {log.documentId && (
 <div className="flex items-center gap-2 mt-1 opacity-40">
 <ArrowRight size={8} />
 <span className="text-[7px] font-bold uppercase tracking-widest">
 DOC_{log.documentId.slice(-12).toUpperCase()}
 </span>
 </div>
 )}
 </div>
 </td>
 <td className="px-8 py-4">
 <span
 className={cn(
 'text-[8px] font-black uppercase tracking-widest ',
 log.status === 'failed' ? 'text-red-500' : 'text-gray-600 dark:text-gray-500'
 )}
 >
 {log.status || 'success'}
 </span>
 </td>
 <td className="px-8 py-4 text-right">
 <div className="flex flex-col items-end gap-1">
 <span className="text-[10px] font-black tracking-tighter leading-none">
 {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : '-'}
 </span>
 <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest leading-none">
 {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '-'}
 </span>
 </div>
 </td>
 </motion.tr>
 ))
 )}
 </tbody>
 </table></div>
 </div>

 {/* Detail Expand */}
 {showDetails && (() => {
 const log = logs.find((l) => (l._id || l.id) === showDetails)
 if (!log) return null
 return (
 <div
 className={cn(
 'px-8 py-6 border-t transition-colors',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50/30 border-gray-200 shadow-sm'
 )}
 >
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-[10px] font-mono">
 <div>
 <div className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-1">IP Address</div>
 <div className="font-bold">{log.ip || 'N/A'}</div>
 </div>
 <div>
 <div className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-1">User Agent</div>
 <div className="font-bold truncate" title={log.userAgent}>{log.userAgent || 'N/A'}</div>
 </div>
 <div>
 <div className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-1">Resource</div>
 <div className="font-bold truncate" title={log.resource}>{log.resource || 'N/A'}</div>
 </div>
 {log.siteId && (
 <div>
 <div className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-1">Site ID</div>
 <div className="font-bold">{log.siteId}</div>
 </div>
 )}
 {log.hash && (
 <>
 <div>
 <div className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-1">Audit Hash</div>
 <div className="font-bold truncate" title={log.hash}>{log.hash.slice(0, 24)}...</div>
 </div>
 <div>
 <div className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-1">Prev Hash</div>
 <div className="font-bold truncate" title={log.previousHash}>{log.previousHash ? log.previousHash.slice(0, 24) + '...' : 'GENESIS'}</div>
 </div>
 </>
 )}
 </div>
 {log.changes && (
 <div className="mt-4">
 <div className="text-[7px] font-black uppercase tracking-widest text-gray-500 mb-2">Changes</div>
 <pre className={cn(
 'p-4 rounded-none text-[10px] font-mono max-h-48 overflow-auto border',
 theme === 'dark' ? 'bg-black/50 border-white/[0.08] text-gray-400' : 'bg-gray-50 border-gray-200 shadow-sm text-gray-600'
 )}>
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
 'px-8 py-6 border-t flex items-center justify-between transition-colors',
 theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-gray-50/20 border-gray-200 shadow-sm'
 )}
 >
 <div className="flex items-center gap-4">
 <Cpu size={14} className="text-gray-500" />
 <span className="text-[7px] font-black uppercase tracking-[0.4em] text-gray-500">
 SECURE AUDIT TRAIL
 </span>
 {stats?.byAction && Object.keys(stats.byAction).length > 0 && (
 <div className="flex items-center gap-2 ml-4">
 {Object.entries(stats.byAction).map(([action, count]) => (
 <span key={action} className="text-[7px] font-black uppercase tracking-widest text-gray-500">
 {action.toUpperCase()}:{count}
 </span>
 ))}
 </div>
 )}
 </div>

 <div className="flex items-center gap-3">
 <span className="text-[7px] font-black uppercase tracking-widest text-gray-500 ">
 Page {page} of {totalPages}
 </span>
 <button
 disabled={page === 1}
 onClick={() => setPage(page - 1)}
 className={cn(
 'w-10 h-10 border rounded-none flex items-center justify-center transition-all disabled:opacity-20',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400'
 : 'bg-white border-gray-200 shadow-sm text-gray-400'
 )}
 >
 <ChevronLeft size={18} />
 </button>

 <div
 className={cn(
 'px-4 py-2 rounded-none text-[11px] font-black border shadow-sm',
 theme === 'dark'
 ? 'bg-white border-white text-black'
 : 'bg-gray-900 border-gray-800 text-white'
 )}
 >
 {page}
 </div>

 <button
 disabled={page >= totalPages}
 onClick={() => setPage(page + 1)}
 className={cn(
 'w-10 h-10 border rounded-none flex items-center justify-center transition-all disabled:opacity-20',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400'
 : 'bg-white border-gray-200 shadow-sm text-gray-400'
 )}
 >
 <ChevronRight size={18} />
 </button>
 </div>
 </div>
 </div>
 </div>
 )
}

export default AuditLogPage
