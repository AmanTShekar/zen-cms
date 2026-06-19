import React, { useState } from 'react'
import { X, Key, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'

interface GenerateKeyModalProps {
 onClose: () => void
 onGenerated: (key: any) => void
 onOpenKeyModal: (k: any) => void
 theme: 'light' | 'dark'
}

const GenerateKeyModal: React.FC<GenerateKeyModalProps> = ({ onClose, onGenerated, onOpenKeyModal, theme }) => {
 const [name, setName] = useState('')
 const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
 const [expiresDays, setExpiresDays] = useState(30)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')

 const handleGenerate = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!name.trim()) return
 setError('')
 setLoading(true)
 try {
 const res = await api.post<any>('/system/api-keys', {
 name: name.trim(),
 role,
 expiresInDays: expiresDays,
 })
 const keyData = res.data.data
 // Show full key in a separate "done that" modal
 onOpenKeyModal({ name: keyData.name, key: keyData.key })
 onGenerated(keyData)
 onClose()
 } catch (err: any) {
 setError(err?.response?.data?.error || 'Failed to generate key')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <div
 className={cn(
 'w-full max-w-md border rounded-none-none shadow-2xl',
 theme === 'dark' ? 'bg-black border-z-border' : 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-8 py-6 border-b border-z-border">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-none-none bg-gray-500/10 border border-gray-500/20 flex items-center justify-center">
 <Key size={18} className="text-gray-600 dark:text-z-secondary" />
 </div>
 <span className="text-[12px] font-black uppercase tracking-wide">
 Generate Access Token
 </span>
 </div>
 <button onClick={onClose} className="text-z-secondary hover:text-white transition-colors">
 <X size={18} />
 </button>
 </div>

 <form onSubmit={handleGenerate} className="px-8 py-6 space-y-6">
 {/* Name */}
 <div className="space-y-2">
 <label className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary">
 Token Name
 </label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 autoFocus
 placeholder="e.g. Production Relay"
 className={cn(
 'w-full border rounded-none-none py-4 px-5 text-[13px] font-black transition-all outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-white focus:border-gray-500/50'
 : 'bg-z-input border-z-border focus:border-gray-500'
 )}
 />
 </div>

 {/* Role */}
 <div className="space-y-2">
 <label className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary">
 Permissions Tier
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
 {(['admin', 'editor', 'viewer'] as const).map((r) => (
 <button
 key={r}
 type="button"
 onClick={() => setRole(r)}
 className={cn(
 'py-3 text-[9px] font-black uppercase tracking-wider border rounded-none-none transition-all',
 role === r
 ? 'border-gray-500/40 bg-gray-500/10 text-gray-600 dark:text-z-muted'
 : theme === 'dark'
 ? 'border-z-border text-z-secondary hover:border-z-border'
 : 'border-z-border text-z-muted hover:border-z-border-strong'
 )}
 >
 {r}
 </button>
 ))}
 </div>
 </div>

 {/* Expiry */}
 <div className="space-y-2">
 <label className="text-[9px] font-black uppercase tracking-[0.3em] text-z-secondary">
 Expires After (days)
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
 {[7, 30, 90, 365].map((d) => (
 <button
 key={d}
 type="button"
 onClick={() => setExpiresDays(d)}
 className={cn(
 'py-3 text-[9px] font-black border rounded-none-none transition-all',
 expiresDays === d
 ? 'border-gray-500/40 bg-gray-500/10 text-gray-600 dark:text-z-muted'
 : theme === 'dark'
 ? 'border-z-border text-z-secondary hover:border-z-border'
 : 'border-z-border text-z-muted hover:border-z-border-strong'
 )}
 >
 {d}d
 </button>
 ))}
 </div>
 </div>

 {error && (
 <p className="text-[9px] text-red-500 font-black uppercase tracking-widest">
 {error}
 </p>
 )}

 <button
 type="submit"
 disabled={loading || !name.trim()}
 className={cn(
 'w-full py-4 rounded-none-none text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-40',
 theme === 'dark'
 ? 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 text-white'
 : 'bg-gray-900 hover:bg-gray-800 text-white'
 )}
 >
 {loading ? (
 <span className="flex items-center justify-center gap-2">
 <Loader2 size={14} className="animate-spin" />
 Generating...
 </span>
 ) : (
 'Generate Token'
 )}
 </button>
 </form>

 <div className="px-8 pb-6">
 <p className="text-[8px] text-gray-600 uppercase tracking-widest text-center ">
 Keys are shown only once · store securely
 </p>
 </div>
 </div>
 </div>
 )
}

export default GenerateKeyModal
