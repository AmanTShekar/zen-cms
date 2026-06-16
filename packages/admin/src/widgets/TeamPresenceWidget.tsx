import { useEffect, useState } from 'react'
import api from '../lib/api'
import { cn } from '../lib/utils'
import type { WidgetProps } from './registry'

const COLORS = [
 'bg-gray-500',
 'bg-gray-500',
 'bg-amber-500',
 'bg-rose-500',
 'bg-emerald-500',
 'bg-violet-500',
]

export default function TeamPresenceWidget({ theme, title }: WidgetProps) {
 const [members, setMembers] = useState<any[]>([])

 useEffect(() => {
 api
 .get('/presence')
 .then((r) => setMembers(r.data?.data || []))
 .catch(() => setMembers([]))
 const t = setInterval(() => {
 api
 .get('/presence')
 .then((r) => setMembers(r.data?.data || []))
 .catch(() => {})
 }, 15000)
 return () => clearInterval(t)
 }, [])

 const initials = (email: string) => email?.split('@')[0]?.slice(0, 2).toUpperCase() || '??'

 return (
 <div className="h-full flex flex-col gap-3">
 <div className="flex items-center justify-between">
 <p className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ">
 {title || 'Online Now'}
 </p>
 <span className="text-[8px] font-black text-gray-500">{members.length} active</span>
 </div>
 {members.length === 0 ? (
 <p className="text-[9px] text-gray-500 text-center flex-1 flex items-center justify-center">
 No one else online.
 </p>
 ) : (
 <div className="flex items-center gap-1 flex-wrap">
 {members.slice(0, 8).map((m: any, i: number) => (
 <div
 key={m.userId || i}
 title={m.email || m.userId}
 className={cn(
 'w-9 h-9 rounded-none-none flex items-center justify-center text-white text-[10px] font-black border-2 border-current shrink-0',
 COLORS[i % COLORS.length]
 )}
 >
 {initials(m.email || m.userId || '?')}
 </div>
 ))}
 {members.length > 8 && (
 <div
 className={cn(
 'w-9 h-9 rounded-none-none flex items-center justify-center text-[10px] font-black',
 theme === 'dark' ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'
 )}
 >
 +{members.length - 8}
 </div>
 )}
 </div>
 )}
 </div>
 )
}
