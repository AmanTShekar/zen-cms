import React, { useState, useRef, useEffect } from 'react'
import { X, Users, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface InviteUserModalProps {
 onClose: () => void
 onInvited: () => void
 theme: 'light' | 'dark'
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInvited, theme }) => {
 const [email, setEmail] = useState('')
 const [role, setRole] = useState<string>('editor')
 const [availableRoles, setAvailableRoles] = useState<string[]>(['admin', 'editor', 'viewer'])
 const [loading, setLoading] = useState(false)
 const [sent, setSent] = useState(false)
 const isMountedRef = useRef(true)
 useEffect(() => { 
 const fetchRoles = async () => {
 try {
 const res = await api.get('/system/roles')
 if (res.data?.data) {
 const roles = res.data.data.map((r: any) => r.roleName)
 setAvailableRoles((prev) => Array.from(new Set([...prev, ...roles])))
 }
 } catch (e) {
 // use defaults
 }
 }
 fetchRoles()
 return () => { isMountedRef.current = false } 
 }, [])

 const handleInvite = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!email.trim()) return

 setLoading(true)
 try {
 await api.post('/system/members', { email: email.trim(), role })
 toast.success(`Invitation sent to ${email}`)
 setSent(true)
 onInvited()
 setTimeout(() => { if (isMountedRef.current) onClose() }, 1200)
 } catch (err: any) {
 toast.error(err?.response?.data?.error || 'Failed to send invitation')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-sm">
 <div
 className={cn(
 'w-full max-w-md border rounded-none-none shadow-2xl',
 theme === 'dark'
 ? 'bg-app border-z-border'
 : 'bg-z-panel border-z-border shadow-sm shadow-[var(--z-border)]'
 )}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-8 py-6 border-b border-z-border">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-none-none bg-z-panel border border-z-border/20 flex items-center justify-center">
 <Users size={18} className="text-z-secondary " />
 </div>
 <span className="text-sm font-semibold tracking-wide">
 Initialize Operator
 </span>
 </div>
 <button onClick={onClose} className="text-z-secondary hover:text-z-primary transition-colors">
 <X size={18} />
 </button>
 </div>

 {sent ? (
 <div className="px-8 py-12 text-center space-y-4">
 <div className="w-16 h-16 mx-auto rounded-none-none bg-z-panel border border-z-border/20 flex items-center justify-center">
 <Users size={28} className="text-z-secondary " />
 </div>
 <p className="text-sm font-semibold text-z-secondary ">
 Invitation Dispatched
 </p>
 <p className="text-sm text-z-secondary">
 {email} — check inbox for password reset link
 </p>
 </div>
 ) : (
 <form onSubmit={handleInvite} className="px-8 py-6 space-y-6">
 {/* Email */}
 <div className="space-y-2">
 <label className="text-sm font-semibold text-z-secondary">
 Operator Email
 </label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 autoFocus
 placeholder="operator@example.com"
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
 Auth Tier
 </label>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
 {availableRoles.map((r) => (
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

 {/* Submit */}
 <button
 type="submit"
 disabled={loading || !email.trim()}
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
 Dispatching Invite...
 </span>
 ) : (
 'Dispatch Invitation'
 )}
 </button>
 </form>
 )}

 <div className="px-8 pb-6">
 <p className="text-sm text-z-secondary text-center">
 48h expiring token · sent via SMTP relay · password set on first login
 </p>
 </div>
 </div>
 </div>
 )
}

export default InviteUserModal
