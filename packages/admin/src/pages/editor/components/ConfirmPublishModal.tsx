import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Rocket } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'

interface ConfirmPublishModalProps {
 open: boolean
 onConfirm: () => void
 onCancel: () => void
}

export const ConfirmPublishModal: React.FC<ConfirmPublishModalProps> = ({
 open,
 onConfirm,
 onCancel,
}) => {
 const { theme } = useTheme()

 return createPortal(
 <AnimatePresence>
 {open && (
 <div className="fixed inset-0 z-[800] flex items-center justify-center bg-[var(--z-bg-modal)] backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ duration: 0.15 }}
 className={cn(
 'w-full max-w-sm border rounded-none-none shadow-2xl p-6',
 theme === 'dark'
 ? 'bg-app border-z-border text-z-primary'
 : 'bg-z-panel border-z-border text-z-primary'
 )}
 >
 <div className="flex items-start gap-4">
 <div className={cn(
 'w-10 h-10 rounded-none-none border flex items-center justify-center shrink-0',
 theme === 'dark'
 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
 : 'bg-amber-50 border-amber-200 text-amber-500'
 )}>
 <AlertTriangle size={18} />
 </div>
 <div className="flex-1">
 <h3 className="text-sm font-semibold">Publish Document</h3>
 <p className={cn('text-xs font-bold mt-2 leading-relaxed', theme === 'dark' ? 'text-z-muted' : 'text-z-secondary')}>
 This will make the content live and visible to all visitors. Are you sure you want to publish?
 </p>
 </div>
 <button
 onClick={onCancel}
 aria-label="Close"
 className={cn('shrink-0 p-1 transition-colors', theme === 'dark' ? 'text-z-secondary hover:text-z-primary' : 'text-z-muted hover:text-z-primary')}
 >
 <X size={16} />
 </button>
 </div>
 <div className="flex gap-3 mt-5">
 <button
 onClick={onCancel}
 className={cn(
 'flex-1 py-2.5 text-xs font-semibold   border rounded-none-none transition-all',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-z-border hover:text-z-primary'
 : 'border-z-border text-z-secondary hover:border-z-border-strong hover:text-z-primary'
 )}
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-z-accent  text-z-primary text-xs font-semibold rounded-none-none hover:bg-z-border transition-all"
 >
 <Rocket size={12} />
 Publish Now
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>,
 document.body
 )
}

export default ConfirmPublishModal
