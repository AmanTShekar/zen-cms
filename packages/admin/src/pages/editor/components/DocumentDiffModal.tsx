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
 return <span className="text-z-secondary text-xs">None / Empty</span>
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
 return <span className="text-sm leading-relaxed">{cleanText}</span>
 }
 return <span className="text-sm leading-relaxed">{valStr}</span>
 }

 const isDark = theme === 'dark'

 return (
 <AnimatePresence>
 {versionId && (
 <>
 {/* Backdrop */}
 <div className="fixed inset-0 z-[110] bg-app/50 backdrop-blur-md" onClick={onClose} />

 {/* Modal Container */}
 <motion.div
 initial={{ opacity: 0, scale: 0.95, y: 15 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 15 }}
 transition={{ type: 'spring', damping: 25, stiffness: 250 }}
 className={cn(
 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[120] w-[85vw] max-w-[1100px] h-[80vh] flex flex-col border shadow-2xl overflow-hidden font-sans',
 isDark ? 'bg-app border-z-border text-z-primary' : 'bg-z-panel border-z-border text-z-primary'
 )}
 >
 {/* Header */}
 <div className="p-6 border-b border-z-border flex items-center justify-between shrink-0 bg-gradient-to-r from-[var(--z-bg-panel)] to-transparent">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 border flex items-center justify-center text-z-secondary">
 <ArrowLeftRight size={16} />
 </div>
 <div>
 <h3 className="text-base font-semibold">
 Compare Differences — V.{versionNumber}
 </h3>
 <p className="text-xs text-z-secondary mt-0.5">
 Compare historical version snapshot with current working draft
 </p>
 </div>
 </div>
 <button
 onClick={onClose}
 aria-label="Close diff view"
 className={cn(
 'p-2 rounded-none-none transition-colors',
 isDark ? 'hover:bg-z-hover text-z-muted hover:text-z-primary' : 'hover:bg-[var(--z-bg-hover)] text-z-secondary hover:text-z-primary'
 )}
 >
 <X size={15} aria-hidden="true" />
 </button>
 </div>

 {/* Content Body */}
 <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-editor-scrollbar">
 {loading ? (
 <div className="h-full flex flex-col items-center justify-center gap-4">
 <Loader2 size={32} className="animate-spin text-z-secondary " />
 <p className="text-xs font-semibold text-z-secondary animate-pulse">
 Analyzing delta changes...
 </p>
 </div>
 ) : diffs.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
 <CheckCircle2 size={36} className="text-z-secondary " />
 <div>
 <h4 className="text-xs font-semibold">No Differences Detected</h4>
 <p className="text-xs text-z-secondary mt-1">
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
 'border rounded-none-none overflow-hidden',
 isDark ? 'border-z-border bg-app/10' : 'border-z-border bg-[var(--z-bg-input)]/50'
 )}
 >
 {/* Diff Item Header */}
 <div className={cn(
 'px-4 py-2.5 border-b flex items-center justify-between',
 isDark ? 'bg-z-panel border-z-border' : 'bg-[var(--z-bg-hover)] border-z-border'
 )}>
 <div className="flex items-center gap-2">
 <FileText size={13} className="text-z-secondary" />
 <span className="text-xs font-semibold">
 {diff.field.replace(':', '  ').toUpperCase()}
 </span>
 </div>
 <button
 onClick={() => handleRollbackField(diff.field)}
 disabled={rollingBackField === diff.field}
 className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-z-accent/10 hover:bg-z-accent  border border-z-border/20 hover:border-z-border text-z-secondary hover:text-z-primary transition-all disabled:opacity-50"
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
 <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-z-border">
 {/* Old Version Val (Red Tint) */}
 <div className="p-4 bg-red-500/[0.01] flex flex-col gap-2">
 <span className="text-xs font-semibold text-rose-500 block">
 Previous Value (V.{versionNumber})
 </span>
 <div className="flex-1 bg-red-500/[0.03] border border-red-500/10 rounded-none p-3 text-red-100/90 min-h-16 overflow-x-auto custom-editor-scrollbar">
 {renderValuePreview(diff.from)}
 </div>
 </div>

 {/* Current Value (Green Tint) */}
 <div className="p-4 bg-z-border/[0.01] flex flex-col gap-2">
 <span className="text-xs font-semibold text-z-secondary  block">
 Current Value
 </span>
 <div className="flex-1 bg-z-border/[0.03] border border-z-border/10 rounded-none p-3 text-z-primary/90 min-h-16 overflow-x-auto custom-editor-scrollbar">
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
 <div className="p-4 border-t border-z-border flex items-center justify-end bg-gradient-to-r from-transparent to-[var(--z-bg-panel)]">
 <button
 onClick={onClose}
 className="px-5 py-2 border border-z-border hover:border-z-border text-xs font-semibold hover:bg-z-hover transition-all text-z-muted hover:text-z-primary"
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
