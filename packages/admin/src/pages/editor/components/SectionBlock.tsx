import React from 'react'
import { createPortal } from 'react-dom'
import { Grip, Copy, Trash2, AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronRight, MoreHorizontal, ArrowUp, ArrowDown, Clipboard, ClipboardPaste, Edit3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../../lib/utils'
import { useEditorBlocks } from '../../../context/BlockLibraryContext'
import { useEditorStore } from '../../../store/editorStore'
import { type Section, type FieldDefinition, humanize } from '../constants'
import { FieldRenderer } from '../FieldRenderer'

interface SectionBlockProps {
 section: Section
 index: number
 totalSections: number
 isActive: boolean
 isMultiSelected?: boolean
 onSelect: (e?: React.MouseEvent) => void
 onDuplicate: () => void
 onDelete: () => void
 onAlign: (align: 'left' | 'center' | 'right') => void
 onFieldChange: (fieldKey: string, value: any) => void
 onToggleCollapse: () => void
 onMoveUp: () => void
 onMoveDown: () => void
 onCopy: () => void
 onPaste: () => void
 onBlockNameChange: (name: string) => void
 theme: 'light' | 'dark'
 showFieldIndicators?: boolean
 selectedField?: { blockId: string; fieldKey: string } | null
 schemaFields?: any[]
 fieldErrors?: Record<string, string>
 onFieldSelect?: (blockId: string, fieldKey: string) => void
 i18nEnabled?: boolean
 currentLocale?: string
 getTranslatedValue?: (sectionId: string, fieldKey: string, defaultValue: any) => any
 setTranslatedValue?: (sectionId: string, fieldKey: string, value: any) => void
 onAddToDynamicZone?: (sectionId: string, fieldKey: string) => void
 dragControls?: any
 onContextMenu?: (e: React.MouseEvent) => void
}

const detectFieldType = (key: string, value: any): 'text' | 'richtext' | 'media' | 'array' | 'group' | 'number' | 'boolean' | 'select' | 'relation' => {
 const k = key.toLowerCase()
 if (k.includes('image') || k.includes('photo') || k.includes('thumbnail') || k.includes('cover') || k.includes('banner') || k.includes('logo')) {
 return 'media'
 }
 if (k.includes('content') || k.includes('description') || k.includes('bio') || (typeof value === 'string' && value.length > 200)) {
 return 'richtext'
 }
 if (Array.isArray(value)) {
 return 'array'
 }
 if (typeof value === 'object' && value !== null) {
 return 'group'
 }
 return 'text'
}

export const SectionBlock: React.FC<SectionBlockProps> = ({
 section,
 index,
 totalSections,
 isActive,
 isMultiSelected = false,
 onSelect,
 onDuplicate,
 onDelete,
 onAlign,
 onFieldChange,
 onToggleCollapse,
 onMoveUp,
 onMoveDown,
 onCopy,
 onPaste,
 onBlockNameChange,
 onFieldSelect,
 theme,
 showFieldIndicators,
 selectedField,
 schemaFields,
 fieldErrors = {},
 i18nEnabled,
 currentLocale,
 getTranslatedValue,
 setTranslatedValue,
 onAddToDynamicZone,
 dragControls,
 onContextMenu,
}) => {
 const BLOCK_LIBRARY = useEditorBlocks()
 const blockDef = BLOCK_LIBRARY.find((b) => b.type === section.blockType)
 const [menuOpen, setMenuOpen] = React.useState(false)
 const menuRef = React.useRef<HTMLDivElement>(null)
 const menuAnchorRef = React.useRef<HTMLButtonElement>(null)
 const [menuPos, setMenuPos] = React.useState<{ top: number; left: number } | null>(null)
 const [editingBlockName, setEditingBlockName] = React.useState(false)
 const blockNameInputRef = React.useRef<HTMLInputElement>(null)

 // Global undo/redo available via Ctrl+Z / Ctrl+Y (see EditorToolbar for step-count badge)
 const { undo: _globalUndo, redo: _globalRedo } = useEditorStore()

 // Close menu on outside click
 React.useEffect(() => {
 if (!menuOpen) return
 const handleClick = (e: MouseEvent) => {
 if (menuAnchorRef.current?.contains(e.target as Node)) return // let the button toggle
 if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
 setMenuOpen(false)
 }
 }
 document.addEventListener('mousedown', handleClick)
 return () => document.removeEventListener('mousedown', handleClick)
 }, [menuOpen])

 const handleFieldChange = (key: string, value: any) => {
 onFieldChange(key, value)
 }

 const isCallout = section.blockType === 'callout'
 const calloutType = section.content?.type || 'info'
 const calloutClasses = isCallout
 ? {
 info: 'border-l-4 border-l-sky-500 bg-sky-500/5',
 warning: 'border-l-4 border-l-amber-500 bg-amber-500/5',
 success: 'border-l-4 border-l-emerald-500 bg-emerald-500/5',
 error: 'border-l-4 border-l-rose-500 bg-rose-500/5',
 }[calloutType as 'info' | 'warning' | 'success' | 'error'] || 'border-l-4 border-l-sky-500 bg-sky-500/5'
 : ''

 const blockTheme = section.content?.theme || 'default'
 const blockPaddingY = section.content?.paddingY || 'medium'
 const blockWidth = section.content?.containerWidth || 'boxed'
 const anchorId = section.content?.anchorId || undefined

 const themeClasses = {
 default: '',
 light: 'bg-white/90 text-black border-gray-200 shadow-sm',
 dark: 'bg-black/90 text-white border-white/[0.08] shadow-lg',
 'cyber-emerald': 'bg-gradient-to-br from-emerald-950/70 via-emerald-900/50 to-black/80 text-white border-emerald-500/20 shadow-emerald-500/5',
 glassmorphic: 'bg-gray-900/65 backdrop-blur-[12px] border-white/8 shadow-[0_4px_30px_rgba(0,0,0,0.1)] text-white'
 }[blockTheme as 'default' | 'light' | 'dark' | 'cyber-emerald' | 'glassmorphic'] || ''

 const paddingClasses = {
 none: 'py-2 px-6',
 small: 'py-6 px-6',
 medium: 'py-12 px-6',
 large: 'py-20 px-8'
 }[blockPaddingY as 'none' | 'small' | 'medium' | 'large'] || 'py-6 px-6'

 const widthClasses = {
 boxed: 'max-w-6xl mx-auto',
 'full-width': 'w-full'
 }[blockWidth as 'boxed' | 'full-width'] || ''

 // Count errors for this section
 const sectionErrorCount = Object.keys(fieldErrors).filter((k) => k.startsWith(section.id + ':')).length

 // Get field definitions
 const fieldsToRender: FieldDefinition[] = React.useMemo(() => {
 if (blockDef?.fields) {
 return blockDef.fields
 }
 return Object.keys(section.content || {}).map((key) => {
 const val = section.content[key]
 return {
 name: key,
 type: detectFieldType(key, val),
 label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim(),
 }
 })
 }, [blockDef, section.content])

 const regularFieldCount = React.useMemo(() => (
 fieldsToRender.filter(f =>
 f.name !== 'content' && f.name !== 'description' && f.name !== 'bio' && f.type !== 'richtext'
 ).length
 ), [fieldsToRender])

 const isCollapsed = section.collapsed ?? false

 const handleBlockNameKeyDown = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter') {
 setEditingBlockName(false)
 }
 }

 return (
 <div
 id={anchorId || section.id}
 onClick={onSelect}
 onContextMenu={onContextMenu}
 className={cn(
 'rounded-none border transition-all duration-500 relative cursor-pointer',
 calloutClasses,
 themeClasses || (theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08] hover:border-white/[0.08]' : 'bg-white border-gray-100 hover:border-gray-200'),
 isActive && 'ring-2 ring-emerald-500/50 scale-[1.005]',
 isMultiSelected && !isActive && 'ring-2 ring-amber-500/40'
 )}
 >
 {/* Section Header — always visible, even when collapsed */}
 <div
 className={cn(
 'flex items-center justify-between px-6 py-3 border-b select-none',
 isCollapsed ? 'border-b-0' : '',
 theme === 'dark' ? 'border-white/[0.03] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'
 )}
 >
 <div className="flex items-center gap-3 min-w-0">
 {/* Drag handle */}
 <div
 onPointerDown={(e) => dragControls && dragControls.start(e)}
 title="Drag to reorder"
 role="presentation"
 aria-hidden="true"
 className={cn(
 'w-7 h-7 rounded-none border flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 transition-all',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-emerald-400/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400'
 : 'bg-gray-100 border-gray-200 text-emerald-500/60 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600'
 )}
 >
 <Grip size={12} aria-hidden="true" />
 </div>

 {/* Index badge */}
 <span className={cn(
 'text-[10px] font-black leading-none w-5 text-center',
 theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
 )}>
 {String(index + 1).padStart(2, '0')}
 </span>

 {/* Block type pill — human-readable */}
 <span className={cn(
 'px-2 py-0.5 text-[8px] font-black uppercase tracking-wider border shrink-0',
 theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
 )}>
 {humanize(section.blockType)}
 </span>

 {/* Block name (editable) */}
 {editingBlockName ? (
 <input
 ref={blockNameInputRef}
 autoFocus
 value={section.blockName || ''}
 onChange={(e) => onBlockNameChange(e.target.value)}
 onBlur={() => setEditingBlockName(false)}
 onKeyDown={handleBlockNameKeyDown}
 onClick={(e) => e.stopPropagation()}
 className={cn(
 'text-xs font-black uppercase bg-transparent border-b px-1 min-w-[80px] max-w-[200px]',
 theme === 'dark' ? 'text-white border-white/[0.08]' : 'text-black border-gray-300'
 )}
 placeholder="Block name..."
 />
 ) : (
 <span
 onClick={(e) => {
 e.stopPropagation()
 setEditingBlockName(true)
 setTimeout(() => blockNameInputRef.current?.focus(), 0)
 }}
 className={cn(
 'text-xs font-black uppercase truncate cursor-text px-1 flex items-center gap-1.5',
 section.blockName
 ? theme === 'dark' ? 'text-white' : 'text-black'
 : theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
 )}
 >
 {section.blockName || 'Add name...'}
 <Edit3 size={10} className="opacity-0 group-hover/item:opacity-40 transition-opacity" />
 </span>
 )}

 {/* Error pill */}
 {sectionErrorCount > 0 && (
 <span className="px-1.5 py-0.5 text-[8px] font-black uppercase bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
 {sectionErrorCount} error{sectionErrorCount !== 1 ? 's' : ''}
 </span>
 )}
 </div>

 <div className="flex items-center gap-0.5 shrink-0">
 {/* Collapse toggle */}
 <button
 onClick={(e) => { e.stopPropagation(); onToggleCollapse() }}
 className={cn(
 'p-1.5 rounded-none border transition-all',
 theme === 'dark' ? 'text-gray-500 border-transparent hover:text-emerald-400' : 'text-gray-400 border-transparent hover:text-emerald-500'
 )}
 title={isCollapsed ? 'Expand' : 'Collapse'}
 >
 {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
 </button>

 {/* Compact action menu */}
 <button
 ref={menuAnchorRef}
 onClick={(e) => {
 e.stopPropagation()
 if (!menuOpen && menuAnchorRef.current) {
 const rect = menuAnchorRef.current.getBoundingClientRect()
 setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 })
 }
 setMenuOpen(!menuOpen)
 }}
 className={cn(
 'p-1.5 rounded-none border transition-all',
 menuOpen
 ? theme === 'dark' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-100 border-emerald-200 text-emerald-600'
 : theme === 'dark' ? 'text-gray-500 border-transparent hover:text-emerald-400' : 'text-gray-400 border-transparent hover:text-emerald-500'
 )}
 title="Actions"
 >
 <MoreHorizontal size={14} />
 </button>
 </div>
 </div>

 {/* Collapsible fields area */}
 <AnimatePresence initial={false}>
 {!isCollapsed && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.15 }}
 className="overflow-visible"
 >
 <div className={cn('transition-all duration-300', paddingClasses, widthClasses)}>
 {/* Sub-toolbar: align + undo/redo (moved from header to reduce clutter) */}
 <div className={cn(
 'flex items-center justify-between -mx-6 -mt-6 mb-6 px-4 py-2 border-b',
 theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-gray-50/50 border-gray-100'
 )}>
 <div className={cn(
 'flex items-center gap-0.5 p-0.5 rounded-none border',
 theme === 'dark' ? 'bg-black/20 border-white/[0.08]' : 'bg-white border-gray-200'
 )}>
 {(['left', 'center', 'right'] as const).map((align) => (
 <button
 key={align}
 aria-label={`Align ${align}`}
 onClick={(e) => { e.stopPropagation(); onAlign(align) }}
 className={cn(
 'p-1 transition-all',
 section.align === align || (!section.align && align === 'left')
 ? theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black text-white shadow-sm'
 : 'text-gray-400 hover:text-emerald-500'
 )}
 >
 {align === 'left' && <AlignLeft size={10} />}
 {align === 'center' && <AlignCenter size={10} />}
 {align === 'right' && <AlignRight size={10} />}
 </button>
 ))}
 </div>
 <div className="flex items-center gap-1">
 <span
 className={cn(
 'text-[8px] font-bold uppercase tracking-wider select-none',
 theme === 'dark' ? 'text-gray-700' : 'text-gray-400'
 )}
 title="Use Ctrl+Z / Ctrl+Y to undo or redo changes"
 >
 Ctrl+Z / Ctrl+Y to undo/redo
 </span>
 </div>
 </div>

 {section.blockType === 'code' && (
 <div className={cn(
 "w-full px-4 py-2 border-b flex items-center justify-between -mx-6 -mt-6 mb-6",
 theme === 'dark' ? 'bg-[#0F172A]/80 border-white/[0.08]' : 'bg-gray-100 border-gray-200'
 )}>
 <div className="flex gap-1.5">
 <span className="w-2.5 h-2.5 rounded-none bg-rose-500" />
 <span className="w-2.5 h-2.5 rounded-none bg-amber-500" />
 <span className="w-2.5 h-2.5 rounded-none bg-emerald-500" />
 </div>
 <span className="text-xs font-black uppercase tracking-wider text-gray-500 ">
 {section.content?.language || 'javascript'} terminal
 </span>
 </div>
 )}

 {section.blockType === 'table' ? (
 <div className="w-full overflow-x-auto border border-white/[0.08] bg-black/20 p-4 rounded-none">
 <table className="w-full border-collapse text-left text-xs font-mono">
 <thead>
 <tr className={cn(theme === 'dark' ? 'bg-white/5 border-b border-white/[0.08]' : 'bg-gray-150 border-b border-gray-200')}>
 {((section.content?.headers) || []).map((h, hIdx) => (
 <th key={hIdx} className="p-2.5">
 <input
 type="text"
 value={h.text || ''}
 onChange={(e) => {
 const headers = [...(section.content.headers || [])]
 headers[hIdx] = { ...headers[hIdx], text: e.target.value }
 handleFieldChange('headers', headers)
 }}
 className="bg-transparent border-none font-bold w-full focus:bg-white/5 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1 text-xs"
 placeholder={`Header ${hIdx + 1}`}
 />
 </th>
 ))}
 <th className="w-10">
 <button
 onClick={(e) => {
 e.stopPropagation()
 const headers = [...(section.content.headers || [])]
 headers.push({ text: '' })
 handleFieldChange('headers', headers)
 const rows = (section.content.rows || []).map((r: any) => ({
 cells: [...(r.cells || []), { text: '' }]
 }))
 handleFieldChange('rows', rows)
 }}
 className="text-xs text-emerald-400 font-bold hover:text-emerald-300"
 >
 + Col
 </button>
 </th>
 </tr>
 </thead>
 <tbody>
 {((section.content?.rows) || []).map((row, rIdx) => (
 <tr key={rIdx} className={cn(theme === 'dark' ? 'border-b border-white/[0.08] hover:bg-white/[0.01]' : 'border-b border-gray-150 hover:bg-gray-50')}>
 {((row.cells) || []).map((cell, cIdx) => (
 <td key={cIdx} className="p-2">
 <input
 type="text"
 value={cell.text || ''}
 onChange={(e) => {
 const rows = [...(section.content.rows || [])]
 const cells = [...(rows[rIdx].cells || [])]
 cells[cIdx] = { ...cells[cIdx], text: e.target.value }
 rows[rIdx] = { ...rows[rIdx], cells }
 handleFieldChange('rows', rows)
 }}
 className="bg-transparent border-none w-full focus:bg-white/5 focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1"
 placeholder="Cell..."
 />
 </td>
 ))}
 <td className="p-2">
 <button
 onClick={(e) => {
 e.stopPropagation()
 const rows = (section.content.rows || []).filter((_: any, idx: number) => idx !== rIdx)
 handleFieldChange('rows', rows)
 }}
 className="text-xs text-rose-500 font-bold hover:text-rose-400"
 >
 Delete
 </button>
 </td>
 </tr>
 ))}
 <tr>
 <td colSpan={((section.content?.headers) || []).length + 1} className="p-2">
 <button
 onClick={(e) => {
 e.stopPropagation()
 const rows = [...(section.content.rows || [])]
 const numCols = ((section.content?.headers) || []).length
 const newCells = Array.from({ length: numCols }, () => ({ text: '' }))
 rows.push({ cells: newCells })
 handleFieldChange('rows', rows)
 }}
 className="text-xs text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1"
 >
 + Add Row
 </button>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 ) : (
 <div className="space-y-8">
 {/* Content Fields */}
 <div
 className={cn(
 'gap-8',
 fieldsToRender.filter(f => !['anchorId', 'theme', 'paddingY', 'containerWidth', 'bgImage'].includes(f.name) && f.name !== 'content' && f.name !== 'description' && f.name !== 'bio' && f.type !== 'richtext').length >= 4 ? 'grid grid-cols-1 md:grid-cols-2' : 'space-y-6',
 section.align === 'center' && 'text-center',
 section.align === 'right' && 'text-right'
 )}
 >
 {fieldsToRender.filter(f => !['anchorId', 'theme', 'paddingY', 'containerWidth', 'bgImage'].includes(f.name)).map((field) => {
 const rawVal = section.content?.[field.name]
 const displayValue = i18nEnabled && getTranslatedValue
 ? getTranslatedValue(section.id, field.name, rawVal)
 : rawVal
 const isFullWidth = field.name === 'content' || field.name === 'description' || field.name === 'bio' || field.type === 'richtext'
 const errorKey = `${section.id}:${field.name}`

 return (
 <div
 key={field.name}
 className={cn(
 'space-y-2',
 isFullWidth && 'md:col-span-2'
 )}
 >
 <div className="space-y-0.5">
 <div className="flex items-center gap-2">
 <label className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] px-1 opacity-50">
 {field.label || field.name}
 </label>
 <span className={cn(
 'px-1.5 py-0.5 text-[6px] font-black uppercase rounded-none',
 theme === 'dark'
 ? 'bg-white/5 text-gray-600'
 : 'bg-gray-100 text-gray-400'
 )}>
 {field.type}
 </span>
 {fieldErrors[errorKey] && (
 <span className="text-[8px] font-black text-rose-500 uppercase ml-auto">
 {fieldErrors[errorKey]}
 </span>
 )}
 </div>
 {field.description && (
 <p className={cn('text-[10px] font-medium px-1 opacity-40', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
 {field.description}
 </p>
 )}
 </div>

 <FieldRenderer
 blockId={section.id}
 field={field}
 value={displayValue}
 onChange={(newVal) => {
 if (i18nEnabled && currentLocale !== 'en' && setTranslatedValue) {
 setTranslatedValue(section.id, field.name, newVal)
 } else {
 handleFieldChange(field.name, newVal)
 }
 }}
 onFieldSelect={onFieldSelect}
 theme={theme}
 error={fieldErrors[errorKey]}
 isSelected={selectedField?.blockId === section.id && selectedField?.fieldKey === field.name}
 />
 </div>
 )
 })}
 </div>

 {/* Settings Fields */}
 {fieldsToRender.some(f => ['anchorId', 'theme', 'paddingY', 'containerWidth', 'bgImage'].includes(f.name)) && (
 <div className={cn(
 'pt-6 mt-6 border-t',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
 )}>
 <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-4 px-1">
 Layout & Styling
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
 {fieldsToRender.filter(f => ['anchorId', 'theme', 'paddingY', 'containerWidth', 'bgImage'].includes(f.name)).map((field) => {
 const rawVal = section.content?.[field.name]
 const displayValue = i18nEnabled && getTranslatedValue
 ? getTranslatedValue(section.id, field.name, rawVal)
 : rawVal
 const errorKey = `${section.id}:${field.name}`

 return (
 <div key={field.name} className="space-y-2">
 <div className="flex items-center gap-2">
 <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-1 opacity-60">
 {field.label || field.name}
 </label>
 </div>
 <FieldRenderer
 blockId={section.id}
 field={field}
 value={displayValue}
 onChange={(newVal) => {
 if (i18nEnabled && currentLocale !== 'en' && setTranslatedValue) {
 setTranslatedValue(section.id, field.name, newVal)
 } else {
 handleFieldChange(field.name, newVal)
 }
 }}
 onFieldSelect={onFieldSelect}
 theme={theme}
 error={fieldErrors[errorKey]}
 isSelected={selectedField?.blockId === section.id && selectedField?.fieldKey === field.name}
 />
 </div>
 )
 })}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* Action menu rendered via portal to escape overflow-hidden clipping */}
 {menuOpen && menuPos && createPortal(
 <div
 ref={menuRef}
 style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 900 }}
 className={cn(
 'min-w-[160px] border shadow-xl rounded-none',
 theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200'
 )}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="py-1">
 {index > 0 && (
 <ActionItem icon={<ArrowUp size={12} />} label="Move Up" onClick={() => { onMoveUp(); setMenuOpen(false) }} theme={theme} />
 )}
 {index < totalSections - 1 && (
 <ActionItem icon={<ArrowDown size={12} />} label="Move Down" onClick={() => { onMoveDown(); setMenuOpen(false) }} theme={theme} />
 )}
 <ActionItem icon={<Copy size={12} />} label="Duplicate" onClick={() => { onDuplicate(); setMenuOpen(false) }} theme={theme} />
 <ActionItem icon={<Clipboard size={12} />} label="Copy" onClick={() => { onCopy(); setMenuOpen(false) }} theme={theme} />
 <ActionItem icon={<ClipboardPaste size={12} />} label="Paste" onClick={() => { onPaste(); setMenuOpen(false) }} theme={theme} />
 <div className={cn('border-t my-1', theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100')} />
 <ActionItem icon={<Trash2 size={12} />} label="Remove" onClick={() => { onDelete(); setMenuOpen(false) }} theme={theme} danger />
 </div>
 </div>,
 document.body
 )}

 </div>
 )
}

// Small helper for action menu items
const ActionItem: React.FC<{
 icon: React.ReactNode
 label: string
 onClick: () => void
 theme: 'light' | 'dark'
 danger?: boolean
}> = ({ icon, label, onClick, theme, danger }) => (
 <button
 onClick={onClick}
 className={cn(
 'w-full flex items-center gap-3 px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all',
 danger
 ? 'text-rose-500 hover:bg-rose-500/10'
 : theme === 'dark'
 ? 'text-gray-400 hover:bg-white/5 hover:text-white'
 : 'text-gray-600 hover:bg-gray-50 hover:text-black'
 )}
 >
 <span className="opacity-60">{icon}</span>
 {label}
 </button>
)
