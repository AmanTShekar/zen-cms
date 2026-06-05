import { useEffect, useState } from 'react'
import { Cpu, HardDrive, Network } from 'lucide-react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

export default function SystemHealthWidget({ theme, title }: WidgetProps) {
 const [health, setHealth] = useState<any>(null)

 useEffect(() => {
 const fetch = () =>
 api
 .get('/system/health')
 .then((r) => setHealth(r.data?.data))
 .catch(() => {})
 fetch()
 const t = setInterval(fetch, 10000)
 return () => clearInterval(t)
 }, [])

 const metrics = [
 { label: 'CPU', value: health?.cpu?.usage || '—', icon: Cpu },
 { label: 'Memory', value: health?.memory?.used || '—', icon: HardDrive },
 {
 label: 'DB',
 value: health?.database === 'ok' ? 'OK' : health?.database || '—',
 icon: Network,
 },
 ]

 return (
 <div className="h-full flex flex-col gap-3">
 <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest ">
 {title || 'Infrastructure Vitals'}
 </p>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 flex-1">
 {metrics.map((m) => (
 <div
 key={m.label}
 className={cn(
 'flex flex-col items-center justify-center gap-2 p-3 border rounded-none',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 <m.icon size={14} className="text-emerald-600 dark:text-emerald-400" />
 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
 {m.label}
 </span>
 <span className="text-[13px] font-black leading-none">{m.value}</span>
 </div>
 ))}
 </div>
 </div>
 )
}
