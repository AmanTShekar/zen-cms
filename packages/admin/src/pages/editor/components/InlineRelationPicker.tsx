import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Search, X, Check, Loader2, Plus, Minus, Edit3 } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import DocumentEditModal from '../../../components/DocumentEditModal'

interface InlineRelationPickerProps {
 blockId: string
 fieldKey: string
 value: string | string[]
 onChange: (val: string | string[]) => void
 theme: 'light' | 'dark'
 hasMany?: boolean
 relationTo?: string | string[]
 anchorEl?: HTMLElement | null
}

export const InlineRelationPicker: React.FC<InlineRelationPickerProps> = ({
 blockId,
 fieldKey,
 value,
 onChange,
 theme,
 hasMany = false,
 relationTo,
 anchorEl,
}) => {
 const [open, setOpen] = useState(false)
 const [search, setSearch] = useState('')
 const [results, setResults] = useState<any[]>([])
 const [loading, setLoading] = useState(false)
 const [editItemId, setEditItemId] = useState<string | null>(null)
 const [selected, setSelected] = useState<Set<string>>(new Set(
 value ? (Array.isArray(value) ? value : [value]) : []
 ))
 const popoverRef = useRef<HTMLDivElement>(null)
 const searchInputRef = useRef<HTMLInputElement>(null)
 const collection = typeof relationTo === 'string' ? relationTo : (Array.isArray(relationTo) ? relationTo[0] : null)

 // Keep local selection in sync with external value changes
 useEffect(() => {
 setSelected(new Set(value ? (Array.isArray(value) ? value : [value]) : []))
 }, [value])

 // Close on outside click
 useEffect(() => {
 if (!open) return
 const handle = (e: MouseEvent) => {
 if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
 setOpen(false)
 }
 }
 window.addEventListener('mousedown', handle)
 return () => window.removeEventListener('mousedown', handle)
 }, [open])

 // Focus search input when opening
 useEffect(() => {
 if (open && searchInputRef.current) {
 searchInputRef.current.focus()
 }
 }, [open])

 // Auto-fetch all relation targets on first open
 useEffect(() => {
 if (!open) return
 if (collection) {
 fetchResults(collection, '')
 }
 }, [open, collection])

 const fetchResults = async (col: string, q: string) => {
 setLoading(true)
 try {
 const params: any = { limit: 20 }
 if (q) params.search = q
 const res = await api.get(`/${col}`, { params })
 setResults(res.data.data || [])
 } catch {
 setResults([])
 toast.error('Failed to fetch relation entries')
 } finally {
 setLoading(false)
 }
 }

 const toggleItem = (itemId: string) => {
 const next = new Set(selected)
 if (next.has(itemId)) {
 next.delete(itemId)
 } else {
 if (!hasMany) {
 next.clear()
 }
 next.add(itemId)
 }
 setSelected(next)
 const newVal = hasMany ? Array.from(next) : (next.size > 0 ? Array.from(next)[0] : null)
 onChange(newVal as string | string[] | null)
 if (!hasMany) setOpen(false)
 }

 const handleApply = () => {
 setOpen(false)
 setSearch('')
 }

 const handleClear = () => {
 setSelected(new Set())
 onChange(hasMany ? [] : null)
 }

 // ── Positioning ──────────────────────────────────────────────────────────────
 const [pos, setPos] = useState({ top: 0, left: 0 })

 useEffect(() => {
 if (!open) return
 if (anchorEl) {
 const rect = anchorEl.getBoundingClientRect()
 setPos({
 top: rect.bottom + window.scrollY + 4,
 left: Math.max(8, rect.left + window.scrollX),
 })
 } else {
 // Fallback: use a default centered position
 setPos({ top: 120, left: window.innerWidth / 2 - 160 })
 }
 }, [open, anchorEl])

 const selectedCount = selected.size
 const displayLabel = !value || (Array.isArray(value) && value.length === 0)
 ? 'Manage Relations'
 : ` ${Array.isArray(value) ? `${value.length} linked` : '1 linked'}`

 return (
 <div className="relative" ref={popoverRef}>
 {/* Trigger button */}
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className={cn(
 'w-full px-4 py-3 flex items-center justify-between border text-xs font-bold transition-all rounded-none-none',
 theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400 hover:bg-gray-500/20'
 : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
 )}
 >
 <span className="flex items-center gap-2">
 <Link2 size={14} />
 {displayLabel}
 </span>
 <span className="text-xs opacity-60">
 {open ? 'Close ▲' : 'Edit ▼'}
 </span>
 </button>

 {/* Popover panel */}
 <AnimatePresence>
 {open && (
 <motion.div
 initial={{ opacity: 0, y: -6, scale: 0.98 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: -6, scale: 0.98 }}
 transition={{ duration: 0.15 }}
 style={{ top: pos.top, left: pos.left }}
 className={cn(
 'fixed z-[900] w-80 border rounded-none-none shadow-2xl overflow-hidden flex flex-col',
 theme === 'dark'
 ? 'bg-black/98 backdrop-blur-xl border-white/8 text-white'
 : 'bg-white/98 backdrop-blur-xl border-gray-200 text-gray-900'
 )}
 >
 {/* Header */}
 <div className={cn(
 'px-4 py-3 border-b flex items-center justify-between shrink-0',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}>
 <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
 Content Relations
 </span>
 <div className="flex items-center gap-1.5">
 {selectedCount > 0 && (
 <span className="text-xs font-black text-gray-600 dark:text-gray-400 uppercase ">
 {selectedCount} selected
 </span>
 )}
 <button
 onClick={handleClear}
 aria-label="Clear all selected relations"
 className={cn(
 'p-1 transition-colors',
 theme === 'dark' ? 'text-gray-500 hover:text-rose-400' : 'text-gray-400 hover:text-rose-500'
 )}
 >
 <X size={11} aria-hidden="true" />
 </button>
 <button
 onClick={() => setOpen(false)}
 aria-label="Close relation picker"
 className={cn(
 'p-1 transition-colors',
 theme === 'dark' ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
 )}
 >
 <X size={12} aria-hidden="true" />
 </button>
 </div>
 </div>

 {!collection ? (
 <div className="p-6 text-center">
 <p className="text-xs font-black uppercase text-gray-600 dark:text-gray-400 mb-1">No collection configured</p>
 <p className="text-xs text-gray-500">Set <code className="text-xs">relationTo</code> on the field to enable inline relation picker.</p>
 </div>
 ) : (
 <>
 {/* Search */}
 <div className="shrink-0 px-3 pt-3 pb-2">
 <div className="relative">
 <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
 <input
 ref={searchInputRef}
 type="text"
 placeholder="Search to link..."
 value={search}
 onChange={(e) => {
 setSearch(e.target.value)
 fetchResults(collection, e.target.value)
 }}
 className={cn(
 'w-full rounded-none-none py-2 pl-9 pr-3 text-xs font-bold border transition-all',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-white placeholder-gray-600'
 : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
 )}
 />
 </div>
 </div>

 {/* Results */}
 <div className="flex-1 overflow-y-auto max-h-56 custom-editor-scrollbar px-2 pb-2 space-y-0.5">
 {loading ? (
 <div className="flex items-center justify-center py-8 gap-2">
 <Loader2 size={14} className="animate-spin text-gray-600 dark:text-gray-500" />
 <span className="text-xs font-bold text-gray-500 uppercase animate-pulse">Searching...</span>
 </div>
 ) : results.length === 0 ? (
 <div className="py-8 text-center">
 <p className="text-xs font-black uppercase text-gray-500">No results found</p>
 <p className="text-xs text-gray-600 mt-1">Try a different search term</p>
 </div>
 ) : (
 results.map((item) => {
 const id = item._id || item.id
 const title = item.title || item.name || item.headline || id
 const isSelected = selected.has(id)

 return (
 <button
 key={id}
 onClick={() => toggleItem(id)}
 className={cn(
 'w-full flex items-center gap-2.5 px-3 py-2 rounded-none-none text-left text-xs font-semibold transition-all border',
 isSelected
 ? theme === 'dark'
 ? 'bg-gray-500/15 border-gray-500/20 text-gray-300'
 : 'bg-gray-50 border-gray-200 text-gray-700'
 : theme === 'dark'
 ? 'border-white/0 text-gray-300 hover:bg-white/5 hover:border-white/[0.08]'
 : 'border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-200 shadow-sm'
 )}
 >
 {/* Selection indicator */}
 <div className={cn(
 'w-4 h-4 rounded-none-none border flex items-center justify-center shrink-0 transition-all',
 isSelected
 ? 'bg-gray-500 border-gray-500 text-white'
 : theme === 'dark'
 ? 'border-white/[0.08] bg-white/5'
 : 'border-gray-300 bg-white'
 )}>
 {isSelected && <Check size={9} />}
 </div>

 {/* Item title */}
 <div className="flex-1 min-w-0">
 <p className="truncate font-black uppercase tracking-tight">
 {String(title)}
 </p>
 {item._status && (
 <span className={cn(
 'text-[7px] font-bold uppercase ',
 item._status === 'published'
 ? 'text-gray-600 dark:text-gray-500'
 : 'text-amber-500'
 )}>
 {item._status}
 </span>
 )}
 </div>

 {/* +/- for hasMany */}
 {hasMany && isSelected && (
 <div className="shrink-0 ml-1">
 <Minus size={10} className="text-gray-600 dark:text-gray-400" />
 </div>
 )}
 
 {/* Edit button */}
 {isSelected && (
 <button
 onClick={(e) => {
 e.stopPropagation()
 setEditItemId(id)
 }}
 className={cn(
 'shrink-0 p-1.5 ml-2 transition-colors border',
 theme === 'dark'
 ? 'border-white/[0.08] hover:bg-white/10 text-white'
 : 'border-gray-200 hover:bg-gray-100 text-black'
 )}
 title="Edit Document"
 >
 <Edit3 size={10} />
 </button>
 )}
 </button>
 )
 })
 )}
 </div>

 {/* Footer */}
 <div className={cn(
 'px-3 py-2.5 border-t flex items-center gap-2 shrink-0',
 theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200 shadow-sm'
 )}>
 <button
 onClick={handleClear}
 className={cn(
 'flex-1 py-1.5 text-xs font-black uppercase border rounded-none-none transition-all',
 theme === 'dark'
 ? 'border-white/[0.08] text-gray-500 hover:border-rose-500/20 hover:text-rose-400'
 : 'border-gray-200 text-gray-400 hover:border-rose-200 hover:text-rose-500'
 )}
 >
 Clear
 </button>
 <button
 onClick={handleApply}
 className={cn(
 'flex-1 py-1.5 text-xs font-black uppercase rounded-none-none transition-all bg-gray-600 dark:bg-gray-600 text-white hover:bg-gray-500'
 )}
 >
 Done
 </button>
 </div>
 </>
 )}
 </motion.div>
 )}
 </AnimatePresence>

 {collection && (
 <DocumentEditModal
 isOpen={!!editItemId}
 onClose={() => setEditItemId(null)}
 collectionSlug={collection}
 documentId={editItemId || ''}
 onSaved={() => {
 fetchResults(collection, search)
 }}
 />
 )}
 </div>
 )
}

export default InlineRelationPicker
