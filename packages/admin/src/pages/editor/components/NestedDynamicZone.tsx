import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { Layers, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Layout } from 'lucide-react'
import { useEditorBlocks } from '../../../context/BlockLibraryContext'
import { useModalStore } from '../../../store/modalStore'
import { humanize, type FieldDefinition } from '../constants'
import { FieldRenderer } from '../FieldRenderer'
import { cn } from '../../../lib/utils'
import { useShallow } from 'zustand/react/shallow'

interface NestedDynamicZoneProps {
 blockId: string
 fieldName: string
 value: any[]
 onChange: (items: any[]) => void
 theme: 'light' | 'dark'
 components?: string[]
 onOpenDynamicZone?: (componentType: string) => void
}

const DraggableZoneItem = ({ 
 item, idx, theme, dzId, isExpanded, toggleExpand, removeItem, def, blockId, fieldName, updateItem 
}: any) => {
 const dragControls = useDragControls()
 const componentLabel = def?.title || humanize((item.__component || '').replace(/^content\./, ''))
 const BlockIcon = def?.icon || Layout

 return (
 <Reorder.Item
 value={item}
 dragListener={false}
 dragControls={dragControls}
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{ duration: 0.15 }}
 as="div"
 className={cn(
 'border rounded-none-none overflow-hidden',
 theme === 'dark' ? 'bg-z-panel border-z-border' : 'bg-z-input border-z-border'
 )}
 >
 <div
 className={cn(
 'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
 theme === 'dark' ? 'bg-z-panel hover:bg-z-hover' : 'bg-[var(--z-bg-hover)]/50 hover:bg-[var(--z-bg-hover)]'
 )}
 onClick={() => toggleExpand(dzId)}
 >
 <div 
 onPointerDown={(e) => dragControls.start(e)}
 className="shrink-0 cursor-grab active:cursor-grabbing p-1"
 onClick={(e) => e.stopPropagation()}
 >
 <GripVertical size={12} className="text-z-secondary" />
 </div>
 <div className={cn(
 'w-5 h-5 rounded-none-none flex items-center justify-center shrink-0',
 theme === 'dark' ? 'bg-z-panel/5' : 'bg-[var(--z-bg-input)]'
 )}>
 <BlockIcon size={10} className="text-z-secondary" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold text-z-secondary truncate">
 {componentLabel}
 </p>
 </div>
 <span className={cn('text-sm font-semibold shrink-0', 'text-z-secondary')}>
 #{idx + 1}
 </span>
 <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
 <button
 onClick={() => removeItem(dzId)}
 className="p-1 text-z-secondary hover:text-rose-500 transition-colors"
 >
 <Trash2 size={12} />
 </button>
 <button
 onClick={() => toggleExpand(dzId)}
 className="p-1 text-z-secondary hover:text-z-secondary transition-colors"
 >
 {isExpanded ? <ChevronUp size={12} className="text-z-secondary" /> : <ChevronDown size={12} className="text-z-muted" />}
 </button>
 </div>
 </div>
 <AnimatePresence initial={false}>
 {isExpanded && def && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.15 }}
 className="overflow-hidden"
 >
 <div className={cn('px-4 py-4 space-y-4 border-t', 'border-z-border')}>
 {def.fields.map((field: any) => (
 <div key={field.name} className="space-y-1">
 <label className="text-xs font-semibold text-z-muted block">
 {field.label || humanize(field.name)}
 </label>
 <FieldRenderer
 blockId={`${blockId}:${fieldName}:${dzId}`}
 field={field}
 value={item[field.name]}
 onChange={(val) => updateItem(dzId, field.name, val)}
 theme={theme}
 />
 </div>
 ))}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </Reorder.Item>
 )
}


