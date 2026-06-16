import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { useEditorStore } from '../../../store/editorStore'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'
import { useShallow } from 'zustand/react/shallow'

export const AutoSaveIndicator: React.FC = () => {
 const { saving, hasUnsavedChanges  } = useEditorStore(useShallow(state => ({ saving: state.saving, hasUnsavedChanges: state.hasUnsavedChanges })))
 const { theme } = useTheme()

 // Determine active status: 'saving' | 'unsaved' | 'saved'
 const status = saving ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved'

 return (
 <div className="flex items-center select-none font-sans">
 <AnimatePresence mode="wait">
 {status === 'saving' && (
 <motion.div
 key="saving"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 className={cn(
 'px-2.5 py-1 flex items-center gap-1.5 border text-xs font-black uppercase tracking-wider rounded-none-none',
 theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400'
 : 'bg-gray-50 border-gray-200 text-gray-600'
 )}
 >
 <Loader2 size={11} className="animate-spin" />
 <span>Saving...</span>
 </motion.div>
 )}

 {status === 'unsaved' && (
 <motion.div
 key="unsaved"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 className={cn(
 'px-2.5 py-1 flex items-center gap-1.5 border text-xs font-black uppercase tracking-wider rounded-none-none',
 theme === 'dark'
 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
 : 'bg-amber-50 border-amber-200 text-amber-600'
 )}
 >
 <AlertCircle size={11} className="animate-pulse" />
 <span>Unsaved</span>
 </motion.div>
 )}

 {status === 'saved' && (
 <motion.div
 key="saved"
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 className={cn(
 'px-2.5 py-1 flex items-center gap-1.5 border text-xs font-black uppercase tracking-wider rounded-none-none',
 theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400'
 : 'bg-gray-50 border-gray-200 text-gray-600'
 )}
 >
 <Check size={11} className="text-gray-600 dark:text-gray-500" />
 <span>Saved</span>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default AutoSaveIndicator
