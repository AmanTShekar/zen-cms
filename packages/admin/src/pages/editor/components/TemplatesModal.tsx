import React, { useRef } from 'react'
import { Layout, X, Trash2, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { useModalStore } from '../../../store/modalStore'
import { cn } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { confirm } from '../../../store/confirmStore'

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
 const { templates } = useEditorStore()
 const { templatesOpen, setTemplatesOpen } = useModalStore()

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
 'w-full max-w-2xl border rounded-none overflow-hidden shadow-2xl',
 theme === 'dark' ? 'bg-[#0a0a0a] border-white/[0.08]' : 'bg-white border-gray-200'
 )}
 >
 <div
 className={cn(
 'p-6 border-b flex items-center justify-between',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100'
 )}
 >
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-none bg-emerald-600 flex items-center justify-center text-white">
 <Layout size={16} />
 </div>
 <div>
 <h3
 id={modalTitleId}
 className="text-lg font-black uppercase leading-none text-emerald-500"
 >
 Block Templates
 </h3>
 <p className="text-xs text-gray-500 uppercase tracking-widest">
 Save & reuse component combinations
 </p>
 </div>
 </div>
 <button
 onClick={() => setTemplatesOpen(false)}
 aria-label="Close"
 className="p-1 hover:text-emerald-500 transition-colors"
 style={{ color: theme === 'dark' ? '#fff' : '#000' }}
 >
 <X size={18} />
 </button>
 </div>

 <div className="p-6 max-h-[60vh] overflow-y-auto custom-editor-scrollbar">
 {templates.length === 0 ? (
 <div className="py-12 text-center">
 <Layout size={40} className="mx-auto mb-4 text-gray-600" />
 <p className="text-xs text-gray-500 font-black uppercase tracking-widest ">
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
 'p-4 border rounded-none space-y-3 relative group',
 theme === 'dark'
 ? 'bg-white/[0.02] border-white/[0.08] hover:border-emerald-500/30'
 : 'bg-gray-50 border-gray-200 hover:border-emerald-300'
 )}
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-black uppercase text-emerald-400">
 {template.name}
 </span>
 <span className="text-xs text-gray-500">
 {template.content?.sections?.length || template.sections?.length || 0} blocks
 </span>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => applyTemplate(template)}
 className="flex-1 py-2 bg-emerald-600 text-white text-xs font-black uppercase rounded-none hover:bg-emerald-500 transition-colors"
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
 'p-2 border rounded-none transition-colors',
 theme === 'dark'
 ? 'border-white/[0.08] text-gray-500 hover:border-rose-500/30 hover:text-rose-500'
 : 'border-gray-200 text-gray-400 hover:border-rose-300 hover:text-rose-500'
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
 theme === 'dark' ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'
 )}>
 <span className="text-xs text-gray-500 font-black uppercase tracking-widest ">
 {selectedSections.size} block{selectedSections.size > 1 ? 's' : ''} selected
 </span>
 <button
 onClick={() => {
 saveAsTemplate(Array.from(selectedSections))
 setSelectedSections(new Set())
 }}
 aria-label="Save selection as template"
 className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-black uppercase rounded-none hover:bg-emerald-500 transition-colors"
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
