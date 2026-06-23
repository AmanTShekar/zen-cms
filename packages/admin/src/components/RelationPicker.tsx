import React, { useEffect, useState } from 'react'
import { Link2, X, Plus, Search, Check, Loader2, Database } from 'lucide-react'
import api from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
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
  const { theme } = useTheme()
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
            className="flex items-center gap-3 px-4 py-2 bg-z-active-bg/30 border border-z-active-border rounded-none-none group transition-all hover:border-z-active-border cursor-pointer hover:bg-z-active-bg"
          >
            <Link2 size={12} className="text-z-active-text" />
            <span className="text-sm font-bold text-gray-700">{getDisplayValue(item)}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (hasMany) {
                    onChange(selectedItems.filter((_, idx) => idx !== i))
                  } else {
                    onChange(null)
                  }
                }}
                className="p-1 hover:bg-z-active-bg rounded-none-none text-z-muted hover:text-z-accent transition-colors"
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
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 border-dashed border-z-border text-z-muted hover:border-z-active-border hover:text-z-accent hover:bg-z-active-bg/20 transition-all group"
          >
            <Plus size={14} strokeWidth={3} />
            <span className="text-sm font-semibold">
              Link Record
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-10 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className={cn(
                "w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden rounded-xl border",
                theme === 'dark' ? "bg-black/65 backdrop-blur-xl border-white/10" : "bg-white border-black/10"
              )}
            >
              <div className={cn("p-8 border-b flex items-center justify-between", theme === 'dark' ? "border-white/10" : "border-gray-50")}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-sm">
                    <Database size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className={cn("text-lg font-semibold leading-none", theme === 'dark' ? "text-white" : "text-z-primary")}>
                      Select Relation
                    </h3>
                    <p className="text-sm font-bold text-gray-400 mt-1.5">
                      Targeting Collection: {relationTo.toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={cn("w-10 h-10 flex items-center justify-center rounded-lg transition-all", theme === 'dark' ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-50 hover:bg-gray-100 text-z-muted")}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-8 gap-6">
                <div className="relative group">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-z-accent transition-colors"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(
                      "w-full rounded-lg pl-12 pr-4 py-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 border",
                      theme === 'dark' ? "bg-black/20 border-white/10 text-white" : "bg-gray-50 border-z-border text-black"
                    )}
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin text-z-active-text" size={24} />
                      <span className="text-sm font-semibold text-gray-400 animate-pulse">
                        Syncing Records...
                      </span>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
                      <Database size={32} className={theme === 'dark' ? 'text-white' : 'text-black'} />
                      <span className={cn("text-sm font-semibold", theme === 'dark' ? 'text-white' : 'text-black')}>
                        No Records Found
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
                              'flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer group',
                              isSelected
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-xl shadow-sm'
                                : theme === 'dark' ? 'bg-black/20 border-white/5 hover:border-white/10' : 'bg-white border-gray-50 hover:border-z-active-border hover:bg-z-active-bg/10'
                            )}
                          >
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  'text-xs font-semibold',
                                  isSelected ? 'text-white' : theme === 'dark' ? 'text-white' : 'text-z-primary'
                                )}
                              >
                                {getDisplayValue(item)}
                              </span>
                              <span
                                className={cn(
                                  'text-sm font-bold mt-1',
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

              <div className={cn("p-8 border-t flex justify-end", theme === 'dark' ? "border-white/10 bg-black/20" : "border-gray-50 bg-gray-50/50")}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={cn("px-8 py-3 rounded-lg text-sm font-semibold shadow-xl transition-all", theme === 'dark' ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-900 text-white shadow-gray-900/20 hover:brightness-110")}
                >
                  Close Registry
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
