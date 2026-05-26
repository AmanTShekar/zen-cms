import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  Plus,
  GripVertical,
  Trash2,
  ChevronDown,
  Layers,
  Box,
  CreditCard,
  Layout,
  Puzzle,
  Copy,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  BarChart4,
  MessageSquare,
  Zap,
  Star,
  Mail,
  FileText,
  Users,
  AlertCircle,
  Code,
  Table,
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { cn } from '../lib/utils'

import type { FieldConfig } from '@zenithcms/types'
import { useBlockLibrary } from '../hooks/useBlockLibrary'
import { UNIFIED_BLOCK_LIBRARY } from '../pages/editor/unifiedBlocks'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Block {
  blockType: string
  _id?: string
  [key: string]: unknown
}

interface BlockField {
  name: string
  label?: string
  type: string
  required?: boolean
  defaultValue?: unknown
  options?: unknown
  [key: string]: unknown
}

interface BlockDefinition {
  slug: string
  labels?: { singular: string; plural: string }
  fields: BlockField[]
  admin?: {
    description?: string
    icon?: string
    imageURL?: string
    category?: string
  }
}

interface BlocksBuilderProps {
  value: Block[]
  onChange: (value: Block[]) => void
  availableBlocks?: unknown[]
  renderField?: (field: FieldConfig, value: unknown, onChange: (val: unknown) => void) => React.ReactNode
  disabled?: boolean
}

