import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Link2, X, Search, GitBranch, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../../context/ThemeContext'
import { useEditorStore } from '../../../store/editorStore'
import { useModalStore } from '../../../store/modalStore'
import { cn } from '../../../lib/utils'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import api from '../../../lib/api'
import toast from 'react-hot-toast'
import { useShallow } from 'zustand/react/shallow'

export const RelationsModal: React.FC = () => {
 const { theme } = useTheme()

 const {
 selectedRelations,
 setSelectedRelations,
 availableCollections,
 relationsSearch,
 setRelationsSearch,
 relationResults,
 setRelationResults,
 relationsField,
 fieldSettings,
 updateData: editorUpdateData,
 } = useEditorStore(useShallow(state => ({
  selectedRelations: state.selectedRelations,
  setSelectedRelations: state.setSelectedRelations,
  availableCollections: state.availableCollections,
  relationsSearch: state.relationsSearch,
  setRelationsSearch: state.setRelationsSearch,
  relationResults: state.relationResults,
  setRelationResults: state.setRelationResults,
  relationsField: state.relationsField,
  fieldSettings: state.fieldSettings,
  updateData: state.updateData,
 })))

 const { relationsModalOpen, setRelationsModalOpen  } = useModalStore(useShallow(state => ({ relationsModalOpen: state.relationsModalOpen, setRelationsModalOpen: state.setRelationsModalOpen })))

 // Track the currently selected collection for visual feedback
 const [activeCollection, setActiveCollection] = useState<string | null>(null)
 // Debounced search to avoid API spam on every keystroke
 const [debouncedSearch, setDebouncedSearch] = useState('')
 const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

 const fetchRelationResults = useCallback(async (collection: string, search?: string) => {
 try {
 const params: any = { limit: 20 }
 if (search) params.search = search
 const res = await api.get(`/${collection}`, { params })
 setRelationResults(res.data.data || [])
 } catch {
 toast.error('Failed to load relation entries')
 }
 }, [setRelationResults])

 // Initialize active collection from field settings
 useEffect(() => {
 if (!relationsModalOpen) return
 const relatedField = Object.values(fieldSettings).find(
 (f) => !!(f as any).relationTo
 )
 const col = (relatedField as any)?.relationTo
 if (col) {
 const collectionSlug = Array.isArray(col) ? col[0] : col
 setActiveCollection(collectionSlug)
 fetchRelationResults(collectionSlug, debouncedSearch)
 }
  
 }, [relationsModalOpen])

 // Debounce search input — wait 300ms after last keystroke before hitting API
 useEffect(() => {
 if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
 debounceTimerRef.current = setTimeout(() => {
 setDebouncedSearch(relationsSearch)
 if (activeCollection) fetchRelationResults(activeCollection, relationsSearch)
 }, 300)
 return () => {
 if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
 }
 }, [relationsSearch, activeCollection, fetchRelationResults])

 const handleCollectionSelect = (col: any) => {
 setActiveCollection(col.slug)
 fetchRelationResults(col.slug, debouncedSearch)
 }

 const toggleRelation = (itemId: string) => {
 const next = new Set(selectedRelations)
 if (next.has(itemId)) {
 next.delete(itemId)
 } else {
 next.add(itemId)
 }
 setSelectedRelations(next)
 }

 const applyRelations = () => {
 if (!relationsField) return
 editorUpdateData((prev) => {
 const newSections = [...prev.sections]
 const sIdx = newSections.findIndex((s) => s.id === relationsField.sectionId)
 if (sIdx !== -1) {
 newSections[sIdx].content[relationsField.fieldKey] = Array.from(selectedRelations)
 }
 return { ...prev, sections: newSections }
 })
 setRelationsModalOpen(false)
 toast.success(`${selectedRelations.size} items linked`)
 }

 const dialogRef = useRef<HTMLDivElement>(null)
 const modalTitleId = 'relations-modal-title'

 useFocusTrap(relationsModalOpen, {
 onEscape: () => setRelationsModalOpen(false),
 containerRef: dialogRef
 })

 return (
 <AnimatePresence>
 {relationsModalOpen && (
 <div className="fixed inset-0 z-[700]">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setRelationsModalOpen(false)}
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
 'absolute inset-4 md:inset-10 border rounded-xl shadow-2xl flex flex-col overflow-hidden',
 theme === 'dark' 
 ? 'bg-black/65 backdrop-blur-xl border-white/10'
 : 'bg-white/95 backdrop-blur-xl border-z-border shadow-2xl'
 )}
 >
 {/* Header */}
 <div className={cn(
 'p-6 border-b flex items-start justify-between shrink-0',
 theme === 'dark' ? 'border-white/10' : 'border-z-border'
 )}>
 <div className="flex items-center gap-3">
 <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center border", theme === 'dark' ? 'bg-white/10 border-white/10' : 'bg-gray-100 border-z-border')}>
 <Link2 size={18} className={theme === 'dark' ? "text-white" : "text-gray-700"} />
 </div>
 <div>
 <h2
 id={modalTitleId}
 className={cn("text-lg font-semibold", theme === 'dark' ? "text-white" : "text-black")}
 >
 Content Relations
 </h2>
 <p className={cn("text-xs font-bold", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
 Connect entries from other collections
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-gray-400 font-mono">
 {selectedRelations.size} selected
 </span>
 <button
 type="button"
 onClick={() => setRelationsModalOpen(false)}
 aria-label="Close"
 className={cn(
 'p-2 rounded-xl border transition-all',
 theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-50 border-z-border text-gray-600 hover:bg-gray-100'
 )}
 >
 <X size={16} />
 </button>
 </div>
 </div>

 {/* Collection Selector */}
 <div className={cn(
 'p-4 border-b flex gap-2 overflow-x-auto',
 theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-z-border bg-gray-50/50'
 )}>
 {availableCollections.map((col) => {
 const isActive = activeCollection === col.slug
 return (
 <button
 key={col.slug}
 type="button"
 onClick={() => handleCollectionSelect(col)}
 className={cn(
 'px-3 py-1.5 text-xs font-semibold rounded-lg border shrink-0 transition-all',
 isActive
 ? theme === 'dark' ? 'bg-white/20 border-white/30 text-white' : 'bg-gray-200 border-gray-300 text-black'
 : theme === 'dark' ? 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white' : 'border-z-border text-gray-500 hover:border-gray-300 hover:text-black'
 )}
 >
 {col.label || col.slug}
 </button>
 )
 })}
 </div>

 {/* Search */}
 <div className="p-4 shrink-0">
 <div className="relative">
 <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 aria-label="Search relation entries"
 placeholder="Search entries to link..."
 value={relationsSearch}
 onChange={(e) => setRelationsSearch(e.target.value)}
 className={cn(
 'w-full rounded-lg py-3 pl-12 pr-4 text-xs font-bold border transition-colors',
 theme === 'dark' ? 'bg-black/20 border-white/10 text-white focus-visible:border-white/30' : 'bg-white border-z-border text-black focus-visible:border-gray-400'
 )}
 />
 </div>
 </div>

 {/* Results */}
 <div className="flex-1 overflow-y-auto p-4 custom-editor-scrollbar">
 {!activeCollection ? (
 <div className="flex flex-col items-center justify-center h-full gap-4">
 <GitBranch size={40} className={cn("opacity-20", theme === 'dark' ? "text-white" : "text-black")} />
 <p className={cn("text-xs font-semibold text-center", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
 Select a collection above to view entries
 </p>
 </div>
 ) : relationResults.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full gap-4">
 <Search size={32} className={cn("opacity-20", theme === 'dark' ? "text-white" : "text-black")} />
 <p className={cn("text-xs font-semibold text-center", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
 {debouncedSearch ? 'No entries match your search' : 'No entries found in this collection'}
 </p>
 </div>
 ) : (
 <div className="space-y-1">
 {relationResults.map((item: any) => (
 <button
 key={item.id || item._id}
 type="button"
 onClick={() => toggleRelation(item.id || item._id)}
 className={cn(
 'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
 selectedRelations.has(item.id || item._id)
 ? theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-300'
 : theme === 'dark' ? 'bg-black/20 border-white/5 hover:border-white/10' : 'bg-white border-z-border hover:border-gray-300'
 )}
 >
 <div className={cn(
 'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
 selectedRelations.has(item.id || item._id)
 ? 'bg-indigo-500 border-indigo-500'
 : theme === 'dark' ? 'border-white/20' : 'border-gray-300 bg-gray-50'
 )}>
 {selectedRelations.has(item.id || item._id) && <Check size={12} className="text-white" />}
 </div>
 <div className="flex-1 min-w-0">
 <p className={cn("text-xs font-semibold truncate", theme === 'dark' ? "text-white" : "text-black")}>
 {item.title || item.name || item.headline || item.id}
 </p>
 <p className={cn("text-sm font-mono truncate", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
 ID: {item.id || item._id}
 </p>
 </div>
 <span className={cn("text-sm font-mono shrink-0", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
 {item._status || item.status || 'active'}
 </span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Footer */}
 <div className={cn(
 'p-4 border-t flex items-center justify-between',
 theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-z-border bg-gray-50/50'
 )}>
 <span className={cn("text-xs font-bold", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
 Click entries to select/deselect for relation
 </span>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => setRelationsModalOpen(false)}
 className={cn(
 'px-4 py-2 text-xs font-semibold rounded-lg border transition-all',
 theme === 'dark' ? 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white' : 'border-z-border text-gray-600 hover:border-gray-400 hover:text-black'
 )}
 >
 Cancel
 </button>
 <button
 type="button"
 onClick={applyRelations}
 disabled={selectedRelations.size === 0}
 className="px-4 py-2 bg-indigo-500 text-white text-xs font-semibold rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50"
 >
 Link {selectedRelations.size} items
 </button>
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 )
}
