import React, { useRef, useState, useMemo } from 'react'
import { Layers, X, GripVertical, Layout, Trash2, PlusCircle, Box, Search } from 'lucide-react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { useEditorBlocks } from '../../../context/BlockLibraryContext'
import { humanize, type PageData } from '../constants'
import { cn } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'

interface DynamicZoneModalProps {
 dynamicZoneModalOpen: boolean
 setDynamicZoneModalOpen: (val: boolean) => void
 activeDynamicZone: { sectionId: string; fieldKey: string } | null
 addToDynamicZone: (componentType: string) => void
 removeFromDynamicZone: (index: number) => void
 onReorder?: (sectionId: string, fieldKey: string, newItems: any[]) => void
}

interface DraggableItemProps {
 item: any
 idx: number
 theme: 'light' | 'dark'
 removeFromDynamicZone: (index: number) => void
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item, idx, theme, removeFromDynamicZone }) => {
 const dragControls = useDragControls()
 return (
 <Reorder.Item
 value={item}
 dragListener={false}
 dragControls={dragControls}
 as="div"
 className={cn(
 'flex items-center gap-3 p-3 rounded-none border group',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] hover:border-emerald-500/20'
 : 'bg-gray-50 border-gray-200 hover:border-emerald-200'
 )}
 >
 <div
 onPointerDown={(e) => dragControls.start(e)}
 className="cursor-grab active:cursor-grabbing shrink-0"
 >
 <GripVertical size={12} className="text-gray-500" />
 </div>
 <div className="w-6 h-6 rounded-none bg-emerald-500/10 flex items-center justify-center shrink-0">
 <Layout size={12} className="text-emerald-600 dark:text-emerald-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-black uppercase truncate">
 {humanize(item.__component?.replace('content.', '') || item.__component || 'Component')}
 </p>
 </div>
 <button
 onClick={() => removeFromDynamicZone(idx)}
 aria-label={`Remove component ${idx + 1}`}
 className="p-1 text-gray-500 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
 >
 <Trash2 size={12} aria-hidden="true" />
 </button>
 </Reorder.Item>
 )
}