// Helper to humanize names if label is missing
const humanize = (str: string) => {
  return str
    .replace(/^root:/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
}

const IconMap: Record<string, React.ComponentType<any>> = {
  Star,
  Grid: Layout,
  BarChart4,
  MessageSquare,
  Mail,
  CreditCard,
  Zap,
  FileText,
  Layout,
  Users,
  AlertCircle,
  Code,
  Table,
  Puzzle,
}

const getBlockIcon = (slug: string): React.ReactNode => {
  const blockDef = UNIFIED_BLOCK_LIBRARY.find((b) => b.type === slug)
  const IconComp = blockDef ? IconMap[blockDef.iconName] : null
  if (IconComp) return React.createElement(IconComp, { size: 16 })
  if (slug === 'plugin-node') return <Puzzle size={16} />
  return <Box size={16} />
}

// ── Gradient Map ──────────────────────────────────────────────────────────────
const CATEGORY_GRADIENTS: Record<string, string> = {
  Layout: 'from-violet-900/60 to-indigo-900/40',
  Content: 'from-blue-900/60 to-cyan-900/40',
  Commerce: 'from-emerald-900/60 to-teal-900/40',
  Media: 'from-rose-900/60 to-pink-900/40',
  Social: 'from-amber-900/60 to-orange-900/40',
  General: 'from-[#1a1a2e]/80 to-[#16213e]/60',
}

const DEFAULT_BLOCKS: BlockDefinition[] = UNIFIED_BLOCK_LIBRARY.map((b) => ({
  slug: b.type,
  labels: { singular: b.title, plural: b.title + 's' },
  fields: b.fields.map((f) => ({
    name: f.name,
    label: f.label || humanize(f.name),
    type: f.type,
    required: f.required,
    defaultValue: b.defaultContent[f.name],
    options: f.options,
  })),
  admin: {
    description: b.description,
    category: b.category,
  }
}))

// ── Block Row ─────────────────────────────────────────────────────────────────
function BlockRow({
  block, index, total, blockDef, isExpanded, disabled,
  onToggle, onRemove, onDuplicate, onMoveUp, onMoveDown, renderField, onUpdate,
}: {
  block: Block; index: number; total: number; blockDef?: BlockDefinition
  isExpanded: boolean; disabled: boolean
  onToggle: () => void; onRemove: () => void; onDuplicate: () => void
  onMoveUp: () => void; onMoveDown: () => void
  renderField?: BlocksBuilderProps['renderField']
  onUpdate: (updates: Partial<Block>) => void
}) {
  const previewText = (() => {
    for (const f of ['headline', 'title', 'name', 'content', 'subheadline']) {
      if (block[f] && typeof block[f] === 'string') return block[f]
    }
    return null
  })()

  const grad = CATEGORY_GRADIENTS[blockDef?.admin?.category || ''] ?? CATEGORY_GRADIENTS.General

  return (
    <Reorder.Item
      value={block}
      drag={!disabled ? 'y' : false}
      whileDrag={{ scale: 1.01, zIndex: 50, boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
      className={cn(
        'group relative bg-app border rounded-none overflow-visible shadow-sm transition-colors duration-150',
        isExpanded ? 'border-accent/60 shadow-[0_0_0_3px_rgba(139,92,246,0.08)]' : 'border-border hover:border-white/20'
      )}
    >
      {/* Index Badge */}
      <div className={cn(
        'absolute -left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black border z-10 transition-all',
        isExpanded
          ? 'bg-accent text-white border-accent shadow-[0_0_8px_rgba(139,92,246,0.6)]'
          : 'bg-app text-gray-400 border-border group-hover:border-accent/40 group-hover:text-accent'
      )}>
        {index + 1}
      </div>

      {/* Accent bar when expanded */}
      {isExpanded && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-l" />}

      {/* Header Row */}
      <div className="flex items-center gap-2.5 px-4 py-3 cursor-pointer" onClick={onToggle}>
        {!disabled && (
          <div className="p-1 text-gray-400/30 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <GripVertical size={13} />
          </div>
        )}

        {/* Icon */}
        <div className={cn('w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-gradient-to-br text-white/70', grad)}>
          {getBlockIcon(block.blockType)}
        </div>

        {/* Labels */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-white truncate">
              {previewText || blockDef?.labels?.singular || block.blockType}
            </span>
            <span className="flex-shrink-0 px-1.5 py-px text-[8px] font-black uppercase tracking-wider text-gray-400 bg-white/[0.05] border border-border rounded">
              {block.blockType}
            </span>
          </div>
          {blockDef?.admin?.description && (
            <p className="text-[9px] text-gray-400/70 truncate mt-0.5">{blockDef.admin.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {!disabled && (
            <>
              <button type="button" onClick={onMoveUp} disabled={index === 0} title="Move Up" className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ArrowUp size={11} /></button>
              <button type="button" onClick={onMoveDown} disabled={index === total - 1} title="Move Down" className="p-1.5 text-gray-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ArrowDown size={11} /></button>
              <button type="button" onClick={onDuplicate} title="Duplicate" className="p-1.5 text-gray-400 hover:text-accent transition-colors"><Copy size={11} /></button>
              <button type="button" onClick={onRemove} title="Remove" className="p-1.5 text-gray-400 hover:text-danger transition-colors"><Trash2 size={11} /></button>
            </>
          )}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="p-1.5 text-gray-400/50 ml-0.5">
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
            <div className="px-5 pb-6 pt-4 border-t border-border bg-white/[0.05]/40">
              {blockDef ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blockDef.fields.map((f) => {
                    const fullWidth = ['richtext','textarea','blocks','array','media','code','collapsible'].includes(f.type)
                    return (
                      <div key={f.name} className={cn('flex flex-col gap-1.5', fullWidth && 'col-span-2')}>
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          {f.label || f.name}
                          {f.required && <span className="text-danger">*</span>}
                        </label>
                        {renderField
                          ? renderField(f as unknown as FieldConfig, block[f.name], (val: any) => onUpdate({ [f.name]: val }))
                          : <input type="text" value={(block[f.name] as string) || ''} onChange={(e) => onUpdate({ [f.name]: e.target.value })} placeholder={`Enter ${f.label || f.name}...`} className="w-full bg-app border border-border px-3 py-2 text-sm focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all rounded-none" />
                        }
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4 italic">Unknown block type: "{block.blockType}"</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

// ── Component Picker ──────────────────────────────────────────────────────────
function ComponentPicker({ blocksList, onSelect, onClose }: {
  blocksList: BlockDefinition[]; onSelect: (slug: string) => void; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const categories = ['All', ...Array.from(new Set(blocksList.map((b) => b.admin?.category || 'General')))]

  const filtered = blocksList.filter((b) => {
    const q = search.toLowerCase()
    const matchSearch = !q || b.slug.includes(q) || (b.labels?.singular || '').toLowerCase().includes(q) || (b.admin?.description || '').toLowerCase().includes(q)
    const matchCat = activeCategory === 'All' || (b.admin?.category || 'General') === activeCategory
    return matchSearch && matchCat
  })

  const grouped = activeCategory === 'All'
    ? filtered.reduce((acc, b) => {
        const cat = b.admin?.category || 'General'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(b)
        return acc
      }, {} as Record<string, BlockDefinition[]>)
    : { [activeCategory]: filtered }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="bg-app border border-border w-full max-w-2xl flex flex-col overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)] max-h-[88vh] rounded-none"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-black text-accent uppercase tracking-[0.4em] mb-1.5">Page Builder</p>
              <h3 className="text-xl font-black text-white">Add a Component</h3>
              <p className="text-[11px] text-gray-400 mt-1">Choose a component to add to your page layout</p>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white border border-border hover:border-white/20 transition-all rounded-none flex-shrink-0 mt-1">
              <X size={15} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input ref={searchRef} type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search components..." className="w-full bg-white/[0.05] border border-border pl-9 pr-9 py-2.5 text-sm focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all placeholder:text-gray-400/50 rounded-none" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X size={12} /></button>}
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button key={cat} type="button" onClick={() => setActiveCategory(cat)} className={cn('px-3 py-1.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap flex-shrink-0 transition-all rounded-none', activeCategory === cat ? 'bg-accent text-white' : 'bg-white/[0.05] border border-border text-gray-400 hover:text-white hover:border-accent/30')}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6 no-scrollbar">
          {Object.keys(grouped).length === 0 ? (
            <div className="text-center py-14">
              <Search size={28} className="mx-auto text-gray-400/20 mb-3" />
              <p className="text-sm font-semibold text-gray-400">No results for "{search}"</p>
              <p className="text-xs text-gray-400/60 mt-1">Try a different keyword</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, blocks]) => (
              <div key={category}>
                {activeCategory === 'All' && (
                  <div className="flex items-center gap-3 mb-4">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">{category}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {blocks.map((stock) => {
                    const grad = CATEGORY_GRADIENTS[stock.admin?.category || ''] ?? CATEGORY_GRADIENTS.General
                    return (
                      <motion.button
                        key={stock.slug}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSelect(stock.slug)}
                        className="flex flex-col text-left group border border-border bg-app hover:border-accent/60 hover:shadow-[0_0_18px_rgba(139,92,246,0.18)] transition-all overflow-hidden rounded-none"
                      >
                        <div className="w-full h-24 overflow-hidden relative flex-shrink-0">
                          {stock.admin?.imageURL ? (
                            <img src={stock.admin.imageURL} alt={stock.slug} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className={cn('absolute inset-0 bg-gradient-to-br flex items-center justify-center', grad)}>
                              <div className="text-white/40 group-hover:text-white/80 transition-colors" style={{ transform: 'scale(2)' }}>
                                {getBlockIcon(stock.slug)}
                              </div>
                            </div>
                          )}
                          {stock.admin?.category && (
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider bg-black/60 backdrop-blur text-white/80 rounded-sm">
                              {stock.admin.category}
                            </span>
                          )}
                          {stock.admin?.imageURL && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-black/50 backdrop-blur flex items-center justify-center text-white/70 rounded-sm">
                              {getBlockIcon(stock.slug)}
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 bg-app group-hover:bg-accent/5 transition-colors">
                          <p className="text-[11px] font-black text-white mb-0.5">{stock.labels?.singular || stock.slug}</p>
                          <p className="text-[9px] text-gray-400 leading-relaxed line-clamp-2">{stock.admin?.description || `Add ${stock.slug} to your page.`}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-white/[0.05]/60 flex items-center justify-between flex-shrink-0">
          <p className="text-[9px] text-gray-400">{filtered.length} component{filtered.length !== 1 ? 's' : ''} available</p>
          <p className="text-[9px] text-gray-400">
            Press <kbd className="px-1.5 py-0.5 bg-app border border-border font-mono rounded-sm text-[8px]">Esc</kbd> to close
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
const BlocksBuilder: React.FC<BlocksBuilderProps> = ({
  value, onChange, availableBlocks, renderField, disabled = false,
}) => {
  const apiBlocks = useBlockLibrary()
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const rawBlocks = (availableBlocks as BlockDefinition[]) || []
  const blocksList: BlockDefinition[] = rawBlocks.length > 0 ? rawBlocks : (apiBlocks.length > 0 ? apiBlocks : DEFAULT_BLOCKS)
  const blocks = value || []

  const toggleBlock = useCallback((key: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const addBlock = useCallback((slug: string) => {
    const def = blocksList.find((b) => b.slug === slug)
    const newId = 'block_' + crypto.randomUUID()
    const newBlock: Block = { 
      blockType: slug,
      _id: newId
    }
    def?.fields.forEach((f) => { if (f.defaultValue !== undefined) newBlock[f.name] = f.defaultValue })
    onChange([...blocks, newBlock])
    setIsPickerOpen(false)
    setExpandedIds((prev) => ({ ...prev, [newId]: true }))
  }, [blocks, blocksList, onChange])

  const removeBlock = useCallback((i: number) => {
    const next = blocks.filter((_, idx) => idx !== i)
    onChange(next)
  }, [blocks, onChange])

  const duplicateBlock = useCallback((i: number) => {
    const next = [...blocks]
    const newId = 'block_' + crypto.randomUUID()
    const dupBlock = { ...blocks[i], _id: newId }
    next.splice(i + 1, 0, dupBlock)
    onChange(next)
    setExpandedIds((prev) => ({ ...prev, [newId]: true }))
  }, [blocks, onChange])

  const moveBlock = useCallback((i: number, dir: 'up' | 'down') => {
    const next = [...blocks]
    const t = dir === 'up' ? i - 1 : i + 1
    if (t < 0 || t >= next.length) return
    ;[next[i], next[t]] = [next[t], next[i]]
    onChange(next)
  }, [blocks, onChange])

  const updateBlock = useCallback((i: number, updates: Partial<Block>) => {
    const next = [...blocks]
    next[i] = { ...next[i], ...updates }
    onChange(next)
  }, [blocks, onChange])

  const expandAll = useCallback(() => {
    const next: Record<string, boolean> = {}
    blocks.forEach((b, idx) => {
      const key = b._id || String(idx)
      next[key] = true
    })
    setExpandedIds(next)
  }, [blocks])

  const collapseAll = useCallback(() => {
    setExpandedIds({})
  }, [])

  return (
    <div className="flex flex-col gap-4 pl-5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers size={16} className="text-accent" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Page Components</span>
          {blocks.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-black bg-accent/15 text-accent border border-accent/25 rounded-full">
              {blocks.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {blocks.length > 0 && (
            <div className="flex items-center gap-1.5 border border-white/5 bg-white/[0.02] p-0.5 rounded-none mr-2">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-white transition-all hover:bg-white/[0.05]"
              >
                Expand All
              </button>
              <div className="w-px h-3 bg-white/10" />
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-400 hover:text-white transition-all hover:bg-white/[0.05]"
              >
                Collapse All
              </button>
            </div>
          )}
          {!disabled && (
            <button type="button" onClick={() => setIsPickerOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-[10px] font-black uppercase tracking-wider hover:bg-accent/90 transition-all shadow-sm shadow-accent/20 rounded-none">
              <Plus size={11} /> Add Component
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {blocks.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="border border-dashed border-border p-10 flex flex-col items-center gap-4 text-center bg-white/[0.05]/20 rounded-none">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Layers size={20} className="text-accent/50" />
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-1">No components yet</p>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">Build your page by stacking components — hero sections, feature grids, pricing tables and more.</p>
          </div>
          {!disabled && (
            <button type="button" onClick={() => setIsPickerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-[10px] font-black uppercase tracking-wider hover:bg-accent/90 transition-all shadow-sm shadow-accent/20 mt-1 rounded-none">
              <Plus size={12} /> Add Your First Component
            </button>
          )}
        </motion.div>
      )}

      {/* Block List */}
      <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-3">
        <AnimatePresence initial={false}>
          {blocks.map((block, index) => {
            const blockDef = blocksList.find((b) => b.slug === block.blockType)
            const blockKey = block._id || String(index)
            return (
              <motion.div
                key={`block-${blockKey}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8, height: 0, marginTop: 0 }}
                transition={{ duration: 0.15 }}
              >
                <BlockRow
                  block={block} index={index} total={blocks.length} blockDef={blockDef}
                  isExpanded={!!expandedIds[blockKey]} disabled={disabled}
                  onToggle={() => toggleBlock(blockKey)}
                  onRemove={() => removeBlock(index)}
                  onDuplicate={() => duplicateBlock(index)}
                  onMoveUp={() => moveBlock(index, 'up')}
                  onMoveDown={() => moveBlock(index, 'down')}
                  renderField={renderField}
                  onUpdate={(u) => updateBlock(index, u)}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </Reorder.Group>

      {/* Bottom Add Button */}
      {blocks.length > 0 && !disabled && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-border text-gray-400/60 text-[10px] font-black uppercase tracking-wider hover:border-accent/50 hover:text-accent hover:bg-accent/5 transition-all rounded-none"
        >
          <Plus size={11} /> Add Component
        </motion.button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isPickerOpen && (
          <ComponentPicker blocksList={blocksList} onSelect={addBlock} onClose={() => setIsPickerOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

export default BlocksBuilder
