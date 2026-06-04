import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeftRight, RotateCcw, Loader2, FileText, CheckCircle2 } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'
import api from '../../../lib/api'
import toast from 'react-hot-toast'

interface DocumentDiffModalProps {
  versionId: string | null
  versionNumber: number
  collection: string
  documentId: string
  onClose: () => void
  onRestoreSuccess: (restoredDoc: any) => void
}

interface DiffItem {
  field: string
  from: any
  to: any
}

export const DocumentDiffModal: React.FC<DocumentDiffModalProps> = ({
  versionId,
  versionNumber,
  collection,
  documentId,
  onClose,
  onRestoreSuccess,
}) => {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [diffs, setDiffs] = useState<DiffItem[]>([])
  const [rollingBackField, setRollingBackField] = useState<string | null>(null)

  useEffect(() => {
    if (!versionId) return
    setLoading(true)
    api.get(`/versions/${collection}/${documentId}/${versionId}/diff`)
      .then((res) => {
        setDiffs(res.data?.data?.diffs || [])
      })
      .catch(() => {
        toast.error('Failed to load version differences')
        onClose()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [versionId, collection, documentId, onClose])

  const handleRollbackField = async (fieldName: string) => {
    if (!versionId) return
    setRollingBackField(fieldName)
    try {
      const res = await api.post(`/versions/${collection}/${documentId}/${versionId}/rollback-fields`, {
        fields: [fieldName]
      })
      toast.success(`Successfully rolled back field: ${fieldName.toUpperCase()}`)
      if (res.data?.data?.document) {
        onRestoreSuccess(res.data.data.document)
      }
      // Remove field from active diff list
      setDiffs(prev => prev.filter(d => d.field !== fieldName))
    } catch {
      toast.error(`Failed to rollback field: ${fieldName}`)
    } finally {
      setRollingBackField(null)
    }
  }

  const renderValuePreview = (val: any) => {
    if (val === null || val === undefined) {
      return <span className="italic text-gray-500 text-xs">None / Empty</span>
    }
    if (typeof val === 'object') {
      return (
        <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed opacity-85">
          {JSON.stringify(val, null, 2)}
        </pre>
      )
    }
    const valStr = String(val)
    if (valStr.startsWith('<') && valStr.endsWith('>')) {
      // Basic HTML tags strip for preview
      const cleanText = valStr.replace(/<\/?[^>]+(>|$)/g, "")
      return <span className="text-[11px] leading-relaxed">{cleanText}</span>
    }
    return <span className="text-[11px] leading-relaxed">{valStr}</span>
  }

  const isDark = theme === 'dark'

  return (
    <AnimatePresence>
      {versionId && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-md" onClick={onClose} />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className={cn(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] w-[85vw] max-w-[1100px] h-[80vh] flex flex-col border shadow-2xl overflow-hidden font-sans',
              isDark ? 'bg-[#0B0F19] border-white/8 text-white' : 'bg-white border-gray-250 text-gray-900'
            )}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-emerald-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 border flex items-center justify-center text-emerald-400">
                  <ArrowLeftRight size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase italic tracking-tighter">
                    Compare Differences — V.{versionNumber}
                  </h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">
                    Compare historical version snapshot with current working draft
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close diff view"
                className={cn(
                  'p-2 rounded-none transition-colors',
                  isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-black'
                )}
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-editor-scrollbar">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 italic animate-pulse">
                    Analyzing delta changes...
                  </p>
                </div>
              ) : diffs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                  <div>
                    <h4 className="text-xs font-black uppercase italic">No Differences Detected</h4>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                      This version snapshot matches the current working copy exactly.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {diffs.map((diff) => (
                    <div
                      key={diff.field}
                      className={cn(
                        'border rounded-none overflow-hidden',
                        isDark ? 'border-white/5 bg-black/10' : 'border-gray-200 bg-gray-50/50'
                      )}
                    >
                      {/* Diff Item Header */}
                      <div className={cn(
                        'px-4 py-2.5 border-b flex items-center justify-between',
                        isDark ? 'bg-white/[0.02] border-white/5' : 'bg-gray-100 border-gray-200'
                      )}>
                        <div className="flex items-center gap-2">
                          <FileText size={13} className="text-emerald-400" />
                          <span className="text-xs font-black uppercase italic tracking-wider">
                            {diff.field.replace(':', ' ➔ ').toUpperCase()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRollbackField(diff.field)}
                          disabled={rollingBackField === diff.field}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-black uppercase bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 hover:border-emerald-500 text-emerald-400 hover:text-white transition-all disabled:opacity-50"
                        >
                          {rollingBackField === diff.field ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <RotateCcw size={10} />
                          )}
                          Rollback Field
                        </button>
                      </div>

                      {/* Side-by-Side Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
                        {/* Old Version Val (Red Tint) */}
                        <div className="p-4 bg-red-500/[0.01] flex flex-col gap-2">
                          <span className="text-xs font-black text-rose-500 uppercase tracking-widest block italic">
                            Previous Value (V.{versionNumber})
                          </span>
                          <div className="flex-1 bg-red-500/[0.03] border border-red-500/10 rounded p-3 text-red-100/90 min-h-16 overflow-x-auto custom-editor-scrollbar">
                            {renderValuePreview(diff.from)}
                          </div>
                        </div>

                        {/* Current Value (Green Tint) */}
                        <div className="p-4 bg-emerald-500/[0.01] flex flex-col gap-2">
                          <span className="text-xs font-black text-emerald-500 uppercase tracking-widest block italic">
                            Current Value
                          </span>
                          <div className="flex-1 bg-emerald-500/[0.03] border border-emerald-500/10 rounded p-3 text-emerald-100/90 min-h-16 overflow-x-auto custom-editor-scrollbar">
                            {renderValuePreview(diff.to)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 flex items-center justify-end bg-gradient-to-r from-transparent to-emerald-500/5">
              <button
                onClick={onClose}
                className="px-5 py-2 border border-white/10 hover:border-white/20 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all text-gray-400 hover:text-white"
              >
                Close Comparison
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
