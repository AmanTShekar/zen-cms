/* eslint-disable */
import React, { useState } from 'react'
import { Plus, Trash2, Settings2, HelpCircle, GripVertical } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { LexicalRichTextEditor } from '../../components/lexical'
import MediaPicker from '../../components/MediaPicker'
import { InlineRelationPicker } from './components/InlineRelationPicker'
import { NestedDynamicZone } from './components/NestedDynamicZone'
import { humanize, type FieldDefinition } from './constants'
import { getFieldComponent } from './fieldRegistry'
import { useEditorStore } from '../../store/editorStore'
import { useModalStore } from '../../store/modalStore'
import { cn, uid } from '../../lib/utils'
import { useShallow } from 'zustand/react/shallow'

interface FieldRendererProps {
 blockId: string
 field: FieldDefinition
 value: any
 onChange: (value: any) => void
 onFieldSelect?: (blockId: string, fieldKey: string) => void
 theme: 'light' | 'dark'
 error?: string
}

// ── Date helper utilities ───────────────────────────────────────────────────
function formatDateForInput(value: string, format: 'date' | 'datetime' | 'time'): string {
 if (!value) return ''
 try {
 const d = new Date(value)
 if (isNaN(d.getTime())) return value
 if (format === 'datetime') {
 // datetime-local expects YYYY-MM-DDTHH:MM
 return d.toISOString().slice(0, 16)
 }
 if (format === 'time') {
 return d.toISOString().slice(11, 16)
 }
 return d.toISOString().slice(0, 10)
 } catch {
 return value
 }
}

function parseInputDate(value: string, format: 'date' | 'datetime' | 'time'): string {
 if (!value) return ''
 // For date and datetime, store ISO string; for time, store HH:MM
 if (format === 'time') return value
 try {
 return new Date(value).toISOString()
 } catch {
 return value
 }
}

/** Returns true if valid JSON, false if invalid, null if empty/undefined */
function tryParseJson(value: any): boolean | null {
 if (value === undefined || value === null || value === '') return null
 const str = typeof value === 'string' ? value : JSON.stringify(value)
 try {
 JSON.parse(str)
 return true
 } catch {
 return false
 }
}

