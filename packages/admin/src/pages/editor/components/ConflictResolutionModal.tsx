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
 className="fixed inset-0 z-[1000] flex items-center justify-center bg-app/70 backdrop-blur-sm"
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
 'w-full max-w-md border rounded-none-none shadow-2xl',
 theme === 'dark'
 ? 'bg-app border-rose-500/20 text-z-primary'
 : 'bg-z-panel border-rose-200 text-z-primary'
 )}
 >
 {/* Header */}
 <div className={cn(
 'px-6 py-5 border-b flex items-start gap-4',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <div className={cn(
 'w-10 h-10 rounded-none-none border flex items-center justify-center shrink-0',
 theme === 'dark'
 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
 : 'bg-rose-50 border-rose-200 text-rose-500'
 )}>
 <AlertTriangle size={18} />
 </div>
 <div className="flex-1">
 <h2 className="text-xs font-semibold text-rose-400">
 Conflict Detected
 </h2>
 <p className="text-xs font-bold text-z-secondary mt-1 leading-relaxed">
 Another editor saved changes to this document while you were editing.
 <br />
 Version mismatch: you had <span className="font-semibold text-z-secondary">v{localVersion ?? '?'}</span>, server now at <span className="font-semibold text-amber-400">v{serverVersion ?? '?'}</span>.
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
 theme === 'dark' ? 'text-z-secondary hover:text-z-primary' : 'text-z-muted hover:text-z-primary'
 )}
 >
 <X size={16} />
 </button>
 </div>

 {/* Body */}
 <div className="px-6 py-5 space-y-4">
 <div className={cn(
 'p-4 border rounded-none-none text-xs font-bold tracking-wide leading-relaxed',
 theme === 'dark'
 ? 'bg-z-panel/3 border-z-border text-z-muted'
 : 'bg-z-input border-z-border shadow-sm text-z-secondary'
 )}>
 <p>Choose <span className="font-semibold text-z-primary">"Use Their Version"</span> to discard your unsaved changes and reload the server's latest content.</p>
 <p className="mt-2">Choose <span className="font-semibold text-z-primary">"Keep My Changes"</span> to overwrite the server's changes with yours (the server will update its version to match).</p>
 </div>

 {/* Version comparison */}
 <div className={cn(
 'grid grid-cols-1 md:grid-cols-2 gap-3 p-3 border border-dashed rounded-none-none',
 'border-z-border'
 )}>
 <div className="text-center">
 <p className="text-sm font-semibold text-z-secondary mb-1">Your Version</p>
 <p className="text-lg font-semibold text-z-secondary">v{localVersion ?? '?'}</p>
 </div>
 <div className="text-center">
 <p className="text-sm font-semibold text-z-secondary mb-1">Server Version</p>
 <p className="text-lg font-semibold text-amber-400">v{serverVersion ?? '?'}</p>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className={cn(
 'px-6 py-4 border-t flex gap-3',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <button
 type="button"
 disabled={loading}
 onClick={handleReload}
 className={cn(
 'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold   border rounded-none-none transition-all',
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
 'flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold   rounded-none-none transition-all bg-z-accent  text-z-primary hover:bg-z-border border border-z-border',
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
