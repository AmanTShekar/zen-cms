import React, { useRef, useState, useMemo } from 'react'
import { Layers, X, GripVertical, Layout, Trash2, PlusCircle, Box, Search } from 'lucide-react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { useShallow } from 'zustand/react/shallow'
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
 'flex items-center gap-3 p-3 rounded-none-none border group',
 theme === 'dark'
 ? 'bg-z-hover border-z-border hover:border-z-border/20'
 : 'bg-z-input border-z-border hover:border-z-border'
 )}
 >
 <div
 onPointerDown={(e) => dragControls.start(e)}
 className="cursor-grab active:cursor-grabbing shrink-0"
 >
 <GripVertical size={12} className="text-z-secondary" />
 </div>
 <div className="w-6 h-6 rounded-none-none bg-z-panel flex items-center justify-center shrink-0">
 <Layout size={12} className="text-z-secondary" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold truncate">
 {humanize(item.__component?.replace('content.', '') || item.__component || 'Component')}
 </p>
 </div>
 <button
 type="button"
 onClick={() => removeFromDynamicZone(idx)}
 aria-label={`Remove component ${idx + 1}`}
 className="p-1 text-z-secondary hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
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
 const { data: dataRaw } = useEditorStore(useShallow(state => ({ data: state.data })))
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
 className="absolute inset-0 bg-app/70 backdrop-blur-md"
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
 theme === 'dark' ? 'bg-[#060606] border-z-border' : 'bg-z-panel border-z-border'
 )}
 >
 <div className={cn(
 'p-6 border-b flex items-center justify-between',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-none-none bg-z-accent/20 border border-z-border/30 flex items-center justify-center">
 <Layers size={16} className="text-z-secondary" />
 </div>
 <div>
 <h2
 id={modalTitleId}
 className="text-base font-semibold text-z-secondary leading-none"
 >
 Dynamic Zone
 </h2>
 <p className="text-xs text-z-secondary font-bold mt-1">
 Add/arrange component blocks
 </p>
 </div>
 </div>
 <button
 type="button"
 onClick={() => setDynamicZoneModalOpen(false)}
 aria-label="Close"
 className={cn(
 'p-1.5 rounded-none-none border transition-all',
 theme === 'dark'
 ? 'bg-z-hover border-z-border hover:bg-z-panel hover:text-z-primary'
 : 'bg-[var(--z-bg-hover)] border-z-border hover:bg-app hover:text-z-primary'
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
 <p className="text-xs font-semibold text-z-secondary px-1">
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
 <Box size={24} className="mx-auto text-z-secondary mb-2" />
 <p className="text-xs text-z-secondary font-bold">
 Zone is empty — add components below
 </p>
 </div>
 )
 })()
 )}

 {/* Add Components */}
 <div className="space-y-2">
 <p className="text-xs font-semibold text-z-secondary px-1">
 Available Components
 </p>
 <div className="relative">
 <Search size={12} className={cn(
 'absolute left-3 top-1/2 -translate-y-1/2',
 'text-z-secondary'
 )} />
 <input
 type="text"
 value={componentSearch}
 onChange={(e) => setComponentSearch(e.target.value)}
 placeholder="Search components..."
 className={cn(
 'w-full pl-8 pr-3 py-2 text-xs font-bold border rounded-none-none bg-transparent',
 theme === 'dark'
 ? 'border-z-border text-z-primary placeholder:text-z-muted focus:border-z-border/30'
 : 'border-z-border text-z-primary placeholder:text-z-muted focus:border-z-border/30'
 )}
 />
 </div>
 <div className="max-h-64 overflow-y-auto space-y-1.5 custom-editor-scrollbar">
 {filteredBlocks.length === 0 ? (
 <p className={cn('text-xs font-bold text-center py-4', 'text-z-secondary')}>
 No components match your search
 </p>
 ) : (
 filteredBlocks.map((block) => {
 const Icon = block.icon
 return (
 <button
 key={block.type}
 type="button"
 onClick={() => addToDynamicZone(block.type)}
 aria-label={`Add ${block.title} to dynamic zone`}
 className={cn(
 'w-full flex items-center gap-3 p-3 rounded-none-none border transition-all text-left',
 theme === 'dark'
 ? 'bg-z-panel border-z-border hover:border-z-border/30 hover:bg-z-hover'
 : 'bg-z-input border-z-border hover:border-z-border-strong hover:bg-[var(--z-bg-input)]'
 )}
 >
 <div className="w-8 h-8 rounded-none-none bg-z-panel flex items-center justify-center shrink-0">
 <Icon size={14} className="text-z-secondary" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold truncate">{block.title}</p>
 <p className={cn('text-sm font-bold truncate', 'text-z-secondary')}>
 {block.description}
 </p>
 </div>
 <PlusCircle size={14} aria-hidden="true" className="text-z-secondary  opacity-50 shrink-0" />
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