export const DynamicZoneModal: React.FC<DynamicZoneModalProps> = ({
 dynamicZoneModalOpen,
 setDynamicZoneModalOpen,
 activeDynamicZone,
 addToDynamicZone,
 removeFromDynamicZone,
 onReorder,
}) => {
 const { theme } = useTheme()
 const { data: dataRaw } = useEditorStore()
 const data = dataRaw as PageData | null
 const BLOCK_LIBRARY = useEditorBlocks()

 const [componentSearch, setComponentSearch] = useState('')

 const dialogRef = useRef<HTMLDivElement>(null)
 const modalTitleId = 'dynamic-zone-modal-title'

 useFocusTrap(dynamicZoneModalOpen, {
 onEscape: () => setDynamicZoneModalOpen(false),
 containerRef: dialogRef
 })

 const filteredBlocks = useMemo(() => {
 if (!componentSearch.trim()) return BLOCK_LIBRARY
 const q = componentSearch.toLowerCase()
 return BLOCK_LIBRARY.filter(
 (b) => b.title.toLowerCase().includes(q) || b.type.toLowerCase().includes(q) || b.description.toLowerCase().includes(q)
 )
 }, [BLOCK_LIBRARY, componentSearch])

 return (
 <AnimatePresence>
 {dynamicZoneModalOpen && (
 <div className="fixed inset-0 z-[700]">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setDynamicZoneModalOpen(false)}
 className="absolute inset-0 bg-black/70 backdrop-blur-md"
 />
 <motion.div
 ref={dialogRef}
 role="dialog"
 aria-modal="true"
 aria-labelledby={modalTitleId}
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className={cn(
 'absolute right-0 top-0 bottom-0 w-[450px] border-l shadow-2xl flex flex-col overflow-hidden',
 theme === 'dark' ? 'bg-[#060606] border-white/[0.08]' : 'bg-white border-gray-200'
 )}
 >
 <div className={cn(
 'p-6 border-b flex items-center justify-between',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}>
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-none bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
 <Layers size={16} className="text-emerald-600 dark:text-emerald-400" />
 </div>
 <div>
 <h2
 id={modalTitleId}
 className="text-base font-black uppercase text-emerald-600 dark:text-emerald-400 leading-none"
 >
 Dynamic Zone
 </h2>
 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
 Add/arrange component blocks
 </p>
 </div>
 </div>
 <button
 onClick={() => setDynamicZoneModalOpen(false)}
 aria-label="Close"
 className={cn(
 'p-1.5 rounded-none border transition-all',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] hover:bg-white hover:text-black'
 : 'bg-gray-100 border-gray-200 hover:bg-black hover:text-white'
 )}
 >
 <X size={14} />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-4 custom-editor-scrollbar space-y-4">
 {/* Current Zone Items */}
 {activeDynamicZone && (
 (() => {
 const section = data?.sections?.find((s) => s.id === activeDynamicZone.sectionId)
 const zone = section?.content?.[activeDynamicZone.fieldKey] || []
 return zone.length > 0 ? (
 <div className="space-y-2">
 <p className="text-xs font-black text-gray-500 uppercase px-1">
 Zone Contents ({zone.length})
 </p>
 <Reorder.Group
 axis="y"
 values={zone}
 onReorder={(newItems) => onReorder?.(activeDynamicZone.sectionId, activeDynamicZone.fieldKey, newItems)}
 className="space-y-2"
 >
 {zone.map((item: any, idx: number) => (
 <DraggableItem
 key={item.id || idx}
 item={item}
 idx={idx}
 theme={theme}
 removeFromDynamicZone={removeFromDynamicZone}
 />
 ))}
 </Reorder.Group>
 </div>
 ) : (
 <div className="text-center py-6">
 <Box size={24} className="mx-auto text-gray-500 mb-2" />
 <p className="text-xs text-gray-500 font-bold ">
 Zone is empty — add components below
 </p>
 </div>
 )
 })()
 )}

 {/* Add Components */}
 <div className="space-y-2">
 <p className="text-xs font-black text-gray-500 uppercase px-1">
 Available Components
 </p>
 <div className="relative">
 <Search size={12} className={cn(
 'absolute left-3 top-1/2 -translate-y-1/2',
 theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
 )} />
 <input
 type="text"
 value={componentSearch}
 onChange={(e) => setComponentSearch(e.target.value)}
 placeholder="Search components..."
 className={cn(
 'w-full pl-8 pr-3 py-2 text-xs font-bold border rounded-none bg-transparent',
 theme === 'dark'
 ? 'border-white/[0.08] text-white placeholder-gray-600 focus:border-emerald-500/30'
 : 'border-gray-200 text-black placeholder-gray-400 focus:border-emerald-500/30'
 )}
 />
 </div>
 <div className="max-h-64 overflow-y-auto space-y-1.5 custom-editor-scrollbar">
 {filteredBlocks.length === 0 ? (
 <p className={cn('text-xs font-bold text-center py-4', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
 No components match your search
 </p>
 ) : (
 filteredBlocks.map((block) => {
 const Icon = block.icon
 return (
 <button
 key={block.type}
 onClick={() => addToDynamicZone(block.type)}
 aria-label={`Add ${block.title} to dynamic zone`}
 className={cn(
 'w-full flex items-center gap-3 p-3 rounded-none border transition-all text-left',
 theme === 'dark'
 ? 'bg-white/[0.01] border-white/[0.08] hover:border-emerald-500/30 hover:bg-emerald-500/5'
 : 'bg-gray-50 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
 )}
 >
 <div className="w-8 h-8 rounded-none bg-emerald-500/10 flex items-center justify-center shrink-0">
 <Icon size={14} className="text-emerald-600 dark:text-emerald-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-black uppercase truncate">{block.title}</p>
 <p className={cn('text-[10px] font-bold truncate', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
 {block.description}
 </p>
 </div>
 <PlusCircle size={14} aria-hidden="true" className="text-emerald-600 dark:text-emerald-500 opacity-50 shrink-0" />
 </button>
 )
 })
 )}
 </div>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 )
}
