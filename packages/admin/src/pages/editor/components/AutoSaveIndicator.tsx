import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { useEditorStore } from '../../../store/editorStore'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'

export const AutoSaveIndicator: React.FC = () => {
  const { saving, hasUnsavedChanges } = useEditorStore()
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
              'px-2.5 py-1 flex items-center gap-1.5 border text-xs font-black uppercase italic tracking-wider rounded-none',
              theme === 'dark'
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                : 'bg-indigo-50 border-indigo-200 text-indigo-600'
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
              'px-2.5 py-1 flex items-center gap-1.5 border text-xs font-black uppercase italic tracking-wider rounded-none',
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
              'px-2.5 py-1 flex items-center gap-1.5 border text-xs font-black uppercase italic tracking-wider rounded-none',
              theme === 'dark'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            )}
          >
            <Check size={11} className="text-emerald-500" />
            <span>Saved</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AutoSaveIndicator
