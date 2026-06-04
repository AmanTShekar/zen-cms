import React, { useEffect, useState } from 'react'
import { Link2, X, Plus, Search, Check, Loader2, Database } from 'lucide-react'
import api from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import DocumentEditModal from './DocumentEditModal'

interface RelationItem {
 _id: string
 name?: string
 title?: string
 email?: string
 id?: string
 [key: string]: unknown
}

interface RelationPickerProps {
 value?: unknown
 onChange: (value: unknown) => void
 relationTo: string
 hasMany?: boolean
 disabled?: boolean
}

const RelationPicker: React.FC<RelationPickerProps> = ({
 value,
 onChange,
 relationTo,
 hasMany,
 disabled = false,
}) => {
 const [isOpen, setIsOpen] = useState(false)
 const [editItemId, setEditItemId] = useState<string | null>(null)
 const [items, setItems] = useState<RelationItem[]>([])
 const [loading, setLoading] = useState(false)
 const [search, setSearch] = useState('')
 const [, setSchema] = useState<Record<string, unknown> | null>(null)

 const selectedItems = (Array.isArray(value) ? value : value ? [value] : []) as RelationItem[]

 const fetchData = async () => {
 setLoading(true)
 try {
 // First get health to find the schema of the related collection
 const healthRes = await api.get('/health')
 const collections = healthRes.data.data?.collections || []
 const globals = healthRes.data.data?.globals || []
 const colSchema =
 collections.find((c: { slug: string }) => c.slug === relationTo) ||
 globals.find((g: { slug: string }) => g.slug === relationTo)
 setSchema(colSchema)

 // Then get the items
 const res = await api.get(`/${relationTo}`)
 setItems(res.data.data || [])
 } catch {
 console.error('Failed to fetch relation data')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 if (isOpen) {
 const timer = setTimeout(() => fetchData(), 0)
 return () => clearTimeout(timer)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [isOpen, relationTo])

 const toggleSelect = (item: RelationItem) => {
 if (hasMany) {
 const exists = selectedItems.find((i) => i._id === item._id)
 if (exists) {
 onChange(selectedItems.filter((i) => i._id !== item._id))
 } else {
 onChange([...selectedItems, item])
 }
 } else {
 onChange(item)
 setIsOpen(false)
 }
 }

 const getDisplayValue = (item: RelationItem | string) => {
 if (!item) return ''
 if (typeof item === 'string') return item
 return item.name || item.title || item.email || item.id || item._id
 }

 return (
 <div className="space-y-2">
 <div className="flex flex-wrap gap-2">
 {selectedItems.map((item, i) => (
 <div
 key={item._id || i}
 onClick={() => setEditItemId(item._id)}
 className="flex items-center gap-3 px-4 py-2 bg-emerald-50/30 border border-emerald-100 rounded-none group transition-all hover:border-emerald-300 cursor-pointer hover:bg-emerald-50"
 >
 <Link2 size={12} className="text-emerald-500" />
 <span className="text-[11px] font-bold text-gray-700">{getDisplayValue(item)}</span>
 {!disabled && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation()
 hasMany ? onChange(selectedItems.filter((_, idx) => idx !== i)) : onChange(null)
 }}
 className="p-1 hover:bg-emerald-100 rounded-none text-gray-400 hover:text-emerald-600 transition-colors"
 >
 <X size={10} />
 </button>
 )}
 </div>
 ))}
 {!disabled && (hasMany || selectedItems.length === 0) && (
 <button
 type="button"
 onClick={() => setIsOpen(true)}
 className="flex items-center gap-2.5 px-4 py-2 rounded-none border-2 border-dashed border-gray-100 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/20 transition-all group"
 >
 <Plus size={14} strokeWidth={3} />
 <span className="text-[9px] font-black uppercase tracking-widest ">
 Link_Record
 </span>
 </button>
 )}
 </div>

 <DocumentEditModal
 isOpen={!!editItemId}
 onClose={() => setEditItemId(null)}
 collectionSlug={relationTo}
 documentId={editItemId || ''}
 onSaved={(updatedItem) => {
 if (hasMany) {
 onChange(selectedItems.map((item) => item._id === updatedItem._id ? updatedItem : item))
 } else {
 onChange(updatedItem)
 }
 }}
 />

 <AnimatePresence>
 {isOpen && (
 <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-black/20 backdrop-blur-md">
 <motion.div
 initial={{ opacity: 0, scale: 0.98, y: 10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.98, y: 10 }}
 className="bg-white border border-gray-100 rounded-none w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden"
 >
 <div className="p-8 border-b border-gray-50 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-emerald-600 rounded-none flex items-center justify-center text-white shadow-lg shadow-emerald-200">
 <Database size={20} />
 </div>
 <div className="flex flex-col">
 <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight leading-none">
 Select_Relation
 </h3>
 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
 Targeting_Collection: {relationTo.toUpperCase()}
 </p>
 </div>
 </div>
 <button
 onClick={() => setIsOpen(false)}
 className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-none transition-all"
 >
 <X size={18} className="text-gray-400" />
 </button>
 </div>

 <div className="flex-1 overflow-hidden flex flex-col p-8 gap-6">
 <div className="relative group">
 <Search
 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-600 transition-colors"
 size={16}
 />
 <input
 type="text"
 placeholder="Search records..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-gray-50 border border-gray-100 rounded-none pl-12 pr-4 py-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:bg-white focus:ring-4 focus:ring-emerald-50"
 />
 </div>

 <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
 {loading ? (
 <div className="h-full flex flex-col items-center justify-center gap-4">
 <Loader2 className="animate-spin text-emerald-500" size={24} />
 <span className="text-[9px] font-black uppercase tracking-widest text-gray-300 animate-pulse">
 Syncing_Records...
 </span>
 </div>
 ) : items.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
 <Database size={32} />
 <span className="text-[9px] font-black uppercase tracking-widest ">
 No_Records_Found
 </span>
 </div>
 ) : (
 items
 .filter((i) =>
 getDisplayValue(i).toLowerCase().includes(search.toLowerCase())
 )
 .map((item) => {
 const isSelected = selectedItems.some((si) => si._id === item._id)
 return (
 <div
 key={item._id}
 onClick={() => toggleSelect(item)}
 className={cn(
 'flex items-center justify-between p-4 rounded-none border transition-all cursor-pointer group',
 isSelected
 ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-200'
 : 'bg-white border-gray-50 hover:border-emerald-100 hover:bg-emerald-50/10'
 )}
 >
 <div className="flex flex-col">
 <span
 className={cn(
 'text-xs font-black uppercase tracking-tight',
 isSelected ? 'text-white' : 'text-gray-900'
 )}
 >
 {getDisplayValue(item)}
 </span>
 <span
 className={cn(
 'text-[9px] font-bold uppercase tracking-widest mt-1',
 isSelected ? 'text-white/60' : 'text-gray-400'
 )}
 >
 ID: {item._id.slice(-8)}
 </span>
 </div>
 {isSelected && <Check size={16} strokeWidth={3} />}
 </div>
 )
 })
 )}
 </div>
 </div>

 <div className="p-8 border-t border-gray-50 bg-gray-50/50 flex justify-end">
 <button
 onClick={() => setIsOpen(false)}
 className="px-8 py-3 bg-gray-900 text-white rounded-none text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-900/20 hover:brightness-110 transition-all leading-none"
 >
 Close_Registry
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 )
}

export default RelationPicker
