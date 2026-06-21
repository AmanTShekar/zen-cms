import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, Copy, Download, Braces } from 'lucide-react'
import { cn } from '../../lib/utils'

const FIELD_TYPES = [
 'text', 'textarea', 'number', 'boolean', 'richtext', 'date',
 'email', 'media', 'relation', 'color', 'array', 'group', 'blocks', 'dz',
 'select', 'json', 'slug', 'code', 'password',
]

const CATEGORIES = ['General', 'Layout', 'Content', 'Commerce', 'Media', 'Social', 'Navigation', 'Forms']

export const BuilderVisualTab = ({
  activeComponent,
  setActiveComponent,
  showPreview,
  generateJSON,
  generateTS,
  copied,
  setCopied,
  dark
}: any) => {
  const inputCls = cn(
    'w-full border p-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none shadow-sm',
    'z-input'
  )

  const addField = () => {
    setActiveComponent({
      ...activeComponent,
      fields: [...activeComponent.fields, { name: '', type: 'text' }]
    })
  }

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...activeComponent.fields]
    newFields[index] = { ...newFields[index], [key]: value }
    setActiveComponent({ ...activeComponent, fields: newFields })
  }

  const removeField = (index: number) => {
    const newFields = [...activeComponent.fields]
    newFields.splice(index, 1)
    setActiveComponent({ ...activeComponent, fields: newFields })
  }

  return (
    <motion.div key="visual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
      {/* General info */}
      <div className={cn('p-6 border rounded-none space-y-4 shadow-sm transition-all', 'z-panel')}>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-z-secondary border-b border-gray-500/20 pb-2">General Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-z-secondary block">Display Name</label>
            <input type="text" value={activeComponent.displayName} onChange={(e) => setActiveComponent({ ...activeComponent, displayName: e.target.value })} className={inputCls} placeholder="e.g. Hero Section" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-z-secondary block">Category</label>
            <select value={activeComponent.category} onChange={(e) => setActiveComponent({ ...activeComponent, category: e.target.value })} className={cn(inputCls, 'cursor-pointer')}>
              {CATEGORIES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-bold text-z-secondary block">Component Slug (API ID)</label>
            <input type="text" value={activeComponent.slug} onChange={(e) => setActiveComponent({ ...activeComponent, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} disabled={!!activeComponent.id} className={cn(inputCls, 'font-mono disabled:opacity-50')} placeholder="e.g. hero-section" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-bold text-z-secondary block">Description</label>
            <input type="text" value={activeComponent.description} onChange={(e) => setActiveComponent({ ...activeComponent, description: e.target.value })} className={inputCls} placeholder="Brief description of this component..." />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className={cn('p-6 border rounded-none shadow-sm transition-all', 'z-panel')}>
        <div className="flex items-center justify-between mb-5 border-b border-gray-500/20 pb-2">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-z-secondary">Fields Configuration</h3>
          <button onClick={addField} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-z-muted hover:text-white hover:bg-z-active-bg px-3 py-1.5 bg-gray-500/10 rounded-none transition-all">
            <Plus size={12} /> Add Field
          </button>
        </div>
        <div className="space-y-3">
          <AnimatePresence>
            {activeComponent.fields.map((field: any, idx: number) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn('flex items-center gap-3 p-3.5 border rounded-none group shadow-sm transition-all', dark ? 'bg-black/40 backdrop-blur-sm border-z-border hover:border-z-active-border' : 'bg-z-input border-z-border hover:border-z-border-strong')}
              >
                <input
                  type="text"
                  value={field.name}
                  onChange={e => updateField(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="field_name"
                  className="flex-1 bg-transparent border-b border-transparent focus:border-z-accent text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1 transition-colors"
                />
                <select
                  value={field.type}
                  onChange={e => updateField(idx, 'type', e.target.value)}
                  className="w-36 bg-transparent border-b border-transparent focus:border-z-accent text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1 transition-colors cursor-pointer"
                >
                  {FIELD_TYPES.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm font-semibold text-z-muted">
                  <input type="checkbox" checked={field.required || false} onChange={e => updateField(idx, 'required', e.target.checked)} className="accent-z-accent" />
                  Req
                </label>
                <button onClick={() => removeField(idx)} className="text-red-500/40 hover:text-red-500 transition-colors p-1.5 rounded-none opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {showPreview && (
        <div className={cn('p-6 border rounded-none shadow-sm transition-all', 'z-panel')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-z-active-text flex items-center gap-2">
              <Braces size={12} /> Live JSON Preview
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(generateJSON()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 border text-sm font-semibold   rounded-none transition-all', dark ? 'border-z-border hover:bg-z-hover' : 'border-z-border hover:bg-gray-50')}
              >
                {copied ? <Check size={12} className="text-gray-600 dark:text-z-secondary" /> : <Copy size={12} />} Copy JSON
              </button>
              <button
                onClick={() => { const blob = new Blob([generateTS()], { type: 'text/typescript' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${activeComponent.slug || 'component'}.ts`; a.click() }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 border text-sm font-semibold   rounded-none transition-all text-z-active-text border-z-active-border hover:bg-z-active-bg')}
              >
                <Download size={12} /> TypeScript
              </button>
            </div>
          </div>
          <pre className={cn('text-sm font-mono overflow-auto max-h-64 p-4 rounded-none text-gray-600 dark:text-z-muted shadow-inner border', dark ? 'bg-z-popover border-z-border' : 'bg-gray-900 border-gray-800')}>{generateJSON()}</pre>
        </div>
      )}
    </motion.div>
  )
}
