import { useEffect, useState } from 'react'
import { Fingerprint, ArrowRight, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function AuditLogWidget({ theme, title }: WidgetProps) {
 const fetchLimit = 30
 const [logs, setLogs] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [displayLimit, setDisplayLimit] = useState(5)

 useEffect(() => {
 api
 .get(`/system/audit-logs?limit=${fetchLimit}`)
 .then((r) => setLogs(r.data?.data || []))
 .catch(() => setLogs([]))
 .finally(() => setLoading(false))
 }, [])

 if (loading)
 return (
 <div className="h-full flex items-center justify-center text-[10px] text-gray-500 font-black uppercase tracking-widest">
 Loading...
 </div>
 )

 const visibleLogs = logs.slice(0, displayLimit)

 return (
 <div className="h-full flex flex-col justify-between gap-3 select-none">
 <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
 <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1">
 <Fingerprint size={10} className="animate-pulse" /> {title || 'Recent Activity'}
 </p>
 <Link
 to="/audit-log"
 className={cn(
 'text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-0.5 hover:text-emerald-600 dark:text-emerald-400',
 theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
 )}
 >
 Full History <ArrowRight size={8} />
 </Link>
 </div>

 <div className="space-y-2 overflow-y-auto flex-1 custom-editor-scrollbar pr-1 max-h-[300px]">
 {visibleLogs.length === 0 && (
 <p className="text-[9px] text-gray-500 text-center py-4">No activity yet.</p>
 )}
 {visibleLogs.map((log: any, i: number) => (
 <div
 key={log._id || i}
 className={cn(
 'flex items-center gap-3 p-2.5 border rounded-none transition-all hover:bg-white/[0.02]',
 theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 <div
 className={cn(
 'w-6.5 h-6.5 rounded-none flex items-center justify-center shrink-0 text-[10px]',
 log.action === 'create'
 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
 : log.action === 'delete'
 ? 'bg-red-500/10 text-red-500'
 : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
 )}
 >
 <Fingerprint size={10} />
 </div>
 <div className="flex flex-col min-w-0 flex-1">
 <span
 className={cn(
 'text-[9px] font-black uppercase truncate',
 theme === 'dark' ? 'text-white' : 'text-gray-900'
 )}
 >
 {(log.collection || 'SYSTEM').replace(/-/g, ' ')}:{' '}
 <span
 className={
 log.action === 'create'
 ? 'text-emerald-600 dark:text-emerald-400'
 : log.action === 'delete'
 ? 'text-red-400'
 : 'text-emerald-600 dark:text-emerald-400'
 }
 >
 {log.action}
 </span>
 </span>
 <span className="text-[7.5px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">
 {new Date(log.timestamp).toLocaleTimeString()} · {log.user?.email || 'System'}
 </span>
 </div>
 </div>
 ))}
 </div>

 <div className="flex items-center gap-2 border-t border-white/[0.08] pt-2 shrink-0">
 {logs.length > displayLimit ? (
 <button
 onClick={() => setDisplayLimit((prev) => Math.min(prev + 5, logs.length))}
 className={cn(
 'flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all border text-center flex items-center justify-center gap-1',
 theme === 'dark'
 ? 'bg-white/[0.02] border-white/[0.08] text-emerald-600 dark:text-emerald-400 hover:bg-white/[0.05] hover:border-emerald-500/20'
 : 'bg-gray-50 border-gray-200 shadow-sm text-emerald-600 hover:bg-gray-100 hover:border-emerald-600/20'
 )}
 >
 <ChevronDown size={10} /> Show More ({logs.length - displayLimit} left)
 </button>
 ) : displayLimit > 5 ? (
 <button
 onClick={() => setDisplayLimit(5)}
 className={cn(
 'flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all border text-center flex items-center justify-center gap-1',
 theme === 'dark'
 ? 'bg-white/[0.02] border-white/[0.08] text-emerald-600 dark:text-emerald-400 hover:bg-white/[0.05] hover:border-emerald-500/20'
 : 'bg-gray-50 border-gray-200 shadow-sm text-emerald-600 hover:bg-gray-100 hover:border-emerald-600/20'
 )}
 >
 <ChevronUp size={10} /> Collapse List
 </button>
 ) : null}

 <Link
 to="/audit-log"
 className={cn(
 'px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all border text-center flex items-center justify-center gap-1 hover:scale-[1.02]',
 theme === 'dark'
 ? 'bg-emerald-600 dark:bg-emerald-600 border-emerald-500/30 text-white hover:bg-emerald-700'
 : 'bg-emerald-600 dark:bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
 )}
 >
 <Eye size={10} /> View Audits
 </Link>
 </div>
 </div>
 )
}
