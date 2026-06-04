import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, X, Check } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'

interface ConflictResolutionModalProps {
 open: boolean
 onClose: () => void
 /** Reload the server's version, discarding local changes */
 onReload: () => void
 /** Force-save: keep local changes but tell the server to accept the conflict */
 onForceSave: () => void
 /** Message from the server about why conflict occurred */
 conflictMessage?: string
 /** Server's current version number */
 serverVersion?: number
 /** What local version the user had when the conflict occurred */
 localVersion?: number
 theme: 'light' | 'dark'
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
 open,
 onClose,
 onReload,
 onForceSave,
 conflictMessage,
 serverVersion,
 localVersion,
 theme,
}) => {
 const [loading, setLoading] = useState(false)

 const handleReload = async () => {
 setLoading(true)
 try {
 await onReload()
 } finally {
 setLoading(false)
 onClose()
 }
 }

 const handleForceSave = async () => {
 setLoading(true)
 try {
 await onForceSave()
 } finally {
 setLoading(false)
 onClose()
 }
 }

 return (
 <AnimatePresence>
 {open && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
 onClick={(e) => {
 if (e.target === e.currentTarget) onClose()
 }}
 >
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ duration: 0.15 }}
 className={cn(
 'w-full max-w-md border rounded-none shadow-2xl',
 theme === 'dark'
 ? 'bg-black border-rose-500/20 text-white'
 : 'bg-white border-rose-200 text-gray-900'
 )}
 >
 {/* Header */}
 <div className={cn(
 'px-6 py-5 border-b flex items-start gap-4',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100'
 )}>
 <div className={cn(
 'w-10 h-10 rounded-none border flex items-center justify-center shrink-0',
 theme === 'dark'
 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
 : 'bg-rose-50 border-rose-200 text-rose-500'
 )}>
 <AlertTriangle size={18} />
 </div>
 <div className="flex-1">
 <h2 className="text-xs font-black uppercase tracking-widest text-rose-400">
 Conflict Detected
 </h2>
 <p className="text-xs font-bold text-gray-500 mt-1 leading-relaxed">
 Another editor saved changes to this document while you were editing.
 <br />
 Version mismatch: you had <span className="font-black text-emerald-400">v{localVersion ?? '?'}</span>, server now at <span className="font-black text-amber-400">v{serverVersion ?? '?'}</span>.
 </p>
 {conflictMessage && (
 <p className="text-xs font-bold text-rose-400/70 mt-1.5 tracking-wide">
 {conflictMessage}
 </p>
 )}
 </div>
 <button
 onClick={onClose}
 className={cn(
 'shrink-0 p-1 transition-colors',
 theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
 )}
 >
 <X size={16} />
 </button>
 </div>

 {/* Body */}
 <div className="px-6 py-5 space-y-4">
 <div className={cn(
 'p-4 border rounded-none text-xs font-bold tracking-wide leading-relaxed',
 theme === 'dark'
 ? 'bg-white/3 border-white/[0.08] text-gray-400'
 : 'bg-gray-50 border-gray-100 text-gray-600'
 )}>
 <p>Choose <span className="font-black text-white">"Use Their Version"</span> to discard your unsaved changes and reload the server's latest content.</p>
 <p className="mt-2">Choose <span className="font-black text-white">"Keep My Changes"</span> to overwrite the server's changes with yours (the server will update its version to match).</p>
 </div>

 {/* Version comparison */}
 <div className={cn(
 'grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-dashed rounded-none',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
 )}>
 <div className="text-center">
 <p className="text-[7px] font-black uppercase text-gray-600 tracking-widest mb-1">Your Version</p>
 <p className="text-lg font-black text-emerald-400">v{localVersion ?? '?'}</p>
 </div>
 <div className="text-center">
 <p className="text-[7px] font-black uppercase text-gray-600 tracking-widest mb-1">Server Version</p>
 <p className="text-lg font-black text-amber-400">v{serverVersion ?? '?'}</p>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className={cn(
 'px-6 py-4 border-t flex gap-3',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100'
 )}>
 <button
 type="button"
 disabled={loading}
 onClick={handleReload}
 className={cn(
 'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest border rounded-none transition-all',
 theme === 'dark'
 ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50'
 : 'border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400',
 loading && 'opacity-50 cursor-not-allowed'
 )}
 >
 <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
 Use Their Version
 </button>
 <button
 type="button"
 disabled={loading}
 onClick={handleForceSave}
 className={cn(
 'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest rounded-none transition-all bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-600',
 loading && 'opacity-50 cursor-not-allowed'
 )}
 >
 <Check size={11} className={loading ? 'animate-spin' : ''} />
 Keep My Changes
 </button>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 )
}

export default ConflictResolutionModal
