import React, { useRef } from 'react'
import { Layout, X, Trash2, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { useModalStore } from '../../../store/modalStore'
import { cn } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { confirm } from '../../../store/confirmStore'
import { useShallow } from 'zustand/react/shallow'

interface TemplatesModalProps {
 selectedSections: Set<string>
 setSelectedSections: (s: Set<string>) => void
 applyTemplate: (template: any) => Promise<void>
 deleteTemplate: (templateId: string) => Promise<void>
 saveAsTemplate: (sectionIds: string[]) => Promise<void>
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
 selectedSections,
 setSelectedSections,
 applyTemplate,
 deleteTemplate,
 saveAsTemplate,
}) => {
 const { theme } = useTheme()
 const { templates  } = useEditorStore(useShallow(state => ({ templates: state.templates })))
 const { templatesOpen, setTemplatesOpen  } = useModalStore(useShallow(state => ({ templatesOpen: state.templatesOpen, setTemplatesOpen: state.setTemplatesOpen })))

 const dialogRef = useRef<HTMLDivElement>(null)
 const modalTitleId = 'templates-modal-title'

 useFocusTrap(templatesOpen, {
 onEscape: () => setTemplatesOpen(false),
 containerRef: dialogRef
 })

 return (
 <AnimatePresence>
 {templatesOpen && (
 <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
 <motion.div
 ref={dialogRef}
 role="dialog"
 aria-modal="true"
 aria-labelledby={modalTitleId}
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0 }}
 className={cn(
 'w-full max-w-2xl border rounded-none-none overflow-hidden shadow-2xl',
 theme === 'dark' ? 'bg-[#0a0a0a] border-z-border' : 'bg-z-panel border-z-border'
 )}
 >
 <div
 className={cn(
 'p-6 border-b flex items-center justify-between',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}
 >
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-none-none bg-gray-600 dark:bg-gray-600 flex items-center justify-center text-white">
 <Layout size={16} />
 </div>
 <div>
 <h3
 id={modalTitleId}
 className="text-lg font-semibold leading-none text-gray-600 dark:text-z-secondary"
 >
 Block Templates
 </h3>
 <p className="text-xs text-z-secondary">
 Save & reuse component combinations
 </p>
 </div>
 </div>
 <button
 onClick={() => setTemplatesOpen(false)}
 aria-label="Close"
 className="p-1 hover:text-gray-600 dark:text-z-secondary transition-colors"
 style={{ color: theme === 'dark' ? '#fff' : '#000' }}
 >
 <X size={18} />
 </button>
 </div>

 <div className="p-6 max-h-[60vh] overflow-y-auto custom-editor-scrollbar">
 {templates.length === 0 ? (
 <div className="py-12 text-center">
 <Layout size={40} className="mx-auto mb-4 text-gray-600" />
 <p className="text-xs text-z-secondary font-semibold">
 No saved templates yet
 </p>
 <p className="text-xs text-gray-600 mt-2">
 Select blocks, then save as template from the context menu
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {templates.map((template: any) => (
 <div
 key={template.id || template._id}
 className={cn(
 'p-4 border rounded-none-none space-y-3 relative group',
 theme === 'dark'
 ? 'bg-z-panel border-z-border hover:border-gray-500/30'
 : 'bg-z-input border-z-border hover:border-z-border-strong'
 )}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-gray-600 dark:text-z-muted">
 {template.name}
 </span>
 <span className="text-xs text-z-secondary">
 {template.content?.sections?.length || template.sections?.length || 0} blocks
 </span>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => applyTemplate(template)}
 className="flex-1 py-2 bg-gray-600 dark:bg-gray-600 text-white text-xs font-semibold rounded-none-none hover:bg-gray-500 transition-colors"
 >
 Apply
 </button>
 <button
 onClick={async () => {
 if (!await confirm({ message: `Delete template "${template.name}"? This cannot be undone.` })) return
 deleteTemplate(template.id || template._id)
 setTemplatesOpen(false)
 setTimeout(() => setTemplatesOpen(true), 50)
 }}
 aria-label={`Delete template ${template.name}`}
 className={cn(
 'p-2 border rounded-none-none transition-colors',
 theme === 'dark'
 ? 'border-z-border text-z-secondary hover:border-rose-500/30 hover:text-rose-500'
 : 'border-z-border text-z-muted hover:border-rose-300 hover:text-rose-500'
 )}
 >
 <Trash2 size={12} />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 {selectedSections.size > 0 && (
 <div className={cn(
 'p-4 border-t flex items-center justify-between',
 theme === 'dark' ? 'border-z-border bg-z-panel' : 'border-z-border shadow-sm bg-gray-50/50'
 )}>
 <span className="text-xs text-z-secondary font-semibold">
 {selectedSections.size} block{selectedSections.size > 1 ? 's' : ''} selected
 </span>
 <button
 onClick={() => {
 saveAsTemplate(Array.from(selectedSections))
 setSelectedSections(new Set())
 }}
 aria-label="Save selection as template"
 className="flex items-center gap-2 px-4 py-2 bg-gray-600 dark:bg-gray-600 text-white text-xs font-semibold rounded-none-none hover:bg-gray-500 transition-colors"
 >
 <Download size={12} aria-hidden="true" />
 Save as Template
 </button>
 </div>
 )}
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 )
}