const ReorderableArrayItem = React.memo(({ item, idx, theme, onRemove, onChange, field, blockId }: any) => {
 const dragControls = useDragControls()
 return (
 <Reorder.Item key={item._id || idx} value={item._id || idx} dragListener={false} dragControls={dragControls} as="div">
 <div
 className={cn(
 'p-3 border rounded-none-none relative transition-all group/item',
 theme === 'dark'
 ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.08]'
 : 'bg-gray-50 border-gray-155 hover:border-gray-300 shadow-sm'
 )}
 >
 <div className="flex items-center gap-2 mb-2">
 <div onPointerDown={(e) => dragControls.start(e)} className="cursor-grab">
 <GripVertical size={12} className={cn('opacity-30', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')} />
 </div>
 <span className={cn('text-[9px] font-black uppercase tracking-widest ', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
 #{idx + 1}
 </span>
 <button
 type="button"
 onClick={() => onRemove(idx)}
 aria-label="Remove item"
 className={cn(
 'ml-auto p-1 transition-colors',
 'opacity-0 group-hover/item:opacity-100',
 theme === 'dark' ? 'text-red-500/50 hover:text-red-400' : 'text-red-400/50 hover:text-red-600'
 )}
 >
 <Trash2 size={12} />
 </button>
 </div>
 <div className="space-y-3">
 {field.fields?.map((subField: any) => (
 <div key={subField.name} className="space-y-1">
 <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
 {humanize(subField.name)}
 </label>
 <FieldRenderer
 blockId={`${blockId}-array-${idx}`}
 field={subField}
 value={item[subField.name]}
 onChange={(newVal) => onChange(subField.name, newVal)}
 theme={theme}
 />
 </div>
 ))}
 </div>
 </div>
 </Reorder.Item>
 )
})

export const FieldRenderer = React.memo(({
 blockId,
 field,
 value,
 onChange,
 onFieldSelect,
 theme,
 error,
 isSelected: isSelectedProp,
}: FieldRendererProps & { isSelected?: boolean }) => {
 const { selectedFieldId, setSelectedFieldId, setSelectedField, data  } = useEditorStore(useShallow(state => ({ selectedFieldId: state.selectedFieldId, setSelectedFieldId: state.setSelectedFieldId, setSelectedField: state.setSelectedField, data: state.data })))
 const { openComponentPicker, showFieldIndicators  } = useModalStore(useShallow(state => ({ openComponentPicker: state.openComponentPicker, showFieldIndicators: state.showFieldIndicators })))
 const isSelected = !!isSelectedProp || selectedFieldId === `${blockId}:${field.name}`

 // Conditional Fields Evaluation
 if (field.admin?.condition) {
 const cond = field.admin.condition
 const targetValue = data?.[cond.field]
 let isMatch = false
 
 switch (cond.operator) {
 case 'equals': isMatch = targetValue === cond.value; break;
 case 'not_equals': isMatch = targetValue !== cond.value; break;
 case 'in': isMatch = Array.isArray(cond.value) && cond.value.includes(targetValue); break;
 case 'not_in': isMatch = Array.isArray(cond.value) && !cond.value.includes(targetValue); break;
 case 'contains': isMatch = typeof targetValue === 'string' && targetValue.includes(cond.value); break;
 case 'exists': isMatch = cond.value ? (targetValue !== undefined && targetValue !== null && targetValue !== '') : (targetValue === undefined || targetValue === null || targetValue === ''); break;
 }
 
 if (!isMatch) return null;
 }

 // Handle Array manipulation
 const handleAddArrayItem = () => {
 const list = Array.isArray(value) ? [...value] : []
 const newItem: any = { _id: uid() }
 field.fields?.forEach((subField) => {
 newItem[subField.name] = subField.type === 'array' ? [] : ''
 })
 list.push(newItem)
 onChange(list)
 }

 const handleRemoveArrayItem = (index: number) => {
 if (!Array.isArray(value)) return
 const list = value.filter((_, idx) => idx !== index)
 onChange(list)
 }

 const handleUpdateArrayItem = (index: number, subFieldName: string, subValue: any) => {
 if (!Array.isArray(value)) return
 const list = [...value]
 list[index] = {
 ...list[index],
 [subFieldName]: subValue,
 }
 onChange(list)
 }

 const renderInnerField = () => {
 // Check the pluggable registry first — allows external code to add or
 // override field types without editing this file.
 const RegisteredComponent = getFieldComponent(field.type)
 if (RegisteredComponent) {
 return (
 <RegisteredComponent
 blockId={blockId}
 field={field}
 value={value}
 onChange={onChange}
 onFieldSelect={onFieldSelect}
 theme={theme}
 error={error}
 isSelected={isSelected}
 />
 )
 }
 switch (field.type) {
 case 'media':
 return (
 <MediaPicker
 value={value}
 onChange={onChange}
 hasMany={field.hasMany}
 />
 )

 case 'richtext':
 case 'lexical':
 return (
 <LexicalRichTextEditor
 mode="full"
 value={value || ''}
 onChange={onChange}
 placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
 />
 )

 case 'email':
 return (
 <input
 type="email"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 placeholder={field.placeholder || 'Enter email address...'}
 autoComplete="email"
 className={cn(
 "w-full px-4 py-2.5 text-xs transition-all rounded-none-none",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 )

 case 'password':
 return (
 <input
 type="password"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 placeholder={field.placeholder || 'Enter password...'}
 autoComplete="new-password"
 className={cn(
 "w-full px-4 py-2.5 text-xs transition-all rounded-none-none",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 )

 case 'uid': {
 const [isAuto, setIsAuto] = React.useState(!value)
 const sourceField = field.sourceField || 'title'
 return (
 <div className="space-y-1.5">
 <div className="flex items-center gap-2">
 <input
 type="text"
 value={value || ''}
 onChange={(e) => { onChange(e.target.value); setIsAuto(false) }}
 placeholder={field.placeholder || `Auto-generated from ${sourceField}...`}
 className={cn(
 "flex-1 px-4 py-2.5 text-xs transition-all rounded-none-none font-mono",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 <button
 type="button"
 onClick={() => setIsAuto(!isAuto)}
 className={cn(
 'px-2.5 py-2.5 text-[9px] font-black uppercase border rounded-none-none transition-all shrink-0',
 isAuto
 ? 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400'
 : theme === 'dark'
 ? 'border-white/[0.08] text-gray-500 hover:text-gray-600 dark:text-gray-400'
 : 'border-gray-200 text-gray-400 hover:text-gray-600'
 )}
 title={isAuto ? 'Auto-generation enabled' : 'Enable auto-generation'}
 >
 {isAuto ? '⚡ Auto' : 'Manual'}
 </button>
 </div>
 {isAuto && (
 <p className={cn('text-[9px] font-bold px-1', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
 Will be auto-generated from the "{sourceField}" field
 </p>
 )}
 </div>
 )
 }

 case 'color': {
 const presetColors = field.options || ['#000000', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#10b981', '#10B981', '#ec4899']
 return (
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <div className="relative">
 <input
 type="color"
 value={value || '#000000'}
 onChange={(e) => onChange(e.target.value)}
 className="w-10 h-10 rounded-none-none border cursor-pointer p-0.5"
 style={{ background: 'transparent' }}
 />
 </div>
 <input
 type="text"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 placeholder="#000000"
 className={cn(
 "flex-1 px-4 py-2.5 text-xs font-mono transition-all rounded-none-none uppercase",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 </div>
 {presetColors.length > 0 && (
 <div className="flex flex-wrap gap-1.5">
 {presetColors.map((color: any) => {
 const colorVal = typeof color === 'string' ? color : color.value
 const colorLabel = typeof color === 'string' ? color : color.label
 return (
 <button
 key={colorVal}
 type="button"
 onClick={() => onChange(colorVal)}
 className={cn(
 'w-6 h-6 rounded-none-none border-2 transition-all',
 value === colorVal
 ? 'border-gray-500 scale-110'
 : theme === 'dark' ? 'border-white/[0.08] hover:border-white/30' : 'border-gray-200 hover:border-gray-400'
 )}
 style={{ backgroundColor: colorVal }}
 title={colorLabel}
 />
 )
 })}
 </div>
 )}
 </div>
 )
 }

 case 'text':
 return (
 <input
 type="text"
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
 className={cn(
 "w-full px-4 py-2.5 text-xs transition-all rounded-none-none",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 )

 case 'textarea':
 return (
 <textarea
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
 rows={4}
 className={cn(
 "w-full px-4 py-2.5 text-xs transition-all rounded-none-none resize-y",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 )

 case 'code':
 return (
 <textarea
 value={value || ''}
 onChange={(e) => onChange(e.target.value)}
 placeholder={field.placeholder || `Enter ${field.language || 'code'}...`}
 rows={8}
 spellCheck={false}
 className={cn(
 "w-full px-4 py-2.5 text-xs font-mono transition-all rounded-none-none resize-y",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-[#e6edf3]"
 : "bg-gray-900 border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-gray-100"
 )}
 />
 )

 case 'collapsible': {
 const collapsibleFields = field.fields || []
 const collapsibleVal = value && typeof value === 'object' ? value : {}
 return (
 <div className={cn(
 "border-l-2 pl-3 space-y-2",
 theme === 'dark' ? "border-gray-500/30" : "border-gray-300"
 )}>
 {collapsibleFields.map((subField) => (
 <div key={subField.name} className="space-y-1">
 <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
 {humanize(subField.name)}
 </label>
 <FieldRenderer
 blockId={`${blockId}:${field.name}`}
 field={subField}
 value={collapsibleVal[subField.name]}
 onChange={(val) => onChange({ ...collapsibleVal, [subField.name]: val })}
 theme={theme}
 />
 </div>
 ))}
 </div>
 )
 }

 case 'join':
 return (
 <div className={cn(
 "w-full px-4 py-3 border text-xs rounded-none-none",
 theme === 'dark'
 ? "bg-gray-500/5 border-gray-500/20 text-gray-300"
 : "bg-gray-50 border-gray-200 text-gray-600"
 )}>
 ⧉ Joined data — read-only
 </div>
 )

 case 'point': {
 const coords = (Array.isArray(value) && value.length === 2 && !isNaN(value[0]) && !isNaN(value[1])
 ? value
 : [0, 0]) as [number, number]
 return (
 <div className="flex gap-2">
 <div className="flex-1 space-y-1">
 <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Lng</label>
 <input
 type="number"
 value={coords[0]}
 onChange={(e) => onChange([Number(e.target.value), coords[1]])}
 step="any"
 className={cn(
 "w-full px-3 py-2 text-xs transition-all rounded-none-none",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 </div>
 <div className="flex-1 space-y-1">
 <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Lat</label>
 <input
 type="number"
 value={coords[1]}
 onChange={(e) => onChange([coords[0], Number(e.target.value)])}
 step="any"
 className={cn(
 "w-full px-3 py-2 text-xs transition-all rounded-none-none",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 </div>
 </div>
 )
 }

 case 'radio': {
 const options = field.options || []
 const isHorizontal = field.layout === 'horizontal'
 return (
 <div className={cn("flex gap-3", isHorizontal ? "flex-row flex-wrap" : "flex-col gap-1.5")}>
 {options.map((opt: string | { label: string; value: any }) => {
 const optVal = typeof opt === 'string' ? opt : opt.value
 const optLabel = typeof opt === 'string' ? opt : opt.label
 return (
 <label key={optVal} className="flex items-center gap-2 cursor-pointer">
 <input
 type="radio"
 name={`${blockId}:${field.name}`}
 value={optVal}
 checked={value == optVal}
 onChange={(e) => {
 // Preserve numeric type when option value is a number
 const nextVal = typeof optVal === 'number' ? Number(e.target.value) : e.target.value
 onChange(nextVal)
 }}
 className="w-3.5 h-3.5 accent-gray-500"
 />
 <span className={cn(
 "text-xs",
 theme === 'dark' ? "text-gray-300" : "text-gray-700"
 )}>
 {optLabel}
 </span>
 </label>
 )
 })}
 </div>
 )
 }

 case 'row': {
 const rowFields = field.fields || []
 const rowVal = value && typeof value === 'object' ? value : {}
 return (
 <div className="flex gap-2 items-end">
 {rowFields.map((subField) => (
 <div key={subField.name} className="flex-1 space-y-1">
 <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
 {humanize(subField.name)}
 </label>
 <FieldRenderer
 blockId={`${blockId}:${field.name}`}
 field={subField}
 value={rowVal[subField.name]}
 onChange={(val) => onChange({ ...rowVal, [subField.name]: val })}
 theme={theme}
 />
 </div>
 ))}
 </div>
 )
 }

 case 'ui': {
 const CustomComponent = field.admin?.components?.Field
 if (CustomComponent) {
 return <CustomComponent field={field} value={value} onChange={onChange} />
 }
 return null
 }

 case 'number':
 return (
 <input
 type="number"
 value={value ?? ''}
 onChange={(e) => {
 const val = e.target.value === '' ? '' : Number(e.target.value)
 onChange(val)
 }}
 placeholder={field.placeholder || `Enter ${humanize(field.name)}...`}
 className={cn(
 "w-full px-4 py-2.5 text-xs transition-all rounded-none-none",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 )

 case 'boolean':
 case 'checkbox':
 return (
 <label className="flex items-center gap-3 cursor-pointer py-2">
 <input
 type="checkbox"
 checked={!!value}
 onChange={(e) => onChange(e.target.checked)}
 className="w-4 h-4 rounded-none-none border border-white/[0.08] bg-white/5 checked:bg-gray-50 checked:border-gray-50 transition-all accent-gray-500"
 />
 <span className={cn(
 "text-xs font-medium",
 theme === 'dark' ? "text-gray-300" : "text-gray-700"
 )}>
 {humanize(field.name)}
 </span>
 </label>
 )

 case 'select': {
 const options = field.options || []
 const hasMany = !!field.hasMany
 const [dropdownOpen, setDropdownOpen] = React.useState(false)
 const dropdownRef = React.useRef<HTMLDivElement>(null)
 const selectedValues = hasMany
 ? (Array.isArray(value) ? value : [])
 : (value != null && value !== '' ? [value] : [])

 const getLabel = (opt: string | { label: string; value: any }) =>
 typeof opt === 'string' ? opt : opt.label
 const getVal = (opt: string | { label: string; value: any }) =>
 typeof opt === 'string' ? opt : opt.value
 const selectedLabels = selectedValues
 .map((v) => getLabel(options.find((o) => getVal(o) === v)) || String(v))
 .join(', ')

 const toggleOption = (optVal: any) => {
 if (hasMany) {
 const current = Array.isArray(value) ? [...value] : []
 const idx = current.indexOf(optVal)
 if (idx >= 0) current.splice(idx, 1); else current.push(optVal)
 onChange(current)
 } else {
 onChange(optVal)
 setDropdownOpen(false)
 }
 }

 React.useEffect(() => {
 if (!dropdownOpen) return
 const handleClick = (e: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
 setDropdownOpen(false)
 }
 }
 document.addEventListener('mousedown', handleClick)
 return () => document.removeEventListener('mousedown', handleClick)
 }, [dropdownOpen])

 return (
 <div className="relative" ref={dropdownRef}>
 <button
 type="button"
 onClick={() => setDropdownOpen(!dropdownOpen)}
 className={cn(
 'w-full px-4 py-2.5 text-xs transition-all rounded-none-none flex items-center justify-between gap-2',
 theme === 'dark'
 ? 'bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white'
 : 'bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black'
 )}
 >
 <span className={cn('truncate', !selectedValues.length && (theme === 'dark' ? 'text-gray-500' : 'text-gray-400'))}>
 {selectedLabels || 'Select option...'}
 </span>
 <svg className={cn('w-3 h-3 shrink-0 transition-transform', dropdownOpen && 'rotate-180', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
 </button>
 {dropdownOpen && (
 <div
 className={cn(
 'absolute z-50 left-0 right-0 mt-1 border shadow-xl max-h-60 overflow-y-auto',
 theme === 'dark' ? 'bg-[#0a0a0a] border-white/[0.08]' : 'bg-white border-gray-200'
 )}
 >
 {hasMany && selectedValues.length > 0 && (
 <button
 type="button"
 onClick={() => onChange([])}
 className={cn('w-full text-left px-3 py-1.5 text-[10px] font-black uppercase ', theme === 'dark' ? 'text-gray-500 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-50')}
 >Clear all</button>
 )}
 {options.map((opt: string | { label: string; value: any }) => {
 const optLabel = getLabel(opt)
 const optVal = getVal(opt)
 const isSelected = selectedValues.includes(optVal)
 return (
 <button
 key={optVal}
 type="button"
 onClick={() => toggleOption(optVal)}
 className={cn(
 'w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors',
 isSelected
 ? theme === 'dark' ? 'bg-gray-500/10 text-gray-600 dark:text-gray-400' : 'bg-gray-50 text-gray-600'
 : theme === 'dark' ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50'
 )}
 >
 <span className={cn(
 'w-3.5 h-3.5 border shrink-0 flex items-center justify-center transition-all rounded-none-none',
 isSelected
 ? 'bg-gray-500 border-gray-500'
 : theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-300'
 )}>
 {isSelected && (
 <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
 )}
 </span>
 <span className="font-bold truncate">{optLabel}</span>
 </button>
 )
 })}
 </div>
 )}
 </div>
 )
 }

 case 'relation':
 return (
 <InlineRelationPicker
 blockId={blockId}
 fieldKey={field.name}
 value={value}
 onChange={onChange}
 theme={theme}
 hasMany={field.hasMany}
 relationTo={field.relationTo}
 anchorEl={null}
 />
 )

 case 'date': {
 const dateFormat = field.dateFormat || 'date'
 const dateInputType = dateFormat === 'datetime' ? 'datetime-local' : dateFormat === 'time' ? 'time' : 'date'
 return (
 <input
 type={dateInputType}
 value={value ? formatDateForInput(value, dateFormat) : ''}
 onChange={(e) => onChange(e.target.value ? parseInputDate(e.target.value, dateFormat) : '')}
 className={cn(
 "w-full px-4 py-2.5 text-xs transition-all rounded-none-none",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-white"
 : "bg-white border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-black"
 )}
 />
 )
 }

 case 'array': {
 const items = Array.isArray(value) ? value : []
 /**
 * Transactional reorder guard:
 * Validates every item in the new order still belongs to this field
 * before committing — prevents out-of-sync state from cross-zone drops.
 */
 const handleReorder = (newItems: any[]) => {
 const origIds = new Set(items.map((item: any, idx: number) => item._id ?? idx))
 if (!newItems.every((item: any, idx: number) => origIds.has(item._id ?? idx))) return
 onChange(newItems)
 }
 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-xs font-black tracking-widest text-gray-600 dark:text-gray-400 uppercase ">
 {items.length} {items.length === 1 ? 'Item' : 'Items'}
 </span>
 <button
 type="button"
 onClick={handleAddArrayItem}
 className={cn(
 'flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase tracking-wider transition-all border',
 theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20'
 : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
 )}
 >
 <Plus size={10} /> Add Item
 </button>
 </div>

 <Reorder.Group axis="y" values={items.map((i: any, idx: number) => i._id || idx)} onReorder={(newIds) => {
 const origMap = new Map(items.map((i: any, idx: number) => [i._id || idx, i]))
 const newItems = newIds.map((id) => origMap.get(id)).filter(Boolean)
 handleReorder(newItems)
 }} className="space-y-3">
 {items.map((item: any, idx: number) => (
 <ReorderableArrayItem
 key={item._id || idx}
 item={item}
 idx={idx}
 theme={theme}
 onRemove={handleRemoveArrayItem}
 onChange={(subKey: string, val: any) => {
 const next = [...items]
 next[idx] = { ...next[idx], [subKey]: val }
 onChange(next)
 }}
 field={field}
 blockId={blockId}
 humanize={humanize}
 />
 ))}
 </Reorder.Group>
 </div>
 )
 }

 case 'group': {
 const groupVal = value && typeof value === 'object' ? value : {}
 return (
 <div className="border-l border-gray-500/20 pl-3 space-y-3">
 {field.fields?.map((subField) => (
 <div key={subField.name} className="space-y-1">
 <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
 {humanize(subField.name)}
 </label>
 <FieldRenderer
 blockId={`${blockId}:${field.name}`}
 field={subField}
 value={groupVal[subField.name]}
 onChange={(val) => onChange({ ...groupVal, [subField.name]: val })}
 theme={theme}
 />
 </div>
 ))}
 </div>
 )
 }

 case 'json': {
 const jsonValid = tryParseJson(value)
 return (
 <div className="space-y-1">
 <textarea
 value={typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? ''}
 onChange={(e) => onChange(e.target.value)}
 placeholder={field.placeholder || 'Enter JSON...'}
 rows={8}
 spellCheck={false}
 className={cn(
 "w-full px-4 py-2.5 text-xs font-mono transition-all rounded-none-none resize-y",
 theme === 'dark'
 ? "bg-black border border-white/[0.08] focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:border-gray-500 text-[#e6edf3]"
 : "bg-gray-900 border border-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500/20 focus-visible:border-gray-500 text-gray-100"
 )}
 />
 <div className="flex items-center gap-2">
 <span className={cn(
 "inline-block w-1.5 h-1.5 rounded-none-none",
 jsonValid === true ? "bg-gray-500 shadow-[0_0_6px_#10b981]" : jsonValid === false ? "bg-red-500 shadow-[0_0_6px_#ef4444]" : "bg-gray-600"
 )} />
 <span className="text-xs font-bold uppercase tracking-widest " style={{ color: jsonValid === true ? '#10b981' : jsonValid === false ? '#ef4444' : '#6b7280' }}>
 {jsonValid === true ? 'Valid JSON' : jsonValid === false ? 'Invalid JSON' : 'JSON'}
 </span>
 </div>
 </div>
 )
 }

 case 'blocks': {
 const blocks = value && Array.isArray(value) ? value : []
 const availableBlocks = field.blocks || []
 return (
 <div className="space-y-3">
 {blocks.length > 0 && (
 <div className="space-y-2">
 {blocks.map((block: any, idx: number) => {
 const blockType = block.blockType || block.__blockType
 const blockDef = availableBlocks.find((b: any) => b.slug === blockType)
 const blockFields = blockDef?.fields || []
 return (
 <div
 key={block._id || idx}
 className={cn(
 'border rounded-none-none overflow-hidden',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-gray-200'
 )}
 >
 <div className={cn(
 'flex items-center gap-2 px-3 py-2 border-b',
 theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-100/50 border-gray-200'
 )}>
 <span className={cn(
 'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border rounded-none-none',
 theme === 'dark' ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-700'
 )}>
 {blockDef?.labels?.singular || humanize(blockType || 'block')}
 </span>
 <button
 type="button"
 onClick={() => {
 const next = blocks.filter((_: any, i: number) => i !== idx)
 onChange(next)
 }}
 className="ml-auto p-1 text-gray-500 hover:text-rose-500 transition-colors"
 aria-label="Remove block"
 >
 <Trash2 size={10} />
 </button>
 </div>
 <div className="px-3 py-3 space-y-3">
 {blockFields.map((subField: FieldDefinition) => (
 <div key={subField.name} className="space-y-1">
 <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
 {subField.label || humanize(subField.name)}
 </label>
 <FieldRenderer
 blockId={`${blockId}:${field.name}:${idx}`}
 field={subField}
 value={block[subField.name]}
 onChange={(val) => {
 const next = [...blocks]
 next[idx] = { ...next[idx], [subField.name]: val }
 onChange(next)
 }}
 theme={theme}
 />
 </div>
 ))}
 </div>
 </div>
 )
 })}
 </div>
 )}
 {(!(field as any).maxRows || blocks.length < (field as any).maxRows) && (
 <button
 type="button"
 onClick={() => {
 openComponentPicker((blockType) => {
 const newBlock = { blockType, _id: uid() }
 onChange([...blocks, newBlock])
 }, availableBlocks.length > 0 ? availableBlocks : undefined)
 }}
 className={cn(
 'w-full py-2.5 border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all group rounded-none-none',
 theme === 'dark'
 ? 'border-white/[0.08] hover:border-gray-500/50 hover:bg-gray-500/5 text-gray-400 hover:text-gray-600 dark:text-gray-400'
 : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-500 hover:text-gray-600'
 )}
 >
 <div className={cn(
 'p-1.5 rounded-none-none transition-colors',
 theme === 'dark' ? 'bg-white/5 group-hover:bg-gray-500/20' : 'bg-gray-100 group-hover:bg-gray-100'
 )}>
 <Plus size={14} className="stroke-[3]" />
 </div>
 <span className="text-[10px] font-black uppercase tracking-widest ">
 Add Block
 </span>
 </button>
 )}
 </div>
 )
 }

 case 'tabs': {
 const tabs = field.tabs || []
 const [activeTab, setActiveTab] = useState(0)
 const tabData = value && typeof value === 'object' ? value : {}
 return (
 <div className="space-y-3">
 {tabs.length > 1 && (
 <div className={cn(
 'flex gap-0.5 p-0.5 rounded-none-none border',
 theme === 'dark' ? 'bg-black/20 border-white/[0.08]' : 'bg-gray-100 border-gray-200'
 )}>
 {tabs.map((tab: any, idx: number) => (
 <button
 key={tab.label || idx}
 type="button"
 onClick={() => setActiveTab(idx)}
 className={cn(
 'px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all',
 activeTab === idx
 ? theme === 'dark'
 ? 'bg-white/10 text-white'
 : 'bg-white text-black shadow-sm'
 : theme === 'dark'
 ? 'text-gray-500 hover:text-white'
 : 'text-gray-400 hover:text-black'
 )}
 >
 {tab.label || `Tab ${idx + 1}`}
 </button>
 ))}
 </div>
 )}
 {tabs[activeTab] && (
 <div className="space-y-3">
 {tabs[activeTab].fields?.map((subField: FieldDefinition) => (
 <div key={subField.name} className="space-y-1">
 <label className="text-xs font-black text-gray-400 uppercase tracking-widest block">
 {subField.label || humanize(subField.name)}
 </label>
 <FieldRenderer
 blockId={`${blockId}:${field.name}`}
 field={subField}
 value={tabData[subField.name]}
 onChange={(val) => onChange({ ...tabData, [subField.name]: val })}
 theme={theme}
 />
 </div>
 ))}
 </div>
 )}
 </div>
 )
 }

 case 'dz':
 return (
 <NestedDynamicZone
 blockId={blockId}
 fieldName={field.name}
 value={value || []}
 onChange={onChange}
 theme={theme}
 components={field.components || []}
 />
 )

 default:
 return (
 <div className="flex items-center gap-2 p-2 border border-dashed border-red-500/30 text-red-400 text-xs">
 <HelpCircle size={14} /> Unsupported field type: {field.type}
 </div>
 )
 }
 }

 return (
 <div
 className={cn(
 'stega-field-wrapper relative transition-all duration-200',
 showFieldIndicators && 'group/field',
 isSelected && 'field-selected'
 )}
 onClick={(e) => {
 e.stopPropagation()
 if (onFieldSelect) {
 onFieldSelect(blockId, field.name)
 } else {
 setSelectedField({ blockId, fieldKey: field.name })
 }
 useEditorStore.getState().setActiveSection(blockId)
 }}
 style={{ padding: showFieldIndicators ? '2px' : 0 }}
 >
 {showFieldIndicators && (
 <div className="stega-field-indicator">
 {isSelected ? <Settings2 size={10} /> : <span className="text-[7px]">⚡</span>}
 </div>
 )}
 {field.description && (
 <p className={cn('text-[11px] font-medium mt-0.5 mb-1', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
 {field.description}
 </p>
 )}
 {renderInnerField()}
 {error && (
 <p className="text-xs text-red-500 mt-1" role="alert" aria-live="polite">{error}</p>
 )}
 </div>
 )
}, (prev, next) => {
 if (prev.value !== next.value) return false
 if (prev.error !== next.error) return false
 if (prev.theme !== next.theme) return false
 if (prev.field !== next.field) return false
 if (prev.isSelected !== next.isSelected) return false
 return true
})

export default FieldRenderer

