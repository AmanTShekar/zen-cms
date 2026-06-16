import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, XCircle } from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function ApiStatusWidget({ theme, title }: WidgetProps) {
 const [status, setStatus] = useState<'checking' | 'ok' | 'degraded'>('checking')
 const [latency, setLatency] = useState<number | null>(null)
 const [version, setVersion] = useState('—')

 useEffect(() => {
 const check = async () => {
 const t0 = performance.now()
 try {
 const r = await api.get('/system/health')
 setLatency(Math.round(performance.now() - t0))
 setVersion(r.data?.data?.version || '—')
 setStatus(r.data?.data?.status === 'ok' ? 'ok' : 'degraded')
 } catch {
 setStatus('degraded')
 }
 }
 check()
 const t = setInterval(check, 15000)
 return () => clearInterval(t)
 }, [])

 const isOk = status === 'ok'

 return (
 <div className="h-full flex flex-col gap-3">
 <p className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ">
 {title || 'API Health'}
 </p>
 <div
 className={cn(
 'flex-1 flex flex-col items-center justify-center gap-3 border rounded-none',
 theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 {status === 'checking' ? (
 <Activity size={24} className="text-gray-500 animate-pulse" />
 ) : isOk ? (
 <CheckCircle2 size={24} className="text-gray-600 dark:text-gray-500" />
 ) : (
 <XCircle size={24} className="text-red-500" />
 )}
 <span
 className={cn(
 'text-[11px] font-black uppercase ',
 isOk ? 'text-gray-600 dark:text-gray-500' : 'text-red-500'
 )}
 >
 {status === 'checking' ? 'Checking...' : isOk ? 'Operational' : 'Degraded'}
 </span>
 {latency !== null && (
 <span className="text-[8px] text-gray-500 uppercase tracking-widest">
 {latency}ms · v{version}
 </span>
 )}
 </div>
 </div>
 )
}
