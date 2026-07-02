import React, { useState } from 'react'
import { X, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface DeleteRoleConfirmDialogProps {
 role: { _id: string; roleName: string }
 onClose: () => void
 onDeleted: () => void
 theme: 'light' | 'dark'
}

const DeleteRoleConfirmDialog: React.FC<DeleteRoleConfirmDialogProps> = ({
 role, onClose, onDeleted, theme,
}) => {
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')

 const handleDelete = async () => {
 setLoading(true)
 setError('')
 try {
 await api.delete(`/roles/${role.roleName}`)
 toast.success(`Role "${role.roleName}" deleted`)
 onDeleted()
 onClose()
 } catch (err: any) {
 setError(err?.response?.data?.error?.message || 'Failed to delete role')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-sm">
 <div
 className={cn(
 'w-full max-w-sm border rounded-none-none shadow-2xl',
 theme === 'dark' ? 'bg-app border-red-500/10' : 'bg-z-panel border-red-100'
 )}
 >
 <div className="flex items-center justify-between px-8 py-6 border-b border-z-border">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-none-none bg-red-500/10 border border-red-500/20 flex items-center justify-center">
 <AlertTriangle size={18} className="text-red-500" />
 </div>
 <span className="text-sm font-semibold tracking-wide">
 Delete Role
 </span>
 </div>
 <button onClick={onClose} className="text-z-secondary hover:text-z-primary transition-colors">
 <X size={18} />
 </button>
 </div>

 <div className="px-8 py-6 space-y-5">
 <p className="text-sm font-semibold text-z-secondary leading-relaxed">
 Are you sure you want to delete{' '}
 <span className="text-z-primary">"{role.roleName}"</span>? This action
 cannot be undone and any users assigned to this role will lose access.
 </p>

 {error && (
 <p className="text-sm text-red-500 font-semibold">
 {error}
 </p>
 )}

 <div className="flex gap-3">
 <button
 type="button"
 onClick={onClose}
 disabled={loading}
 className={cn(
 'flex-1 py-3.5 rounded-none-none text-sm font-semibold   border transition-all active:scale-95 disabled:opacity-40',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-z-border hover:text-z-primary'
 : 'border-z-border text-z-secondary hover:border-z-border-strong'
 )}
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={handleDelete}
 disabled={loading}
 className={cn(
 'flex-1 py-3.5 rounded-none-none text-sm font-semibold   shadow-lg transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2',
 'bg-red-500 hover:bg-red-600 text-z-primary shadow-sm/20'
 )}
 >
 {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
 {loading ? 'Deleting...' : 'Delete'}
 </button>
 </div>
 </div>
 </div>
 </div>
 )
}

export default DeleteRoleConfirmDialog
