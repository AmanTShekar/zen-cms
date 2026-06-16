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
    'w-full border p-3 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded',
    dark ? 'bg-black border-white/[0.08] focus:border-gray-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-gray-500 text-black'
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
      <div className={cn('p-6 border rounded-none space-y-4', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm')}>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 border-b border-gray-500/20 pb-2">General Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Display Name</label>
            <input type="text" value={activeComponent.displayName} onChange={(e) => setActiveComponent({ ...activeComponent, displayName: e.target.value })} className={inputCls} placeholder="e.g. Hero Section" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Category</label>
            <select value={activeComponent.category} onChange={(e) => setActiveComponent({ ...activeComponent, category: e.target.value })} className={cn(inputCls, 'cursor-pointer')}>
              {CATEGORIES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Component Slug (API ID)</label>
            <input type="text" value={activeComponent.slug} onChange={(e) => setActiveComponent({ ...activeComponent, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} disabled={!!activeComponent.id} className={cn(inputCls, 'font-mono disabled:opacity-50')} placeholder="e.g. hero-section" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block">Description</label>
            <input type="text" value={activeComponent.description} onChange={(e) => setActiveComponent({ ...activeComponent, description: e.target.value })} className={inputCls} placeholder="Brief description of this component..." />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className={cn('p-6 border rounded-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm')}>
        <div className="flex items-center justify-between mb-5 border-b border-gray-500/20 pb-2">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500">Fields Configuration</h3>
          <button onClick={addField} className="flex items-center gap-1.5 text-[9px] font-black text-gray-600 dark:text-gray-400 hover:text-gray-300 uppercase tracking-widest px-3 py-1.5 bg-gray-500/10 rounded-none">
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
                className={cn('flex items-center gap-3 p-3.5 border rounded-none group', dark ? 'bg-black border-white/[0.06]' : 'bg-gray-50 border-gray-200 shadow-sm')}
              >
                <input
                  type="text"
                  value={field.name}
                  onChange={e => updateField(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="field_name"
                  className="flex-1 bg-transparent border-b border-transparent focus:border-gray-500 text-[11px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1 transition-colors"
                />
                <select
                  value={field.type}
                  onChange={e => updateField(idx, 'type', e.target.value)}
                  className="w-36 bg-transparent border-b border-transparent focus:border-gray-500 text-[10px] font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1 transition-colors cursor-pointer"
                >
                  {FIELD_TYPES.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                </select>
                <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                  <input type="checkbox" checked={field.required || false} onChange={e => updateField(idx, 'required', e.target.checked)} className="accent-gray-500" />
                  Req
                </label>
                <button onClick={() => removeField(idx)} className="text-red-500/40 hover:text-red-500 transition-colors p-1.5 rounded opacity-0 group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {showPreview && (
        <div className={cn('p-6 border rounded-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <Braces size={12} /> Live JSON Preview
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(generateJSON()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 border text-[9px] font-black uppercase tracking-widest rounded-none transition-all', dark ? 'border-white/[0.08] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')}
              >
                {copied ? <Check size={12} className="text-gray-600 dark:text-gray-500" /> : <Copy size={12} />} Copy JSON
              </button>
              <button
                onClick={() => { const blob = new Blob([generateTS()], { type: 'text/typescript' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${activeComponent.slug || 'component'}.ts`; a.click() }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 border text-[9px] font-black uppercase tracking-widest rounded-none transition-all text-blue-400 border-blue-400/20 hover:bg-blue-500/10')}
              >
                <Download size={12} /> TypeScript
              </button>
            </div>
          </div>
          <pre className={cn('text-[11px] font-mono overflow-auto max-h-64 p-4 rounded-none text-gray-600 dark:text-gray-400', dark ? 'bg-black' : 'bg-gray-900')}>{generateJSON()}</pre>
        </div>
      )}
    </motion.div>
  )
}