export const NestedDynamicZone: React.FC<NestedDynamicZoneProps> = ({
 blockId,
 fieldName,
 value = [],
 onChange,
 theme,
 components,
}) => {
 const BLOCK_LIBRARY = useEditorBlocks()
 const { openComponentPicker  } = useModalStore(useShallow(state => ({ openComponentPicker: state.openComponentPicker })))
 const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

 const componentTypeLabel = (type: string) =>
 humanize(type.replace(/^content\./, ''))

 const getBlockDefForItem = (item: any): import('../constants').BlockDefinition | undefined => {
 const compType = item?.__component as string | undefined
 if (!compType) return undefined
 return BLOCK_LIBRARY.find((b) => b.type === compType || b.type === compType.replace('content.', ''))
 }

 const toggleExpand = (id: string) => {
 setExpandedIds((prev) => {
 const next = new Set(prev)
 if (next.has(id)) next.delete(id)
 else next.add(id)
 return next
 })
 }

 const addItem = useCallback((type: string) => {
 const def = BLOCK_LIBRARY.find((b) => b.type === type)
 const newItem: any = {
 __component: `content.${type}`,
 ...(def?.defaultContent ? JSON.parse(JSON.stringify(def.defaultContent)) : {}),
 }
 const id = `dz_${Date.now()}_${Math.random().toString(36).slice(2)}`
 newItem._dzId = id
 const items = [...value, newItem]
 onChange(items)
 setExpandedIds((prev) => new Set([...prev, id]))
 }, [BLOCK_LIBRARY, value, onChange])

 const handleOpenPicker = useCallback(() => {
 openComponentPicker((blockType) => addItem(blockType))
 }, [openComponentPicker, addItem])

 const removeItem = (dzId: string) => {
 onChange(value.filter((item) => item._dzId !== dzId))
 }

 const updateItem = (dzId: string, key: string, val: any) => {
 onChange(
 value.map((item) =>
 item._dzId === dzId ? { ...item, [key]: val } : item
 )
 )
 }

 const handleReorder = (newItems: any[]) => {
 onChange(newItems)
 }

 const availableComponents = components && components.length > 0
 ? BLOCK_LIBRARY.filter((b) => components.includes(b.type))
 : BLOCK_LIBRARY

 return (
 <div className="space-y-3">
 {/* Zone label */}
 <div className="flex items-center gap-2 px-1">
 <Layers size={10} className="text-z-secondary" />
 <span className="text-xs font-semibold text-z-secondary">
 Dynamic Zone
 </span>
 <span className="text-xs text-z-secondary">— {value.length} component{value.length !== 1 ? 's' : ''}</span>
 </div>

 {/* Items with drag-and-drop reorder */}
 {value.length === 0 ? (
 <div className={cn(
 'py-5 text-center border border-dashed rounded-none-none',
 'border-z-border text-z-secondary'
 )}>
 <p className="text-xs font-bold">No components — add one below</p>
 </div>
 ) : (
 <Reorder.Group axis="y" values={value} onReorder={handleReorder} className="space-y-2">
 <AnimatePresence initial={false}>
 {value.map((item, idx) => {
 const dzId = item._dzId || `dz_${idx}`
 const isExpanded = expandedIds.has(dzId)
 const def = getBlockDefForItem(item)
 return (
 <DraggableZoneItem
 key={dzId}
 item={item}
 idx={idx}
 theme={theme}
 dzId={dzId}
 isExpanded={isExpanded}
 toggleExpand={toggleExpand}
 removeItem={removeItem}
 def={def}
 blockId={blockId}
 fieldName={fieldName}
 updateItem={updateItem}
 />
 )
 })}
 </AnimatePresence>
 </Reorder.Group>
 )}

 {/* Add Component — opens global picker modal */}
 <button
 type="button"
 onClick={handleOpenPicker}
 className={cn(
 'w-full flex items-center justify-center gap-2 py-2.5 border border-dashed rounded-none-none transition-all text-xs font-semibold  ',
 theme === 'dark'
 ? 'border-z-border text-z-secondary hover:border-z-border/40 hover:text-z-secondary hover:bg-z-hover'
 : 'border-z-border text-z-muted hover:border-z-border hover:text-z-secondary hover:bg-[var(--z-bg-input)]/50'
 )}
 >
 <Plus size={12} />
 Add Component
 {availableComponents.length > 0 && (
 <span className={cn('text-sm font-semibold ml-1', 'text-z-secondary')}>
 ({availableComponents.length} available)
 </span>
 )}
 </button>
 </div>
 )
}

export default NestedDynamicZone
