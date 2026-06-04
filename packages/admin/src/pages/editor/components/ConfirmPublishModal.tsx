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
 <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 10 }}
 transition={{ duration: 0.15 }}
 className={cn(
 'w-full max-w-sm border rounded-none shadow-2xl p-6',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] text-white'
 : 'bg-white border-gray-200 text-gray-900'
 )}
 >
 <div className="flex items-start gap-4">
 <div className={cn(
 'w-10 h-10 rounded-none border flex items-center justify-center shrink-0',
 theme === 'dark'
 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
 : 'bg-amber-50 border-amber-200 text-amber-500'
 )}>
 <AlertTriangle size={18} />
 </div>
 <div className="flex-1">
 <h3 className="text-sm font-black uppercase tracking-wider">Publish Document</h3>
 <p className={cn('text-xs font-bold mt-2 leading-relaxed', theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}>
 This will make the content live and visible to all visitors. Are you sure you want to publish?
 </p>
 </div>
 <button
 onClick={onCancel}
 aria-label="Close"
 className={cn('shrink-0 p-1 transition-colors', theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black')}
 >
 <X size={16} />
 </button>
 </div>
 <div className="flex gap-3 mt-5">
 <button
 onClick={onCancel}
 className={cn(
 'flex-1 py-2.5 text-xs font-black uppercase tracking-widest border rounded-none transition-all',
 theme === 'dark'
 ? 'border-white/[0.08] text-gray-400 hover:border-white/[0.08] hover:text-white'
 : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black'
 )}
 >
 Cancel
 </button>
 <button
 onClick={onConfirm}
 className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-none hover:bg-emerald-500 transition-all"
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
