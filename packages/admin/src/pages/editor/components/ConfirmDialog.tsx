import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { useRef } from 'react'

interface ConfirmDialogProps {
 open: boolean
 title: string
 message: string
 confirmLabel?: string
 danger?: boolean
 onConfirm: () => void
 onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
 open,
 title,
 message,
 confirmLabel = 'Confirm',
 danger = false,
 onConfirm,
 onCancel,
}) => {
 const { theme } = useTheme()
 const dialogRef = useRef<HTMLDivElement>(null)
 useFocusTrap(open, { onEscape: onCancel, containerRef: dialogRef })
 const dark = theme === 'dark'

 return (
 <AnimatePresence>
 {open && (
 <div
 className="fixed inset-0 z-[900] flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-sm"
 onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
 >
 <motion.div
 ref={dialogRef}
 role="alertdialog"
 aria-modal="true"
 aria-label={title}
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ duration: 0.15 }}
 className={cn(
 'w-full max-w-sm border rounded-none-none shadow-2xl p-5',
 dark
 ? 'bg-app border-z-border text-z-primary'
 : 'bg-z-panel border-z-border text-z-primary'
 )}
 >
 <div className="flex items-start gap-3">
 <div className={cn(
 'w-9 h-9 rounded-none-none border flex items-center justify-center shrink-0',
 danger
 ? dark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-500'
 : dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-500'
 )}>
 <AlertTriangle size={16} />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-semibold">{title}</h3>
 <p className={cn('text-xs font-bold mt-1.5 leading-relaxed', dark ? 'text-z-muted' : 'text-z-secondary')}>
 {message}
 </p>
 </div>
 <button
 onClick={onCancel}
 aria-label="Cancel"
 className={cn('shrink-0 p-1 transition-colors', dark ? 'text-z-secondary hover:text-z-primary' : 'text-z-muted hover:text-z-primary')}
 >
 <X size={14} />
 </button>
 </div>
 <div className="flex gap-2 mt-4">
 <button
 onClick={onCancel}
 aria-label="Cancel action"
 className={cn(
 'flex-1 py-2 text-xs font-semibold   border rounded-none-none transition-all',
 dark
 ? 'border-z-border text-z-muted hover:border-z-border hover:text-z-primary'
 : 'border-z-border text-z-secondary hover:border-z-border-strong hover:text-z-primary'
 )}
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 aria-label={confirmLabel}
 className={cn(
 'flex-1 py-2 text-xs font-semibold   rounded-none-none transition-all',
 danger
 ? 'bg-rose-600 hover:bg-rose-500 text-z-primary'
 : 'bg-z-accent  hover:bg-z-border text-z-primary'
 )}
 >
 {confirmLabel}
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 )
}

export default ConfirmDialog
