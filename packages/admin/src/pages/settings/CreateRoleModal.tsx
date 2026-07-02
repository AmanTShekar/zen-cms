import React, { useState, useEffect, useRef } from 'react'
import { X, PlusCircle, Loader2, Shield } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface CreateRoleModalProps {
 onClose: () => void
 onCreated: (role: any) => void
 theme: 'light' | 'dark'
}

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({ onClose, onCreated, theme }) => {
 const [name, setName] = useState('')
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const modalRef = useRef<HTMLDivElement>(null)

 // Native Escape to close and simple focus management
 useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }
  document.addEventListener('keydown', handleKeyDown)
  // Prevent scrolling behind modal
  document.body.style.overflow = 'hidden'
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'unset'
  }
 }, [onClose])

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!name.trim()) return
 setError('')
 setLoading(true)
 try {
 const res = await api.post<any>('/roles', {
 roleName: name.trim(),
 description: '',
 permissions: [{ resource: '*', actions: ['read'] }],
 })
 onCreated(res.data.data)
 toast.success(`Role "${name.trim()}" created`)
 onClose()
 } catch (err: any) {
 setError(err?.response?.data?.error?.message || 'Failed to create role')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-role-title">
 <div
 ref={modalRef}
 className={cn(
 'w-full max-w-sm border rounded-none-none shadow-2xl',
 theme === 'dark' ? 'bg-app border-z-border' : 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 <div className="flex items-center justify-between px-8 py-6 border-b border-z-border">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-none-none bg-z-panel border border-z-border/20 flex items-center justify-center">
 <PlusCircle size={18} className="text-z-secondary " />
 </div>
 <span id="create-role-title" className="text-sm font-semibold tracking-wide">
 New Custom Role
 </span>
 </div>
 <button onClick={onClose} aria-label="Close" className="text-z-secondary hover:text-z-primary transition-colors">
 <X size={18} />
 </button>
 </div>

 <form onSubmit={handleCreate} className="px-8 py-6 space-y-6">
 <div className="space-y-2">
 <label className="text-sm font-semibold text-z-secondary">
 Role Name
 </label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 autoFocus
 placeholder="e.g. Content Manager"
 className={cn(
 'w-full border rounded-none-none py-4 px-5 text-[13px] font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-z-primary focus:border-z-border/50'
 : 'bg-z-input border-z-border focus:border-z-border'
 )}
 />
 </div>

 <div className="p-4 border border-amber-500/10 bg-amber-500/5 rounded-none-none">
 <div className="flex items-start gap-3">
 <Shield size={14} className="text-amber-500 mt-0.5 shrink-0" />
 <p className="text-sm font-bold text-amber-400 leading-relaxed">
 New roles start with read-only access on all resources. You can customize permissions after creation.
 </p>
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
 Creating...
 </span>
 ) : (
 'Create Role'
 )}
 </button>
 </form>
 </div>
 </div>
 )
}

export default CreateRoleModal

