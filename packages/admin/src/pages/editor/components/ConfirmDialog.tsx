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
          className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 backdrop-blur-sm"
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
              'w-full max-w-sm border rounded-none shadow-2xl p-5',
              dark
                ? 'bg-[#0B0F19] border-white/10 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-9 h-9 rounded-none border flex items-center justify-center shrink-0',
                danger
                  ? dark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-500'
                  : dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-500'
              )}>
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black uppercase italic tracking-wider">{title}</h3>
                <p className={cn('text-xs font-bold mt-1.5 leading-relaxed', dark ? 'text-gray-400' : 'text-gray-600')}>
                  {message}
                </p>
              </div>
              <button
                onClick={onCancel}
                aria-label="Cancel"
                className={cn('shrink-0 p-1 transition-colors', dark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black')}
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={onCancel}
                aria-label="Cancel action"
                className={cn(
                  'flex-1 py-2 text-xs font-black uppercase italic tracking-widest border rounded-none transition-all',
                  dark
                    ? 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black'
                )}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                aria-label={confirmLabel}
                className={cn(
                  'flex-1 py-2 text-xs font-black uppercase italic tracking-widest rounded-none transition-all',
                  danger
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
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
