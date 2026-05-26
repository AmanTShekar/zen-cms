import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Layers, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Layout, Search, X } from 'lucide-react'
import { useEditorBlocks } from '../../../context/BlockLibraryContext'
import { humanize, type FieldDefinition } from '../constants'
import { FieldRenderer } from '../FieldRenderer'
import { cn } from '../../../lib/utils'

interface NestedDynamicZoneProps {
  blockId: string
  fieldName: string
  value: any[]
  onChange: (items: any[]) => void
  theme: 'light' | 'dark'
  /** Available component types (e.g. ['hero','pricing','faq']) */
  components?: string[]
  onOpenDynamicZone?: (componentType: string) => void
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [componentSearch, setComponentSearch] = useState('')
  const [showComponentPicker, setShowComponentPicker] = useState(false)

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
    const newItem: Record<string, any> = {
      __component: `content.${type}`,
      ...(def?.defaultContent ? JSON.parse(JSON.stringify(def.defaultContent)) : {}),
    }
    const id = `dz_${Date.now()}_${Math.random().toString(36).slice(2)}`
    newItem._dzId = id
    const items = [...value, newItem]
    onChange(items)
    setExpandedIds((prev) => new Set([...prev, id]))
    setShowComponentPicker(false)
    setComponentSearch('')
  }, [BLOCK_LIBRARY, value, onChange])

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

  const filteredComponents = componentSearch.trim()
    ? availableComponents.filter((b) =>
        b.title.toLowerCase().includes(componentSearch.toLowerCase()) ||
        b.type.toLowerCase().includes(componentSearch.toLowerCase())
      )
    : availableComponents

  return (
    <div className="space-y-3">
      {/* Zone label */}
      <div className="flex items-center gap-2 px-1">
        <Layers size={10} className="text-purple-400" />
        <span className="text-xs font-black uppercase italic tracking-widest text-purple-400">
          Dynamic Zone
        </span>
        <span className="text-xs text-gray-500">— {value.length} component{value.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Items with drag-and-drop reorder */}
      {value.length === 0 ? (
        <div className={cn(
          'py-5 text-center border border-dashed rounded-none',
          theme === 'dark' ? 'border-white/5 text-gray-500' : 'border-gray-200 text-gray-400'
        )}>
          <p className="text-xs font-bold italic">No components — add one below</p>
        </div>
      ) : (
        <Reorder.Group axis="y" values={value} onReorder={handleReorder} className="space-y-2">
          <AnimatePresence initial={false}>
            {value.map((item, idx) => {
              const dzId = item._dzId || `dz_${idx}`
              const isExpanded = expandedIds.has(dzId)
              const def = getBlockDefForItem(item)
              const componentLabel = def?.title || componentTypeLabel(item.__component || 'Unknown')
              const BlockIcon = def?.icon || Layout

              return (
                <Reorder.Item
                  key={dzId}
                  value={item}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  as="div"
                  className={cn(
                    'border rounded-none overflow-hidden',
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/8'
                      : 'bg-gray-50 border-gray-200'
                  )}
                >
                  {/* Card Header */}
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
                      theme === 'dark'
                        ? 'bg-white/[0.02] hover:bg-white/[0.04]'
                        : 'bg-gray-100/50 hover:bg-gray-100'
                    )}
                    onClick={() => toggleExpand(dzId)}
                  >
                    <GripVertical size={12} className="text-gray-500 shrink-0 cursor-grab active:cursor-grabbing" />
                    <div className={cn(
                      'w-5 h-5 rounded-none flex items-center justify-center shrink-0',
                      theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'
                    )}>
                      <BlockIcon size={10} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase italic text-purple-300 truncate">
                        {componentLabel}
                      </p>
                    </div>
                    <span className={cn(
                      'text-[8px] font-black shrink-0',
                      theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                    )}>
                      #{idx + 1}
                    </span>

                    {/* Controls */}
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeItem(dzId)}
                        aria-label="Remove component"
                        className="p-1 text-gray-500 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={12} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => toggleExpand(dzId)}
                        aria-label={isExpanded ? 'Collapse component' : 'Expand component'}
                        className="p-1 text-gray-500 hover:text-purple-400 transition-colors"
                      >
                        {isExpanded
                          ? <ChevronUp size={12} aria-hidden="true" className="text-purple-400" />
                          : <ChevronDown size={12} aria-hidden="true" className="text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>

                  {/* Expanded Fields */}
                  <AnimatePresence initial={false}>
                    {isExpanded && def && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className={cn(
                          'px-4 py-4 space-y-4 border-t',
                          theme === 'dark' ? 'border-white/5' : 'border-gray-200'
                        )}>
                          {def.fields.map((field: FieldDefinition) => (
                            <div key={field.name} className="space-y-1">
                              <label className="text-xs font-black text-gray-400 uppercase tracking-widest italic block">
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
            })}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Add Component */}
      <div className={cn(
        'border rounded-none p-3',
        theme === 'dark' ? 'border-white/5' : 'border-gray-200'
      )}>
        <div className="flex items-center gap-2 mb-2">
          <Plus size={10} className="text-gray-500" />
          <span className="text-xs font-black text-gray-500 uppercase italic tracking-widest">
            Add Component
          </span>
        </div>
        {showComponentPicker ? (
          <div className="space-y-2">
            <div className="relative">
              <Search size={12} className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              )} />
              <input
                type="text"
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                placeholder="Search components..."
                autoFocus
                className={cn(
                  'w-full pl-8 pr-8 py-2 text-xs font-bold border rounded-none bg-transparent',
                  theme === 'dark'
                    ? 'border-white/10 text-white placeholder-gray-600 focus:border-purple-500/30'
                    : 'border-gray-200 text-black placeholder-gray-400 focus:border-purple-500/30'
                )}
              />
              {componentSearch && (
                <button
                  onClick={() => setComponentSearch('')}
                  className={cn(
                    'absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5',
                    theme === 'dark' ? 'text-gray-600 hover:text-white' : 'text-gray-400 hover:text-black'
                  )}
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 custom-editor-scrollbar">
              {filteredComponents.length === 0 ? (
                <p className={cn('text-xs font-bold italic text-center py-3', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
                  No components found
                </p>
              ) : (
                filteredComponents.map((b) => {
                  const Icon = b.icon || Layout
                  return (
                    <button
                      key={b.type}
                      onClick={() => addItem(b.type)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-none border text-left transition-all',
                        theme === 'dark'
                          ? 'bg-white/[0.02] border-white/5 hover:border-purple-500/30 hover:bg-purple-500/5'
                          : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-none flex items-center justify-center shrink-0',
                        theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50'
                      )}>
                        <Icon size={12} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black uppercase italic truncate">{b.title}</p>
                        <p className={cn('text-[9px] font-bold truncate', theme === 'dark' ? 'text-gray-600' : 'text-gray-400')}>
                          {b.description}
                        </p>
                      </div>
                      <Plus size={10} className="text-purple-500 opacity-50 shrink-0" />
                    </button>
                  )
                })
              )}
            </div>
            <button
              onClick={() => { setShowComponentPicker(false); setComponentSearch('') }}
              className={cn(
                'w-full px-2 py-1.5 text-[9px] font-black uppercase italic tracking-wider border rounded-none',
                theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-white' : 'border-gray-200 text-gray-400 hover:text-black'
              )}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableComponents.slice(0, 6).map((b) => {
              const Icon = b.icon || Layout
              return (
                <button
                  key={b.type}
                  onClick={() => addItem(b.type)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-black uppercase italic tracking-wider border transition-all hover:border-purple-500/30',
                    theme === 'dark'
                      ? 'bg-white/[0.03] border-white/8 text-gray-400 hover:bg-purple-500/5 hover:text-purple-300'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700'
                  )}
                >
                  <Icon size={10} />
                  {b.title}
                </button>
              )
            })}
            {availableComponents.length > 6 && (
              <button
                onClick={() => setShowComponentPicker(true)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-black uppercase italic tracking-wider border border-dashed',
                  theme === 'dark' ? 'border-white/10 text-gray-500 hover:text-purple-400' : 'border-gray-300 text-gray-400 hover:text-purple-600'
                )}
              >
                +{availableComponents.length - 6} More
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NestedDynamicZone
