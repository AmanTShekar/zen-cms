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
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-sm">
 <div
 className={cn(
 'w-full max-w-md border rounded-none-none shadow-2xl',
 theme === 'dark' ? 'bg-app border-z-border' : 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-8 py-6 border-b border-z-border">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-none-none bg-z-panel border border-z-border/20 flex items-center justify-center">
 <Key size={18} className="text-z-secondary " />
 </div>
 <span className="text-sm font-semibold tracking-wide">
 Generate Access Token
 </span>
 </div>
 <button onClick={onClose} className="text-z-secondary hover:text-z-primary transition-colors">
 <X size={18} />
 </button>
 </div>

 <form onSubmit={handleGenerate} className="px-8 py-6 space-y-6">
 {/* Name */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-z-secondary">
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
 'w-full border rounded-none-none py-4 px-5 text-[13px] font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-primary focus:border-z-border/50'
 : 'bg-z-input border-z-border focus:border-z-border'
 )}
 />
 </div>

 {/* Role */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-z-secondary">
 Permissions Tier
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
 {(['admin', 'editor', 'viewer'] as const).map((r) => (
 <button
 key={r}
 type="button"
 onClick={() => setRole(r)}
 className={cn(
 'py-3 text-sm font-semibold   border rounded-none-none transition-all',
 role === r
 ? 'border-z-border/40 bg-z-panel text-z-secondary'
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
 <label className="text-sm font-semibold text-z-secondary">
 Expires After (days)
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
 {[7, 30, 90, 365].map((d) => (
 <button
 key={d}
 type="button"
 onClick={() => setExpiresDays(d)}
 className={cn(
 'py-3 text-sm font-semibold border rounded-none-none transition-all',
 expiresDays === d
 ? 'border-z-border/40 bg-z-panel text-z-secondary'
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
 <p className="text-sm text-red-500 font-semibold">
 {error}
 </p>
 )}

 <button
 type="submit"
 disabled={loading || !name.trim()}
 className={cn(
 'w-full py-4 rounded-none-none text-sm font-semibold   shadow-lg transition-all active:scale-95 disabled:opacity-40',
 theme === 'dark'
 ? 'bg-z-border hover:bg-z-accent  text-z-primary'
 : 'bg-z-accent hover:brightness-110 text-z-primary'
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
 <p className="text-sm text-z-secondary text-center">
 Keys are shown only once · store securely
 </p>
 </div>
 </div>
 </div>
 )
}

export default GenerateKeyModal
