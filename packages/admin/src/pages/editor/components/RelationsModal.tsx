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
 'absolute inset-4 md:inset-10 border rounded-none-none shadow-2xl flex flex-col overflow-hidden',
 theme === 'dark' ? 'bg-[#060606] border-z-border' : 'bg-z-panel border-z-border'
 )}
 >
 {/* Header */}
 <div className={cn(
 'p-6 border-b flex items-start justify-between shrink-0',
 theme === 'dark' ? 'border-z-border' : 'border-z-border shadow-sm'
 )}>
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-none-none bg-gray-600/20 border border-gray-500/30 flex items-center justify-center">
 <Link2 size={18} className="text-gray-600 dark:text-z-muted" />
 </div>
 <div>
 <h2
 id={modalTitleId}
 className="text-lg font-semibold text-gray-600 dark:text-z-muted"
 >
 Content Relations
 </h2>
 <p className="text-xs text-z-secondary font-bold">
 Connect entries from other collections
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-xs text-z-secondary font-mono">
 {selectedRelations.size} selected
 </span>
 <button
 onClick={() => setRelationsModalOpen(false)}
 aria-label="Close"
 className={cn(
 'p-2 rounded-none-none border transition-all',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-white hover:bg-white hover:text-black'
 : 'bg-gray-100 border-z-border text-black hover:bg-black hover:text-white'
 )}
 >
 <X size={16} />
 </button>
 </div>
 </div>

 {/* Collection Selector */}
 <div className={cn(
 'p-4 border-b flex gap-2 overflow-x-auto',
 theme === 'dark' ? 'border-z-border bg-white/[0.01]' : 'border-z-border shadow-sm bg-gray-55'
 )}>
 {availableCollections.map((col) => {
 const isActive = activeCollection === col.slug
 return (
 <button
 key={col.slug}
 onClick={() => handleCollectionSelect(col)}
 className={cn(
 'px-3 py-1.5 text-xs font-semibold  rounded-none-none border shrink-0 transition-all',
 isActive
 ? theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-z-muted'
 : 'bg-gray-50 border-z-border-strong text-gray-600'
 : theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-gray-500/30 hover:text-gray-600 dark:text-z-muted'
 : 'border-z-border text-gray-600 hover:border-z-border-strong hover:text-gray-600'
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
 <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-z-secondary" />
 <input
 type="text"
 aria-label="Search relation entries"
 placeholder="Search entries to link..."
 value={relationsSearch}
 onChange={(e) => setRelationsSearch(e.target.value)}
 className={cn(
 'w-full rounded-none-none py-3 pl-12 pr-4 text-xs font-bold border',
 theme === 'dark'
 ? 'bg-z-hover border-z-border text-white focus-visible:border-gray-500/50'
 : 'bg-z-input border-z-border text-z-primary focus-visible:border-gray-600/50'
 )}
 />
 </div>
 </div>

 {/* Results */}
 <div className="flex-1 overflow-y-auto p-4 custom-editor-scrollbar">
 {!activeCollection ? (
 <div className="flex flex-col items-center justify-center h-full gap-4">
 <GitBranch size={40} className="text-gray-600 opacity-30" />
 <p className="text-xs text-z-secondary font-semibold text-center">
 Select a collection above to view entries
 </p>
 </div>
 ) : relationResults.length === 0 ? (
 <div className="flex flex-col items-center justify-center h-full gap-4">
 <Search size={32} className="text-gray-600 opacity-30" />
 <p className="text-xs text-z-secondary font-semibold text-center">
 {debouncedSearch ? 'No entries match your search' : 'No entries found in this collection'}
 </p>
 </div>
 ) : (
 <div className="space-y-1">
 {relationResults.map((item: any) => (
 <button
 key={item.id || item._id}
 onClick={() => toggleRelation(item.id || item._id)}
 className={cn(
 'w-full flex items-center gap-3 p-3 rounded-none-none border transition-all text-left',
 selectedRelations.has(item.id || item._id)
 ? theme === 'dark'
 ? 'bg-gray-500/10 border-gray-500/30'
 : 'bg-z-input border-z-border'
 : theme === 'dark'
 ? 'bg-white/[0.01] border-z-border hover:border-z-border'
 : 'bg-z-input border-z-border hover:border-z-border'
 )}
 >
 <div className={cn(
 'w-5 h-5 rounded-none-none border-2 flex items-center justify-center shrink-0 transition-all',
 selectedRelations.has(item.id || item._id)
 ? 'bg-gray-600 dark:bg-gray-600 border-gray-600'
 : theme === 'dark'
 ? 'border-z-border'
 : 'border-z-border-strong'
 )}>
 {selectedRelations.has(item.id || item._id) && <Check size={12} className="text-white" />}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold truncate">
 {item.title || item.name || item.headline || item.id}
 </p>
 <p className="text-sm text-z-secondary font-mono truncate">
 ID: {item.id || item._id}
 </p>
 </div>
 <span className="text-sm text-z-secondary font-mono shrink-0">
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
 theme === 'dark' ? 'border-z-border bg-z-panel' : 'border-z-border shadow-sm bg-gray-50'
 )}>
 <span className="text-xs text-z-secondary font-bold">
 Click entries to select/deselect for relation
 </span>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setRelationsModalOpen(false)}
 className={cn(
 'px-4 py-2 text-xs font-semibold  rounded-none-none border transition-all',
 theme === 'dark'
 ? 'border-z-border text-z-muted hover:border-z-border hover:text-white'
 : 'border-z-border text-gray-600 hover:border-z-border-strong hover:text-black'
 )}
 >
 Cancel
 </button>
 <button
 onClick={applyRelations}
 disabled={selectedRelations.size === 0}
 className="px-4 py-2 bg-gray-600 dark:bg-gray-600 text-white text-xs font-semibold rounded-none-none hover:bg-gray-500 transition-all disabled:opacity-50"
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
