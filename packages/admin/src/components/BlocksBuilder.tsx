import React, { useState } from 'react'
import {
  Plus,
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layout,
  Layers,
  Box,
  CreditCard,
  Target,
  Sparkles,
  Puzzle,
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { cn } from '../lib/utils'

interface Block {
  blockType: string
  [key: string]: any
}

interface BlockField {
  name: string
  label?: string
  type: string
  required?: boolean
  defaultValue?: any
  [key: string]: any
}

interface BlockDefinition {
  slug: string
  labels?: { singular: string; plural: string }
  fields: BlockField[]
  admin?: {
    description?: string
    icon?: string
  }
}

interface BlocksBuilderProps {
  value: Block[]
  onChange: (value: Block[]) => void
  availableBlocks?: unknown[]
  renderField?: (
    field: any,
    value: any,
    onChange: (val: any) => void
  ) => React.ReactNode
  disabled?: boolean
}

const getBlockIcon = (slug: string) => {
  switch (slug) {
    case 'hero':
      return <Sparkles size={14} />
    case 'features':
      return <Layout size={14} />
    case 'pricing':
      return <CreditCard size={14} />
    case 'testimonials':
      return <Target size={14} />
    case 'plugin-node':
      return <Puzzle size={14} />
    default:
      return <Box size={14} />
  }
}

const BlocksBuilder: React.FC<BlocksBuilderProps> = ({
  value,
  onChange,
  availableBlocks,
  renderField,
  disabled = false,
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const rawBlocks = (availableBlocks as BlockDefinition[]) || []

  const blocksList: BlockDefinition[] =
    rawBlocks.length > 0
      ? rawBlocks
      : [
          {
            slug: 'hero',
            labels: { singular: 'Hero_Banner', plural: 'Hero_Banners' },
            fields: [
              { name: 'headline', label: 'Headline_Attribute', type: 'text' },
              { name: 'content', label: 'Body_Configuration', type: 'textarea' },
            ],
            admin: { description: 'High-impact entry node with cinematic text and media.' },
          },
          {
            slug: 'features',
            labels: { singular: 'Feature_Grid', plural: 'Feature_Grids' },
            fields: [
              { name: 'headline', label: 'Headline_Attribute', type: 'text' },
              { name: 'content', label: 'Body_Configuration', type: 'textarea' },
            ],
            admin: { description: 'Surgical arrangement of service attributes or product highlights.' },
          },
          {
            slug: 'pricing',
            labels: { singular: 'Pricing_Matrix', plural: 'Pricing_Matrices' },
            fields: [
              { name: 'headline', label: 'Headline_Attribute', type: 'text' },
              { name: 'content', label: 'Body_Configuration', type: 'textarea' },
            ],
            admin: { description: 'Tiered subscription or product pricing visualization.' },
          },
          {
            slug: 'testimonials',
            labels: { singular: 'Social_Proof', plural: 'Social_Proofs' },
            fields: [
              { name: 'headline', label: 'Headline_Attribute', type: 'text' },
              { name: 'content', label: 'Body_Configuration', type: 'textarea' },
            ],
            admin: { description: 'Trust-building feedback stream from the user collective.' },
          },
        ]

  const addBlock = (slug: string) => {
    const blockDef = blocksList.find((b) => b.slug === slug)
    const newBlock: Block = { blockType: slug }

    blockDef?.fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        newBlock[f.name] = f.defaultValue
      }
    })

    onChange([...(value || []), newBlock])
    setIsPickerOpen(false)
    setExpandedIndex((value || []).length)
  }

  const removeBlock = (index: number) => {
    const newValue = [...(value || [])]
    newValue.splice(index, 1)
    onChange(newValue)
  }

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newValue = [...(value || [])]
    newValue[index] = { ...newValue[index], ...updates }
    onChange(newValue)
  }

  return (
    <div className="flex flex-col gap-6 select-none">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-2">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-accent" />
          <h3 className="text-[11px] font-black text-text-primary uppercase tracking-[0.2em] italic">
            Structural_Manifest
          </h3>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="w-8 h-8 rounded-none bg-accent-hover text-white flex items-center justify-center hover:scale-110 shadow-lg shadow-accent/10 transition-all"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <Reorder.Group axis="y" values={value || []} onReorder={onChange} className="space-y-3">
        {(value || []).map((block, index) => {
          const blockDef = blocksList.find((b) => b.slug === block.blockType)
          const blockLabel = blockDef?.labels?.singular || block.blockType

          return (
            <Reorder.Item
              key={`${block.blockType}-${index}`}
              value={block}
              drag={!disabled ? "y" : false}
              className={cn(
                'group relative bg-app border border-border rounded-none overflow-hidden shadow-sm hover:shadow-md transition-all duration-300',
                expandedIndex === index && 'border-accent ring-4 ring-accent/5 shadow-xl'
              )}
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                {!disabled && (
                  <div className="p-2 text-text-muted group-hover:text-text-primary transition-colors">
                    <GripVertical size={14} />
                  </div>
                )}
                <div className="w-8 h-8 rounded-none bg-app-subtle flex items-center justify-center text-text-muted group-hover:text-accent transition-all shadow-inner">
                  {getBlockIcon(block.blockType)}
                </div>
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-text-primary uppercase tracking-tight truncate">
                    {block.headline || blockLabel}
                  </span>
                  <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest italic">
                    {block.blockType}
                  </span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeBlock(index)
                      }}
                      className="p-2 text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="text-text-muted">
                    {expandedIndex === index ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedIndex === index && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border bg-app-subtle"
                  >
                    <div className="p-6 space-y-5">
                      {blockDef ? (
                        blockDef.fields.map((subField) => (
                          <div key={subField.name} className="space-y-1.5">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest italic px-1">
                              {subField.label || subField.name}
                              {subField.required && <span className="text-danger ml-1">*</span>}
                            </label>
                            {renderField ? (
                              renderField(
                                subField,
                                block[subField.name],
                                (val: any) => updateBlock(index, { [subField.name]: val })
                              )
                            ) : (
                              <input
                                type="text"
                                value={block[subField.name] || ''}
                                onChange={(e) =>
                                  updateBlock(index, { [subField.name]: e.target.value })
                                }
                                className="w-full bg-app border border-border rounded-none p-2 text-xs font-bold focus:ring-2 focus:ring-accent/10 outline-none transition-all"
                              />
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-text-muted italic">Unknown block configuration.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Reorder.Item>
          )
        })}
      </Reorder.Group>

      {/* 🧩 Block Injection Interface */}
      <AnimatePresence>
        {isPickerOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-app rounded-none w-full max-w-lg overflow-hidden shadow-2xl border border-border"
            >
              <div className="p-8 border-b border-border flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-accent uppercase tracking-[0.4em] italic">
                    ARCHITECT_INJECTION
                  </span>
                  <h3 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic">
                    Inject_New_Node
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="p-2 text-text-muted hover:text-text-primary transition-colors"
                >
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto no-scrollbar">
                {blocksList.map((stock) => (
                  <button
                    key={stock.slug}
                    type="button"
                    onClick={() => addBlock(stock.slug)}
                    className="flex items-start gap-5 p-5 hover:bg-accent/5 rounded-none text-left group transition-all relative overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-none bg-app border border-border flex items-center justify-center text-text-muted group-hover:bg-app-subtle group-hover:text-accent group-hover:shadow-sm transition-all shadow-inner">
                      {getBlockIcon(stock.slug)}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-black text-text-primary uppercase italic tracking-tight">
                        {stock.labels?.singular || stock.slug}
                      </span>
                      <p className="text-[11px] text-text-muted font-medium leading-tight">
                        {stock.admin?.description || `Custom schema block configuration for ${stock.slug}.`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default BlocksBuilder
