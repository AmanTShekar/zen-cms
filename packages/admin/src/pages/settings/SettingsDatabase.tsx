import React, { useState } from 'react'
import { HardDrive, Layers, Activity, Trash2, RefreshCw, Scan, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface DBStats {
 size?: number
 collections?: number | string
 [key: string]: unknown
}

interface SettingsDatabaseProps {
 dbStats: DBStats | null
 theme: 'light' | 'dark'
}

const SettingsDatabase: React.FC<SettingsDatabaseProps> = ({ dbStats, theme }) => {
 const [sweeping, setSweeping] = useState(false)
 const [testing, setTesting] = useState(false)
 const [dbUri, setDbUri] = useState('')
 const [dbDialect, setDbDialect] = useState<'postgres' | 'mongodb'>('mongodb')

 const handleMediaSweep = async () => {
 setSweeping(true)
 try {
 const res = await api.post<any>('/system/media/sweep', { pruneUnreferencedMedia: true })
 const result = res.data.data
 toast.success(
 `Swept ${result.removed || 0} orphans · ${result.retained || 0} retained`
 )
 } catch (err: any) {
 toast.error(err?.response?.data?.error || 'Sweep failed')
 } finally {
 setSweeping(false)
 }
 }

 const handleTestConnection = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!dbUri.trim()) return
 setTesting(true)
 try {
 await api.post('/system/db/test-connection', { uri: dbUri, dialect: dbDialect })
 toast.success('Connection verified')
 } catch (err: any) {
 toast.error(err?.response?.data?.error || 'Connection failed')
 } finally {
 setTesting(false)
 }
 }

 const sizeMB = dbStats?.size ? (dbStats.size / 1024 / 1024).toFixed(2) : '0.00'
 const collections = dbStats?.collections || '0'

 const stats = [
 {
 label: 'Cluster Scale',
 value: `${sizeMB} MB`,
 icon: HardDrive,
 color: 'text-emerald-600 dark:text-emerald-500',
 },
 {
 label: 'Registry Map',
 value: String(collections),
 icon: Layers,
 color: 'text-emerald-600 dark:text-emerald-500',
 },
 {
 label: 'Pulse Health',
 value: 'OPTIMAL',
 icon: Activity,
 color: 'text-emerald-600 dark:text-emerald-500',
 },
 ]

 return (
 <div className="col-span-full space-y-8">
 {/* Stat cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {stats.map((stat, i) => (
 <div
 key={i}
 className={cn(
 'p-8 border rounded-none flex flex-col gap-6 relative overflow-hidden group transition-all',
 theme === 'dark'
 ? 'bg-white/[0.01] border-white/[0.08] hover:border-emerald-500/20'
 : 'bg-gray-50 border-gray-200 shadow-sm shadow-sm'
 )}
 >
 <div className="flex items-center justify-between">
 <div
 className={cn(
 'w-12 h-12 rounded-none flex items-center justify-center border',
 theme === 'dark' ? 'bg-white/5 border-white/[0.08]' : 'bg-white'
 )}
 >
 <stat.icon size={22} className="text-gray-400 group-hover:text-emerald-600 dark:text-emerald-500 transition-colors" />
 </div>
 <span className={cn('text-[10px] font-black uppercase tracking-widest ', stat.color)}>
 Synchronized
 </span>
 </div>
 <div className="flex flex-col leading-none">
 <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest ">
 {stat.label}
 </span>
 <span className="text-xl font-black tracking-tighter mt-2">
 {stat.value}
 </span>
 </div>
 </div>
 ))}
 </div>

 {/* DB connection test */}
 <div
 className={cn(
 'p-6 border rounded-none',
 theme === 'dark'
 ? 'bg-white/[0.01] border-white/[0.08]'
 : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">
 Test New Connection
 </p>
 <form onSubmit={handleTestConnection} className="flex gap-3 items-end">
 <div className="flex-1 space-y-1">
 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600">
 Connection URI
 </label>
 <input
 type="text"
 value={dbUri}
 onChange={(e) => setDbUri(e.target.value)}
 placeholder="postgres://... or mongodb://..."
 className={cn(
 'w-full border rounded-none py-3 px-4 text-[11px] font-mono transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-white focus:border-emerald-500/50'
 : 'bg-white border-gray-200 focus:border-emerald-500'
 )}
 />
 </div>
 <div className="space-y-1">
 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600">
 Dialect
 </label>
 <div className="flex gap-2">
 {(['postgres', 'mongodb'] as const).map((d) => (
 <button
 key={d}
 type="button"
 onClick={() => setDbDialect(d)}
 className={cn(
 'px-4 py-3 text-[9px] font-black uppercase border rounded-none transition-all',
 dbDialect === d
 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
 : theme === 'dark'
 ? 'border-white/[0.08] text-gray-500'
 : 'border-gray-200 text-gray-400'
 )}
 >
 {d}
 </button>
 ))}
 </div>
 </div>
 <button
 type="submit"
 disabled={testing || !dbUri.trim()}
 className={cn(
 'px-6 py-3.5 rounded-none text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2',
 theme === 'dark'
 ? 'border-white/[0.08] hover:border-white/[0.08] text-gray-400 hover:text-white'
 : 'border-gray-200 hover:border-gray-300 text-gray-400'
 )}
 >
 {testing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
 Validate
 </button>
 </form>
 </div>

 {/* Maintenance actions */}
 <div className="flex flex-wrap gap-4">
 <button
 onClick={async () => {
 setSweeping(true)
 try {
 await api.post('/system/cache/flush')
 toast.success('Cache flushed')
 } catch (err: any) {
 toast.error(err?.response?.data?.error || 'Failed to flush cache')
 } finally {
 setSweeping(false)
 }
 }}
 disabled={sweeping}
 className="flex items-center gap-3 px-8 py-4 rounded-none bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-black uppercase hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-40"
 >
 {sweeping ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
 Flush Cache
 </button>

 <button
 onClick={handleMediaSweep}
 disabled={sweeping}
 className="flex items-center gap-3 px-8 py-4 rounded-none bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-40"
 >
 {sweeping ? <Loader2 size={14} className="animate-spin" /> : <Scan size={14} />}
 Sweep Orphan Media
 </button>
 </div>
 </div>
 )
}

export default SettingsDatabase
