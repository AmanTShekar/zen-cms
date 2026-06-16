import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function RecentContentWidget({ config = {}, theme, title }: WidgetProps) {
 const navigate = useNavigate()
 const [logs, setLogs] = useState<any[]>([])
 const [loading, setLoading] = useState(true)

 useEffect(() => {
 api
 .get('/system/audit-logs?limit=8&action=create,update')
 .then((r) => setLogs(r.data?.data || []))
 .catch(() => setLogs([]))
 .finally(() => setLoading(false))
 }, [])

 return (
 <div className="h-full flex flex-col gap-3">
 <p className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ">
 {title || config.title || 'Recently Edited'}
 </p>
 {loading && <p className="text-[9px] text-gray-500 ">Loading...</p>}
 <div className="space-y-2 overflow-y-auto flex-1">
 {logs.length === 0 && !loading && (
 <p className="text-[9px] text-gray-500 text-center py-6">
 No recent content edits.
 </p>
 )}
 {logs.map((log: any, i: number) => (
 <button
 key={log._id || i}
 onClick={() =>
 log.documentId &&
 log.collection &&
 navigate(`/collections/${log.collection}/${log.documentId}`)
 }
 className={cn(
 'w-full flex items-center justify-between p-3 border rounded-none group transition-all text-left',
 theme === 'dark'
 ? 'bg-white/[0.01] border-white/[0.08] hover:border-gray-500/20'
 : 'bg-gray-50 border-gray-200 shadow-sm hover:border-gray-100'
 )}
 >
 <div>
 <p className="text-[10px] font-black uppercase leading-none">
 {(log.collection || 'Document').replace(/-/g, ' ')}
 </p>
 <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">
 {log.action} · {new Date(log.timestamp).toLocaleString()}
 </p>
 </div>
 <ArrowRight
 size={12}
 className="text-gray-500 group-hover:text-gray-600 dark:text-gray-500 transition-colors shrink-0"
 />
 </button>
 ))}
 </div>
 </div>
 )
}
