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
  } = useEditorStore()

  const { relationsModalOpen, setRelationsModalOpen } = useModalStore()

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              'absolute inset-4 md:inset-10 border rounded-none shadow-2xl flex flex-col overflow-hidden',
              theme === 'dark' ? 'bg-[#060606] border-white/[0.08]' : 'bg-white border-gray-200'
            )}
          >
            {/* Header */}
            <div className={cn(
              'p-6 border-b flex items-start justify-between shrink-0',
              theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-100'
            )}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <Link2 size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h2
                    id={modalTitleId}
                    className="text-lg font-black uppercase italic text-emerald-400"
                  >
                    Content Relations
                  </h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                    Connect entries from other collections
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono">
                  {selectedRelations.size} selected
                </span>
                <button
                  onClick={() => setRelationsModalOpen(false)}
                  aria-label="Close"
                  className={cn(
                    'p-2 rounded-none border transition-all',
                    theme === 'dark'
                      ? 'bg-white/5 border-white/[0.08] text-white hover:bg-white hover:text-black'
                      : 'bg-gray-100 border-gray-200 text-black hover:bg-black hover:text-white'
                  )}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Collection Selector */}
            <div className={cn(
              'p-4 border-b flex gap-2 overflow-x-auto',
              theme === 'dark' ? 'border-white/[0.08] bg-white/[0.01]' : 'border-gray-100 bg-gray-55'
            )}>
              {availableCollections.map((col) => {
                const isActive = activeCollection === col.slug
                return (
                  <button
                    key={col.slug}
                    onClick={() => handleCollectionSelect(col)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-black uppercase italic rounded-none border shrink-0 transition-all',
                      isActive
                        ? theme === 'dark'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-600'
                        : theme === 'dark'
                          ? 'border-white/[0.08] text-gray-400 hover:border-emerald-500/30 hover:text-emerald-400'
                          : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600'
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
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  aria-label="Search relation entries"
                  placeholder="Search entries to link..."
                  value={relationsSearch}
                  onChange={(e) => setRelationsSearch(e.target.value)}
                  className={cn(
                    'w-full rounded-none py-3 pl-12 pr-4 text-xs font-bold italic  border',
                    theme === 'dark'
                      ? 'bg-white/5 border-white/[0.08] text-white focus-visible:border-emerald-500/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus-visible:border-emerald-600/50'
                  )}
                />
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 custom-editor-scrollbar">
              {!activeCollection ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <GitBranch size={40} className="text-gray-600 opacity-30" />
                  <p className="text-xs text-gray-500 font-black uppercase italic tracking-widest text-center">
                    Select a collection above to view entries
                  </p>
                </div>
              ) : relationResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Search size={32} className="text-gray-600 opacity-30" />
                  <p className="text-xs text-gray-500 font-black uppercase italic tracking-widest text-center">
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
                        'w-full flex items-center gap-3 p-3 rounded-none border transition-all text-left',
                        selectedRelations.has(item.id || item._id)
                          ? theme === 'dark'
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-emerald-50 border-emerald-200'
                          : theme === 'dark'
                            ? 'bg-white/[0.01] border-white/[0.08] hover:border-white/[0.08]'
                            : 'bg-gray-50 border-gray-200 hover:border-emerald-200'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-none border-2 flex items-center justify-center shrink-0 transition-all',
                        selectedRelations.has(item.id || item._id)
                          ? 'bg-emerald-600 border-emerald-600'
                          : theme === 'dark'
                            ? 'border-white/[0.08]'
                            : 'border-gray-300'
                      )}>
                        {selectedRelations.has(item.id || item._id) && <Check size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase italic truncate">
                          {item.title || item.name || item.headline || item.id}
                        </p>
                        <p className="text-[7px] text-gray-500 font-mono truncate">
                          ID: {item.id || item._id}
                        </p>
                      </div>
                      <span className="text-[7px] text-gray-500 font-mono shrink-0">
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
              theme === 'dark' ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
            )}>
              <span className="text-xs text-gray-500 font-bold italic">
                Click entries to select/deselect for relation
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRelationsModalOpen(false)}
                  className={cn(
                    'px-4 py-2 text-xs font-black uppercase italic rounded-none border transition-all',
                    theme === 'dark'
                      ? 'border-white/[0.08] text-gray-400 hover:border-white/[0.08] hover:text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-black'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={applyRelations}
                  disabled={selectedRelations.size === 0}
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-black uppercase italic rounded-none hover:bg-emerald-500 transition-all disabled:opacity-50"
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
