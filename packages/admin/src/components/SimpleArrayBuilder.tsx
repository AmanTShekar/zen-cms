import React, { useState, useCallback } from 'react'
import {
 Plus,
 GripVertical,
 Trash2,
 ChevronDown,
 ArrowUp,
 ArrowDown,
 Copy,
 Layers,
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { cn, uid } from '../lib/utils'

interface FieldConfig {
 name: string
 label?: string
 type: string
 required?: boolean
 [key: string]: any
}

interface SimpleArrayBuilderProps {
 value?: any[]
 onChange: (value: any[]) => void
 fields: FieldConfig[]
 label: string
 renderField: (
 field: FieldConfig,
 value: any,
 onChange: (val: any) => void
 ) => React.ReactNode
 disabled?: boolean
}

const SimpleArrayBuilder: React.FC<SimpleArrayBuilderProps> = ({
 value = [],
 onChange,
 fields,
 label,
 renderField,
 disabled = false,
}) => {
 const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

 // Ensure every item has an internal `_id` for Framer Motion Reorder tracking
 const items = React.useMemo(() => {
 return value.map((item, idx) => ({
 ...item,
 _id: (item as any)._id || `array_item_${uid()}_${idx}`
 }))
 }, [value])

 const toggleItem = (id: string) => {
 setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
 }

 const expandAll = () => {
 const next: Record<string, boolean> = {}
 items.forEach((item) => { next[item._id as string] = true })
 setExpandedIds(next)
 }

 const collapseAll = () => {
 setExpandedIds({})
 }

 const addItem = useCallback(() => {
 const newId = `array_item_${uid()}`
 const newItem: any = { _id: newId, id: newId }
 fields.forEach((f) => {
 if (f.defaultValue !== undefined) {
 newItem[f.name] = f.defaultValue
 }
 })
 onChange([...value, newItem])
 setExpandedIds((prev) => ({ ...prev, [newId]: true }))
 }, [value, fields, onChange])

 const removeItem = useCallback((index: number) => {
 const next = [...value]
 next.splice(index, 1)
 onChange(next)
 }, [value, onChange])

 const duplicateItem = useCallback((index: number) => {
 const next = [...value]
 const newId = `array_item_${uid()}`
 const dupItem = { ...value[index], _id: newId, id: newId }
 next.splice(index + 1, 0, dupItem)
 onChange(next)
 setExpandedIds((prev) => ({ ...prev, [newId]: true }))
 }, [value, onChange])

 const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
 if (direction === 'up' && index === 0) return
 if (direction === 'down' && index === value.length - 1) return
 const next = [...value]
 const targetIndex = direction === 'up' ? index - 1 : index + 1
 const temp = next[index]
 next[index] = next[targetIndex]
 next[targetIndex] = temp
 onChange(next)
 }, [value, onChange])

 const updateItem = useCallback((index: number, updates: any) => {
 const next = [...value]
 next[index] = { ...next[index], ...updates }
 onChange(next)
 }, [value, onChange])

 return (
 <div className="flex flex-col gap-4 pl-5 select-none">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <Layers size={16} strokeWidth={2} className="text-z-secondary " />
 <span className="text-sm font-semibold text-z-primary">
 {label}
 </span>
 <span className="px-1.5 py-0.5 text-sm font-semibold bg-z-border/15 text-z-secondary  border border-z-border/25 rounded-none-none">
 {value.length}
 </span>
 </div>
 
 <div className="flex items-center gap-2">
 {value.length > 0 && (
 <div className="flex items-center gap-1.5 border border-z-border bg-z-panel p-0.5 rounded-none-none mr-2">
 <button type="button" onClick={expandAll} className="px-2.5 py-1 text-sm font-semibold text-z-muted hover:text-z-primary transition-all hover:bg-z-panel/[0.05]">Expand All</button>
 <div className="w-px h-3 bg-z-panel/10" />
 <button type="button" onClick={collapseAll} className="px-2.5 py-1 text-sm font-semibold text-z-muted hover:text-z-primary transition-all hover:bg-z-panel/[0.05]">Collapse All</button>
 </div>
 )}
 {!disabled && (
 <button
 type="button"
 onClick={addItem}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-z-accent  text-z-primary text-sm font-semibold hover:bg-z-border transition-all shadow-sm shadow-[var(--z-border)] rounded-none-none"
 >
 <Plus size={11} strokeWidth={2} /> Add Component
 </button>
 )}
 </div>
 </div>

 {/* List */}
 <Reorder.Group axis="y" values={items} onReorder={(reordered) => onChange(reordered.map(item => { const { _id, ...rest } = item; return rest }))} className="space-y-3">
 <AnimatePresence initial={false}>
 {items.map((item, index) => {
 const itemKey = item._id as string
 const isExpanded = !!expandedIds[itemKey]
 
 // Generate a simple preview text from the first string field if available
 const previewText = (() => {
 for (const f of fields) {
 if (['text', 'string'].includes(f.type) && typeof item[f.name] === 'string') {
 return item[f.name]
 }
 }
 return `Component ${index + 1}`
 })()

 return (
 <motion.div
 key={itemKey}
 initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 exit={{ opacity: 0, height: 0 }}
 transition={{ duration: 0.2 }}
 >
 <Reorder.Item
 value={item}
 drag={!disabled ? 'y' : false}
 whileDrag={{ scale: 1.01, zIndex: 50, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
 className={cn(
 'group relative bg-app border rounded-none-none overflow-visible shadow-sm transition-colors duration-150',
 isExpanded ? 'border-z-border/60 shadow-sm' : 'border-border hover:border-z-border'
 )}
 >
 {/* Index Badge */}
 <div className={cn(
 'absolute -left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-none-none flex items-center justify-center text-sm font-semibold border z-10 transition-all',
 isExpanded
 ? 'bg-z-border text-z-primary border-z-border shadow-sm'
 : 'bg-app text-z-muted border-border group-hover:border-z-border/40 group-hover:text-z-secondary '
 )}>
 {index + 1}
 </div>

 {/* Accent bar when expanded */}
 {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-z-border rounded-none-l" />}

 {/* Header Row */}
 <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer" onClick={() => toggleItem(itemKey)}>
 {!disabled && (
 <div className="p-1 text-z-muted/30 hover:text-z-muted cursor-grab active:cursor-grabbing flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
 <GripVertical size={13} />
 </div>
 )}

 {/* Labels */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-z-primary truncate">
 {previewText}
 </span>
 </div>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
 {!disabled && (
 <>
 <button type="button" onClick={() => moveItem(index, 'up')} disabled={index === 0} title="Move Up" className="p-1.5 text-z-muted hover:text-z-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ArrowUp size={11} /></button>
 <button type="button" onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1} title="Move Down" className="p-1.5 text-z-muted hover:text-z-primary disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ArrowDown size={11} /></button>
 <button type="button" onClick={() => duplicateItem(index)} title="Duplicate" className="p-1.5 text-z-muted hover:text-z-secondary  transition-colors"><Copy size={11} /></button>
 <button type="button" onClick={() => removeItem(index)} title="Remove" className="p-1.5 text-z-muted hover:text-danger transition-colors"><Trash2 size={11} /></button>
 </>
 )}
 <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="p-1.5 text-z-muted/50 ml-0.5">
 <ChevronDown size={13} />
 </motion.div>
 </div>
 </div>

 {/* Expanded Fields */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
 className="overflow-hidden"
 >
 <div className="px-5 pb-6 pt-4 border-t border-border bg-z-panel/[0.05]/40">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {fields.map((f) => {
 const fullWidth = ['richtext','textarea','blocks','array','media','code','collapsible'].includes(f.type)
 return (
 <div key={f.name} className={cn('flex flex-col gap-1.5', fullWidth && 'col-span-2')}>
 <label className="text-sm font-semibold text-z-muted flex items-center gap-1">
 {f.label || f.name}
 {f.required && <span className="text-danger">*</span>}
 </label>
 {renderField(f as any as FieldConfig, item[f.name], (val: any) => updateItem(index, { [f.name]: val }))}
 </div>
 )
 })}
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </Reorder.Item>
 </motion.div>
 )
 })}
 </AnimatePresence>
 </Reorder.Group>

 {/* Empty State / Add Button */}
 {!disabled && (
 <motion.button
 layout
 type="button"
 onClick={addItem}
 className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-border text-z-muted/60 text-sm font-semibold hover:border-z-border/50 hover:text-z-secondary  hover:bg-z-hover transition-all rounded-none-none"
 >
 <Plus size={11} strokeWidth={2} /> Add {label}
 </motion.button>
 )}
 </div>
 )
}

export default SimpleArrayBuilder
