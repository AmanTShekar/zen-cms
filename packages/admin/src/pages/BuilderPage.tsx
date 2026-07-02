import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Database, Save, Loader2, Trash2 } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface SchemaField {
 name: string
 type: string
 required?: boolean
}

interface SchemaConfig {
 id?: string
 slug: string
 singular: string
 plural: string
 fields: SchemaField[]
}

const FIELD_TYPES = ['text', 'number', 'boolean', 'richtext', 'date', 'email']

const BuilderPage: React.FC = () => {
 const { theme } = useTheme()
 const [schemas, setSchemas] = useState<SchemaConfig[]>([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [activeSchema, setActiveSchema] = useState<SchemaConfig | null>(null)

 useEffect(() => {
 loadSchemas()
 }, [])

 const loadSchemas = async () => {
 try {
 const res = await api.get('/schemas')
 setSchemas(res.data.data)
 } catch {
 toast.error('Failed to load schemas')
 } finally {
 setLoading(false)
 }
 }

 const handleCreateNew = () => {
 setActiveSchema({
 slug: '',
 singular: '',
 plural: '',
 fields: [{ name: 'title', type: 'text', required: true }]
 })
 }

 const addField = () => {
 if (!activeSchema) return
 setActiveSchema({
 ...activeSchema,
 fields: [...activeSchema.fields, { name: '', type: 'text' }]
 })
 }

 const updateField = (index: number, key: keyof SchemaField, value: any) => {
 if (!activeSchema) return
 const newFields = [...activeSchema.fields]
 newFields[index] = { ...newFields[index], [key]: value }
 setActiveSchema({ ...activeSchema, fields: newFields })
 }

 const removeField = (index: number) => {
 if (!activeSchema) return
 const newFields = [...activeSchema.fields]
 newFields.splice(index, 1)
 setActiveSchema({ ...activeSchema, fields: newFields })
 }

 const handleSave = async () => {
 if (!activeSchema || !activeSchema.slug) {
 toast.error('Schema slug is required')
 return
 }
 setSaving(true)
 try {
 if (activeSchema.id) {
 await api.put(`/schemas/${activeSchema.id}`, activeSchema)
 toast.success('Schema updated successfully')
 } else {
 await api.post('/schemas', activeSchema)
 toast.success('Schema created successfully')
 }
 loadSchemas()
 setActiveSchema(null)
 } catch (err: any) {
 toast.error(err.response?.data?.message || 'Failed to save schema')
 } finally {
 setSaving(false)
 }
 }

 return (
 <div className="flex h-[calc(100vh-64px)] overflow-hidden">
 {/* Sidebar List */}
 <div className={cn(
 'w-64 border-r shrink-0 flex flex-col',
 theme === 'dark' ? 'border-z-border bg-app' : 'border-z-border bg-[var(--z-bg-input)]'
 )}>
 <div className="p-4 border-b border-inherit flex items-center justify-between">
 <h2 className="text-sm font-semibold flex items-center gap-2">
 <Database size={14} /> Models
 </h2>
 <button
 onClick={handleCreateNew}
 className="p-1.5 hover:bg-z-panel text-z-secondary  rounded-none transition-colors"
 >
 <Plus size={14} />
 </button>
 </div>
 <div className="flex-1 overflow-auto p-2 space-y-1">
 {loading ? (
 <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-z-muted" size={16} /></div>
 ) : schemas.map(s => (
 <button
 key={s.id}
 onClick={() => setActiveSchema(s)}
 className={cn(
 'w-full text-left px-3 py-2 text-sm font-bold   transition-colors',
 activeSchema?.id === s.id
 ? 'bg-z-border text-z-primary'
 : theme === 'dark'
 ? 'text-z-muted hover:bg-z-hover hover:text-z-primary'
 : 'text-z-secondary hover:bg-app/5 hover:text-z-primary'
 )}
 >
 {s.singular}
 </button>
 ))}
 {!loading && schemas.length === 0 && (
 <div className="p-4 text-center text-sm text-z-secondary">
 No schemas found
 </div>
 )}
 </div>
 </div>

 {/* Editor Main */}
 <div className="flex-1 overflow-auto bg-inherit p-8 relative">
 {activeSchema ? (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-3xl mx-auto space-y-8"
 >
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-semibold">Content-Type Builder</h1>
 <p className="text-sm text-z-secondary font-bold mt-1">Design your database schema visually</p>
 </div>
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 px-6 py-3 bg-z-accent  hover:bg-z-base text-z-primary text-sm font-semibold shadow-lg transition-all"
 >
 {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
 Save Schema
 </button>
 </div>

 <div className={cn(
 'p-6 border space-y-4',
 'bg-z-panel border-z-border shadow-sm'
 )}>
 <h3 className="text-sm font-semibold text-z-secondary  mb-4 border-b border-z-border/20 pb-2">General Info</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-1">
 <label className="text-sm font-bold text-z-secondary">Singular Name</label>
 <input
 type="text"
 value={activeSchema.singular}
 onChange={(e) => setActiveSchema({ ...activeSchema, singular: e.target.value })}
 className={cn(
 'w-full border p-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
 theme === 'dark' ? 'bg-app border-z-border focus:border-z-border' : 'bg-z-input border-z-border focus:border-z-border'
 )}
 placeholder="e.g. Article"
 />
 </div>
 <div className="space-y-1">
 <label className="text-sm font-bold text-z-secondary">Plural Name</label>
 <input
 type="text"
 value={activeSchema.plural}
 onChange={(e) => setActiveSchema({ ...activeSchema, plural: e.target.value })}
 className={cn(
 'w-full border p-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
 theme === 'dark' ? 'bg-app border-z-border focus:border-z-border' : 'bg-z-input border-z-border focus:border-z-border'
 )}
 placeholder="e.g. Articles"
 />
 </div>
 <div className="space-y-1 col-span-2">
 <label className="text-sm font-bold text-z-secondary">Database Slug (API Route)</label>
 <input
 type="text"
 value={activeSchema.slug}
 onChange={(e) => setActiveSchema({ ...activeSchema, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
 disabled={!!activeSchema.id}
 className={cn(
 'w-full border p-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors',
 theme === 'dark' ? 'bg-app border-z-border focus:border-z-border disabled:opacity-50' : 'bg-z-input border-z-border focus:border-z-border disabled:opacity-50'
 )}
 placeholder="e.g. articles"
 />
 </div>
 </div>
 </div>

 <div className={cn(
 'p-6 border space-y-4',
 'bg-z-panel border-z-border shadow-sm'
 )}>
 <div className="flex items-center justify-between mb-4 border-b border-z-border/20 pb-2">
 <h3 className="text-sm font-semibold text-z-secondary ">Fields Configuration</h3>
 <button
 onClick={addField}
 className="flex items-center gap-1 text-sm font-semibold text-z-secondary hover:text-z-secondary"
 >
 <Plus size={12} /> Add Field
 </button>
 </div>
 
 <div className="space-y-3">
 {activeSchema.fields.map((field, idx) => (
 <div key={idx} className={cn(
 'flex items-center gap-3 p-3 border group',
 theme === 'dark' ? 'bg-app border-z-border' : 'bg-z-input border-z-border'
 )}>
 <input
 type="text"
 value={field.name}
 onChange={e => updateField(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
 placeholder="field_name"
 className="flex-1 bg-transparent border-b border-transparent focus:border-z-border text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1"
 />
 <select
 value={field.type}
 onChange={e => updateField(idx, 'type', e.target.value)}
 className="w-32 bg-transparent border-b border-transparent focus:border-z-border text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1"
 >
 {FIELD_TYPES.map(t => <option key={t} value={t} className="text-z-primary">{t}</option>)}
 </select>
 <label className="flex items-center gap-2 text-sm font-bold text-z-muted">
 <input
 type="checkbox"
 checked={field.required || false}
 onChange={e => updateField(idx, 'required', e.target.checked)}
 className="accent-gray-500"
 />
 Req
 </label>
 <button
 onClick={() => removeField(idx)}
 className="text-red-500/50 hover:text-red-500 transition-colors p-1"
 >
 <Trash2 size={14} />
 </button>
 </div>
 ))}
 </div>
 </div>
 </motion.div>
 ) : (
 <div className="h-full flex items-center justify-center">
 <div className="text-center space-y-4 max-w-sm">
 <Database size={48} className="mx-auto text-z-primary/5 dark:text-z-primary/10" strokeWidth={1} />
 <p className="text-sm font-semibold text-z-muted">Schema Architect</p>
 <p className="text-sm font-bold text-z-secondary leading-relaxed">
 Select an existing collection model from the sidebar to edit, or deploy a new visual schema.
 </p>
 </div>
 </div>
 )}
 </div>
 </div>
 )
}

export default BuilderPage
