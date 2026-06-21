import { useState, useEffect, useCallback } from 'react'
import {
 Plus, Database, Code, Copy, Check, Trash2, Box, Layers, Settings, X,
 Save, Loader2, ChevronDown, ChevronRight, Sparkles, RefreshCw, List,
 AlertCircle, Eye, EyeOff, Hash, Globe, Lock, Calendar, FileText,
 Image, Link2, ToggleLeft, AlignLeft, Braces, Tag
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'
import { cn } from '../lib/utils'

// ── Full field type catalogue ────────────────────────────────────────────────
const FIELD_TYPES = [
 { value: 'text', label: 'Text', icon: FileText, color: '#6b7280' },
 { value: 'textarea', label: 'Textarea', icon: AlignLeft, color: '#6b7280' },
 { value: 'number', label: 'Number', icon: Hash, color: '#3b82f6' },
 { value: 'email', label: 'Email', icon: Globe, color: 'var(--z-accent)' },
 { value: 'password', label: 'Password', icon: Lock, color: '#ef4444' },
 { value: 'checkbox', label: 'Checkbox / Boolean', icon: ToggleLeft, color: 'var(--z-accent)' },
 { value: 'date', label: 'Date', icon: Calendar, color: '#f59e0b' },
 { value: 'select', label: 'Select / Enum', icon: List, color: '#f97316' },
 { value: 'media', label: 'Media / Image', icon: Image, color: '#06b6d4' },
 { value: 'richtext', label: 'Rich Text', icon: FileText, color: '#84cc16' },
 { value: 'relation', label: 'Relation', icon: Link2, color: '#ec4899' },
 { value: 'json', label: 'JSON Object', icon: Braces, color: '#6366f1' },
 { value: 'slug', label: 'Slug', icon: Tag, color: 'var(--z-accent)' },
 { value: 'array', label: 'Array / Repeater', icon: Layers, color: '#f59e0b' },
 { value: 'blocks', label: 'Dynamic Blocks', icon: Box, color: 'var(--z-accent)' },
 { value: 'group', label: 'Field Group', icon: Settings, color: '#3b82f6' },
 { value: 'code', label: 'Code Editor', icon: Code, color: '#6b7280' },
 { value: 'color', label: 'Color Picker', icon: Eye, color: '#f97316' },
] as const

type FieldType = typeof FIELD_TYPES[number]['value']

interface FieldConfig {
 name: string
 type: FieldType
 label?: string
 required?: boolean
 unique?: boolean
 index?: boolean
 hidden?: boolean
 readOnly?: boolean
 placeholder?: string
 description?: string
 defaultValue?: any
 min?: number
 max?: number
 regex?: string
 width?: string
 // select options
 options?: { label: string; value: string }[]
 // relation
 relationTo?: string
 hasMany?: boolean
 // array sub-fields
 fields?: FieldConfig[]
}

interface CollectionSettings {
 drafts: boolean
 timestamps: boolean
 versions: boolean
 publicRead: boolean
 singleton: boolean
 auth: boolean
 softDelete: boolean
}

interface SavedSchema {
 _id?: string
 id?: string
 slug: string
 singular?: string
 plural?: string
 fields?: FieldConfig[]
 settings?: CollectionSettings
 createdAt?: string
 isCodeFirst?: boolean
}

const DEFAULT_SETTINGS: CollectionSettings = {
 drafts: true,
 timestamps: true,
 versions: false,
 publicRead: false,
 singleton: false,
 auth: false,
 softDelete: false,
}

// ── Helper ────────────────────────────────────────────────────────────────────
function makeSlug(name: string): string {
 return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ── Field Type Picker ─────────────────────────────────────────────────────────
function FieldTypePicker({ value, onChange, theme }: { value: FieldType; onChange: (t: FieldType) => void; theme: string }) {
 const [open, setOpen] = useState(false)
 const current = FIELD_TYPES.find(t => t.value === value)
 const Icon = current?.icon || FileText
 return (
 <div className="relative">
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className={cn(
 'flex items-center gap-2 px-3 py-2 border text-sm font-semibold   transition-all w-full shadow-sm rounded-none',
 'z-card-interactive'
 )}
 >
 <Icon size={12} style={{ color: current?.color }} />
 <span className="flex-1 text-left">{current?.label || 'Select type'}</span>
 <ChevronDown size={10} className="text-z-secondary" />
 </button>
 <AnimatePresence>
 {open && (
 <motion.div
 initial={{ opacity: 0, y: 4 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 4 }}
 className={cn(
 'absolute z-50 top-full left-0 mt-1 w-64 border shadow-sm max-h-72 overflow-y-auto rounded-none',
 theme === 'dark' ? 'bg-z-popover backdrop-blur-xl border-z-border' : 'bg-z-panel border-z-border'
 )}
 >
 {FIELD_TYPES.map(ft => {
 const FtIcon = ft.icon
 return (
 <button
 key={ft.value}
 type="button"
 onClick={() => { onChange(ft.value); setOpen(false) }}
 className={cn(
 'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold   transition-all rounded-none',
 value === ft.value
 ? 'bg-z-accent text-white'
 : theme === 'dark' ? 'text-z-muted hover:bg-z-hover hover:text-white' : 'text-gray-600 hover:bg-gray-50'
 )}
 >
 <FtIcon size={12} style={{ color: value === ft.value ? 'white' : ft.color }} />
 {ft.label}
 </button>
 )
 })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

// ── Nested Fields Editor ──────────────────────────────────────────────────────
function NestedFieldsEditor({
  fields, onUpdate, theme, availableCollections
}: {
  fields: FieldConfig[]
  onUpdate: (fields: FieldConfig[]) => void
  theme: string
  availableCollections: string[]
}) {
  const inputClass = cn(
    'w-full border p-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-z-active-border transition-colors rounded-none shadow-sm',
    'z-input'
  )
  
  const addField = () => onUpdate([...fields, { name: `field${fields.length + 1}`, type: 'text', label: `Field ${fields.length + 1}` }])
  const removeField = (index: number) => onUpdate(fields.filter((_, i) => i !== index))
  const updateField = (index: number, key: string, value: any) => {
    const next = [...fields]
    next[index] = { ...next[index], [key]: value }
    onUpdate(next)
  }

  return (
    <div className="space-y-4 mt-4 border-l-2 border-z-accent/50 pl-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-z-secondary">Nested Fields Configuration</label>
        <button type="button" onClick={addField} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-none transition-all">
          <Plus size={12} /> Add Sub-field
        </button>
      </div>

      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={i} className="p-4 relative group rounded-none bg-black/20 border border-white/10">
            <button type="button" onClick={() => removeField(i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all rounded-none">
              <Trash2 size={12} />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-6">
              <div>
                <label className="text-xs font-semibold text-z-secondary block mb-1">Field Name</label>
                <input type="text" value={field.name} onChange={e => updateField(i, 'name', e.target.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''))} className={inputClass} placeholder="name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-z-secondary block mb-1">Field Type</label>
                <FieldTypePicker value={field.type} onChange={v => updateField(i, 'type', v)} theme={theme} />
              </div>
              <div>
                <label className="text-xs font-semibold text-z-secondary block mb-1">Display Label</label>
                <input type="text" value={field.label || ''} onChange={e => updateField(i, 'label', e.target.value)} className={inputClass} placeholder="Label" />
              </div>
            </div>
            
            <div className="mt-2">
               <FieldAdvancedPanel field={field} onUpdate={(key, value) => updateField(i, key, value)} theme={theme} availableCollections={availableCollections} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Advanced Field Panel ──────────────────────────────────────────────────────
function FieldAdvancedPanel({
 field, onUpdate, theme, availableCollections
}: {
 field: FieldConfig
 onUpdate: (key: string, value: any) => void
 theme: string
 availableCollections: string[]
}) {
 const [open, setOpen] = useState(false)
 const inputClass = cn(
 'w-full border p-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded-none shadow-sm',
 'z-input'
 )
 const checkClass = 'accent-gray-500 w-3.5 h-3.5'
 const labelClass = 'text-sm font-semibold   text-z-secondary'

 return (
 <div className="mt-2">
 <button
 type="button"
 onClick={() => setOpen(!open)}
 className="flex items-center gap-1.5 text-sm font-semibold text-z-secondary hover:text-gray-600 dark:text-z-secondary transition-colors"
 >
 {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
 Advanced Options
 </button>
 <AnimatePresence>
 {open && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className={cn('mt-3 p-4 border space-y-4 rounded-none shadow-sm', 'z-panel shadow-sm')}>
 {/* Flags */}
 <div className="flex flex-wrap gap-x-6 gap-y-2">
 {[
 ['required', 'Required'],
 ['unique', 'Unique'],
 ['index', 'Index'],
 ['hidden', 'Hidden'],
 ['readOnly', 'Read Only'],
 ].map(([key, lbl]) => (
 <label key={key} className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={!!(field as any)[key]}
 onChange={e => onUpdate(key, e.target.checked)}
 className={checkClass}
 />
 <span className={labelClass}>{lbl}</span>
 </label>
 ))}
 </div>

 {/* Text inputs */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Placeholder</label>
 <input type="text" value={field.placeholder || ''} onChange={e => onUpdate('placeholder', e.target.value)} className={inputClass} />
 </div>
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Default Value</label>
 <input type="text" value={field.defaultValue ?? ''} onChange={e => onUpdate('defaultValue', e.target.value)} className={inputClass} />
 </div>
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Description</label>
 <input type="text" value={field.description || ''} onChange={e => onUpdate('description', e.target.value)} className={inputClass} />
 </div>
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Width (e.g. 50%)</label>
 <input type="text" value={field.width || ''} onChange={e => onUpdate('width', e.target.value)} className={inputClass} />
 </div>
 {(field.type === 'text' || field.type === 'textarea') && (
 <>
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Min Length</label>
 <input type="number" value={field.min ?? ''} onChange={e => onUpdate('min', Number(e.target.value))} className={inputClass} />
 </div>
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Max Length</label>
 <input type="number" value={field.max ?? ''} onChange={e => onUpdate('max', Number(e.target.value))} className={inputClass} />
 </div>
 <div className="col-span-2">
 <label className={cn(labelClass, 'block mb-1')}>Regex Pattern</label>
 <input type="text" value={field.regex || ''} onChange={e => onUpdate('regex', e.target.value)} className={inputClass} placeholder="^[a-z]+$" />
 </div>
 </>
 )}
 {field.type === 'number' && (
 <>
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Min</label>
 <input type="number" value={field.min ?? ''} onChange={e => onUpdate('min', Number(e.target.value))} className={inputClass} />
 </div>
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Max</label>
 <input type="number" value={field.max ?? ''} onChange={e => onUpdate('max', Number(e.target.value))} className={inputClass} />
 </div>
 </>
 )}
 </div>

 {/* Relation options */}
 {field.type === 'relation' && (
 <div className="space-y-3">
 <div>
 <label className={cn(labelClass, 'block mb-1')}>Relates To Collection</label>
 <select
 value={field.relationTo || ''}
 onChange={e => onUpdate('relationTo', e.target.value)}
 className={cn(inputClass, 'cursor-pointer')}
 >
 <option value="">-- Select Collection --</option>
 {availableCollections.map(col => (
 <option key={col} value={col}>{col}</option>
 ))}
 </select>
 </div>
 <label className="flex items-center gap-2 cursor-pointer">
 <input
 type="checkbox"
 checked={!!field.hasMany}
 onChange={e => onUpdate('hasMany', e.target.checked)}
 className={checkClass}
 />
 <span className={labelClass}>Has Many (array of references)</span>
 </label>
 </div>
 )}

 {/* Nested fields for array/group */}
 {(field.type === 'array' || field.type === 'group') && (
 <NestedFieldsEditor
 fields={field.fields || []}
 onUpdate={newFields => onUpdate('fields', newFields)}
 theme={theme}
 availableCollections={availableCollections}
 />
 )}

 {/* Select options editor */}
 {field.type === 'select' && (
 <div>
 <label className={cn(labelClass, 'block mb-2')}>Options</label>
 <div className="space-y-2">
 {(field.options || []).map((opt, oi) => (
 <div key={oi} className="flex gap-2">
 <input
 type="text"
 value={opt.label}
 onChange={e => {
 const newOpts = [...(field.options || [])]
 newOpts[oi] = { ...newOpts[oi], label: e.target.value }
 onUpdate('options', newOpts)
 }}
 placeholder="Label"
 className={cn(inputClass, 'flex-1')}
 />
 <input
 type="text"
 value={opt.value}
 onChange={e => {
 const newOpts = [...(field.options || [])]
 newOpts[oi] = { ...newOpts[oi], value: e.target.value }
 onUpdate('options', newOpts)
 }}
 placeholder="value"
 className={cn(inputClass, 'flex-1 font-mono')}
 />
 <button
 type="button"
 onClick={() => onUpdate('options', (field.options || []).filter((_, i) => i !== oi))}
 className="p-2 text-red-500/60 hover:text-red-500 transition-colors"
 >
 <X size={12} />
 </button>
 </div>
 ))}
 <button
 type="button"
 onClick={() => onUpdate('options', [...(field.options || []), { label: '', value: '' }])}
 className="flex items-center gap-1 text-sm font-semibold text-gray-600 dark:text-z-secondary hover:text-gray-600 dark:text-z-muted"
 >
 <Plus size={10} /> Add Option
 </button>
 </div>
 </div>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}

// ── Main Schema Builder Page ──────────────────────────────────────────────────
export default function SchemaBuilderPage() {
 const { theme } = useTheme()
 const dark = theme === 'dark'

 // Schema being edited
 const [collectionName, setCollectionName] = useState('New Collection')
 const [slug, setSlug] = useState('new-collection')
 const [fields, setFields] = useState<FieldConfig[]>([])
 const [settings, setSettings] = useState<CollectionSettings>(DEFAULT_SETTINGS)

 // Saved schemas list
 const [savedSchemas, setSavedSchemas] = useState<SavedSchema[]>([])
 const [loadingSchemas, setLoadingSchemas] = useState(true)
 const [activeSchemaId, setActiveSchemaId] = useState<string | null>(null)

 const activeSchemaObj = savedSchemas.find(s => (s._id || s.id) === activeSchemaId)
 const isCodeFirst = activeSchemaObj?.isCodeFirst

 // UI state
 const [saving, setSaving] = useState(false)
 const [showCode, setShowCode] = useState(false)
 const [copied, setCopied] = useState(false)
 const [showIntrospect, setShowIntrospect] = useState(false)
 const [dbUri, setDbUri] = useState('')
 const [isIntrospecting, setIsIntrospecting] = useState(false)
 const [aiPrompt, setAiPrompt] = useState('')
 const [isAIGenerating, setIsAIGenerating] = useState(false)
 const [showAI, setShowAI] = useState(false)
 const [availableCollections, setAvailableCollections] = useState<string[]>([])

 // Load saved schemas and collections list
 const loadSchemas = useCallback(async () => {
 try {
 // Fetch both Dynamic UI Schemas and Code-First JSON Schemas
 const [dbRes, systemRes] = await Promise.all([
 api.get('/schemas').catch(() => ({ data: { data: [] } })),
 api.get('/system/schemas').catch(() => ({ data: { data: { collections: [] } } }))
 ])

 const rawDb = dbRes.data?.data
 const dbList: SavedSchema[] = Array.isArray(rawDb) ? rawDb : Array.isArray(rawDb?.schemas) ? rawDb.schemas : []
 
 const rawSystem = systemRes.data?.data?.collections || []
 const systemList: SavedSchema[] = Array.isArray(rawSystem) 
 ? rawSystem.map(c => ({
 ...c,
 id: c.slug, // Code-First schemas use slug as ID
 isCodeFirst: true
 }))
 : []

 // Combine and deduplicate (System Code-First schemas override DB schemas)
 const schemaMap = new Map<string, SavedSchema>()
 for (const s of [...dbList, ...systemList]) {
   schemaMap.set(s.slug, s)
 }
 const combined = Array.from(schemaMap.values()).sort((a, b) => a.slug.localeCompare(b.slug))
 setSavedSchemas(combined)
 } catch {
 setSavedSchemas([])
 } finally {
 setLoadingSchemas(false)
 }
 }, [])

 useEffect(() => {
 loadSchemas()
 // Load live collection slugs for relation field picker
 api.get('/schemas').then(res => {
 const d = res.data?.data
 const cols: any[] = Array.isArray(d?.collections) ? d.collections
 : Array.isArray(d) ? d : []
 setAvailableCollections(cols.map((c: any) => c.slug).filter(Boolean))
 }).catch(() => {})
 }, [loadSchemas])

 // Load a saved schema into the editor
 const loadSchema = (schema: SavedSchema) => {
 setActiveSchemaId(schema._id || schema.id || null)
 setCollectionName(schema.plural || schema.slug)
 setSlug(schema.slug)
 setFields(schema.fields || [])
 setSettings({ ...DEFAULT_SETTINGS, ...(schema.settings || {}) })
 toast.success(`Loaded schema: ${schema.slug}`)
 }

 const resetEditor = () => {
 setActiveSchemaId(null)
 setCollectionName('New Collection')
 setSlug('new-collection')
 setFields([])
 setSettings(DEFAULT_SETTINGS)
 }

 const addField = () => {
 setFields(prev => [...prev, { name: `field${prev.length + 1}`, type: 'text', label: `Field ${prev.length + 1}` }])
 }

 const removeField = (index: number) => {
 setFields(prev => prev.filter((_, i) => i !== index))
 }

 const updateField = (index: number, key: string, value: any) => {
 setFields(prev => {
 const next = [...prev]
 next[index] = { ...next[index], [key]: value }
 return next
 })
 }

 // Save schema to backend
 const handleSave = async () => {
 if (!slug || !collectionName) return toast.error('Name and slug required')
 setSaving(true)
 try {
 const payload = {
 slug,
 singular: collectionName,
 plural: collectionName,
 fields,
 settings,
 }
 if (activeSchemaId) {
 await api.put(`/schemas/${activeSchemaId}`, payload)
 toast.success('Schema updated!')
 } else {
 const res = await api.post('/schemas', payload)
 const id = res.data?.data?._id || res.data?.data?.id
 if (id) setActiveSchemaId(id)
 toast.success('Schema created!')
 }
 await loadSchemas()
 // Hot-reload backend routes
 await api.post('/system/schema/reload').catch(() => {})
 } catch (err: any) {
 toast.error(err.response?.data?.error?.message || 'Failed to save schema')
 } finally {
 setSaving(false)
 }
 }

 // Delete schema
 const handleDeleteSchema = async (id: string, slug: string) => {
 try {
 await api.delete(`/schemas/${id}`)
 toast.success(`Schema "${slug}" deleted`)
 if (activeSchemaId === id) resetEditor()
 await loadSchemas()
 } catch { toast.error('Failed to delete schema') }
 }

 // Introspect DB
 const handleIntrospect = async () => {
 if (!dbUri) return toast.error('Please provide a connection string')
 setIsIntrospecting(true)
 try {
 const res = await api.post('/system/introspect', { connectionString: dbUri })
 const collections = res.data.data
 if (collections?.length > 0) {
 const col = collections[0]
 setCollectionName(col.name)
 setSlug(makeSlug(col.name))
 setFields(col.fields || [])
 toast.success(`Introspected: ${col.name}`)
 setShowIntrospect(false)
 } else {
 toast.error('No tables found')
 }
 } catch (err: any) {
 toast.error(err.response?.data?.error || 'Introspection failed')
 } finally {
 setIsIntrospecting(false)
 }
 }

 // AI Generate
 const handleAIGenerate = async () => {
 if (!aiPrompt) return toast.error('Enter a prompt first')
 setIsAIGenerating(true)
 try {
 const res = await api.post('/system/ai-architect', { prompt: aiPrompt })
 const schema = res.data?.data
 if (schema) {
 setCollectionName(schema.name || schema.slug || 'AI Collection')
 setSlug(schema.slug || makeSlug(schema.name || 'ai-collection'))
 setFields(schema.fields || [])
 toast.success('AI schema generated!')
 setShowAI(false)
 }
 } catch (err: any) {
 toast.error(err.response?.data?.error?.message || 'AI generation failed')
 } finally {
 setIsAIGenerating(false)
 }
 }

 // Generate TypeScript code
 const generateCode = () => {
 const fieldsCode = fields.map(f => {
 let props = ` name: '${f.name}',\n type: '${f.type}',`
 if (f.label) props += `\n label: '${f.label}',`
 if (f.required) props += `\n required: true,`
 if (f.unique) props += `\n unique: true,`
 if (f.relationTo) props += `\n relationTo: '${f.relationTo}',`
 if (f.options?.length) props += `\n options: ${JSON.stringify(f.options)},`
 return ` {\n${props}\n },`
 }).join('\n')

 const settingsCode = Object.entries(settings)
 .filter(([, v]) => v === true)
 .map(([k]) => ` ${k}: true,`)
 .join('\n')

 return `import { CollectionConfig } from '@zenith-open/zenithcms-types'

export const ${collectionName.replace(/\s+/g, '')}: CollectionConfig = {
 name: '${collectionName}',
 slug: '${slug}',
${settingsCode ? settingsCode + '\n' : ''} fields: [
${fieldsCode}
 ],
}`
 }

  const inputClass = cn(
  'border outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black text-sm font-bold transition-colors py-2.5 px-3 rounded-none shadow-sm',
  'z-input'
  )

 return (
 <div className={cn('flex h-[calc(100vh-4rem)] overflow-hidden', dark ? 'bg-black text-white' : 'bg-gray-50 text-z-primary')}>

 {/* ── Schemas Sidebar ─────────────────────────────────────────────── */}
 <div className={cn('w-64 flex-shrink-0 border-r flex flex-col', 'border-z-border bg-z-panel')}>
 <div className="p-4 border-b border-inherit flex items-center justify-between">
 <h2 className="text-sm font-bold text-z-primary">
 Schemas
 </h2>
 <button
 onClick={resetEditor}
 className="p-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-z-secondary rounded-none transition-colors"
 title="New Schema"
 >
 <Plus size={14} />
 </button>
 </div>
 <div className="flex-1 overflow-auto p-2 space-y-1">
 {loadingSchemas ? (
 <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-z-muted" size={16} /></div>
 ) : savedSchemas.length === 0 ? (
 <div className="p-4 text-center text-sm text-z-secondary">
 No schemas yet
 </div>
 ) : savedSchemas.map(schema => {
 const id = schema._id || schema.id || ''
 const isActive = activeSchemaId === id
 return (
 <div key={id} className="group flex items-center gap-1">
 <button
 onClick={() => loadSchema(schema)}
 className={cn(
 'flex-1 flex items-center justify-between text-left px-3 py-2.5 text-sm font-semibold   transition-colors rounded-none truncate',
 isActive ? 'bg-z-accent text-white shadow-sm' : dark ? 'text-z-muted hover:bg-z-hover hover:text-white' : 'text-gray-600 hover:bg-gray-50'
 )}
 >
 <span>{schema.slug}</span>
 {schema.isCodeFirst && <Lock size={10} className={isActive ? 'text-white' : 'text-z-secondary'} />}
 </button>
 {!schema.isCodeFirst && (
 <button
 onClick={() => handleDeleteSchema(id, schema.slug)}
 className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500/50 hover:text-red-500 transition-all"
 >
 <Trash2 size={12} />
 </button>
 )}
 </div>
 )
 })}
 </div>
 </div>

 {/* ── Main Editor ─────────────────────────────────────────────────── */}
 <div className="flex-1 flex flex-col overflow-hidden">
  {/* Header toolbar */}
  <PageHeader
    title="Schema Builder"
    backLink={{ to: '/', label: 'Dashboard' }}
    actions={
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAI(true)}
          className="px-4 py-2 bg-purple-600/10 text-purple-500 hover:bg-purple-600/20 text-sm font-bold rounded-none transition-all"
        >
          AI Generate
        </button>
        <button
          onClick={() => setShowIntrospect(true)}
          className="px-4 py-2 text-sm font-bold border border-z-border hover:bg-z-hover rounded-none transition-all"
        >
          Introspect DB
        </button>
        <button
          onClick={() => setShowCode(true)}
          className="px-4 py-2 text-sm font-bold border border-z-border hover:bg-z-hover rounded-none transition-all"
        >
          View Code
        </button>
        <button
          onClick={handleSave}
          disabled={saving || isCodeFirst}
          className="px-4 py-2 bg-z-accent hover:bg-z-accent/90 text-white text-sm font-bold rounded-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : isCodeFirst ? 'Locked' : 'Save'}
        </button>
      </div>
    }
  />

  <div className="flex-1 overflow-auto p-6 space-y-6 custom-editor-scrollbar">
 {isCodeFirst && (
 <div className="px-4 py-3 border border-amber-500/30 bg-amber-500/10 text-amber-500 text-sm font-bold flex items-center justify-between">
   <span>Code-First Schema (Read Only)</span>
   <Lock size={14} />
 </div>
 )}

 {/* Collection Meta */}
 <div className={cn('rounded-none border p-6 space-y-4 shadow-sm transition-all', 'z-panel')}>
 <h3 className="text-sm font-bold text-z-primary">
 Collection Settings
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Display Name</label>
 <input
 type="text"
 value={collectionName}
 readOnly={isCodeFirst}
 onChange={e => {
 if (isCodeFirst) return
 setCollectionName(e.target.value)
 setSlug(makeSlug(e.target.value))
 }}
 className={cn(inputClass, 'w-full rounded-none', isCodeFirst && 'opacity-70 cursor-not-allowed')}
 placeholder="e.g. Blog Posts"
 />
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Slug (API ID)</label>
 <input
 type="text"
 value={slug}
 readOnly={isCodeFirst}
 onChange={e => {
 if (isCodeFirst) return
 setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
 }}
 className={cn(inputClass, 'w-full rounded-none font-mono', isCodeFirst && 'opacity-70 cursor-not-allowed')}
 placeholder="e.g. blog-posts"
 />
 </div>
 </div>

 {/* Settings toggles */}
 <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2 border-t border-z-border">
 {(Object.keys(DEFAULT_SETTINGS) as (keyof CollectionSettings)[]).map(key => (
 <label key={key} className="flex items-center gap-2 cursor-pointer group">
 <div
 onClick={() => {
 if (isCodeFirst) return
 setSettings(prev => ({ ...prev, [key]: !prev[key] }))
 }}
 className={cn(
 'w-8 h-4 rounded-none relative transition-all cursor-pointer',
 settings[key] ? 'bg-gray-500' : dark ? 'bg-white/10' : 'bg-gray-200',
 isCodeFirst && 'opacity-50 cursor-not-allowed'
 )}
 >
 <div className={cn(
 'absolute top-0.5 w-3 h-3 rounded-none bg-white shadow transition-all',
 settings[key] ? 'left-4' : 'left-0.5'
 )} />
 </div>
 <span className="text-sm font-bold capitalize text-z-muted group-hover:text-gray-200 transition-colors">
 {key.replace(/([A-Z])/g, ' $1').trim()}
 </span>
 </label>
 ))}
 </div>
 </div>

 {/* Fields */}
 <div className={cn('rounded-none border shadow-sm transition-all', 'z-panel')}>
 <div className="px-6 py-4 border-b border-inherit flex items-center justify-between">
 <h3 className="text-sm font-bold text-z-primary">
 Fields ({fields.length})
 </h3>
 {!isCodeFirst && (
 <button
 onClick={addField}
 className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-z-secondary text-sm font-semibold rounded-none transition-all"
 >
 <Plus size={12} /> Add Field
 </button>
 )}
 </div>

 <div className="p-4 space-y-3">
 <AnimatePresence>
 {fields.map((field, i) => (
 <motion.div
 key={i}
 layout
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.97 }}
 className={cn('p-4 relative group z-panel', isCodeFirst && 'opacity-70')}
 >
 {/* Delete button */}
 {!isCodeFirst && (
 <button
 onClick={() => removeField(i)}
 className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-red-500/50 hover:text-red-500 transition-all rounded-none hover:bg-red-500/10"
 >
 <Trash2 size={14} />
 </button>
 )}

 {/* Main row */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-8">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Field Name (key)</label>
 <input
 type="text"
 value={field.name}
 readOnly={isCodeFirst}
 onChange={e => {
 if (isCodeFirst) return
 updateField(i, 'name', e.target.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''))
 }}
 className={cn(inputClass, 'w-full rounded-none-none font-mono text-sm', isCodeFirst && 'cursor-not-allowed')}
 placeholder="fieldName"
 />
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Field Type</label>
 <div className={cn(isCodeFirst && 'opacity-70 pointer-events-none')}>
 <FieldTypePicker
 value={field.type}
 onChange={v => updateField(i, 'type', v)}
 theme={theme}
 />
 </div>
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Display Label</label>
 <input
 type="text"
 value={field.label || ''}
 readOnly={isCodeFirst}
 onChange={e => {
 if (isCodeFirst) return
 updateField(i, 'label', e.target.value)
 }}
 className={cn(inputClass, 'w-full rounded-none-none', isCodeFirst && 'cursor-not-allowed')}
 placeholder="Human readable label"
 />
 </div>
 </div>

 {/* Quick flags row */}
 <div className="flex items-center gap-5 mt-3 pt-2 border-t border-z-border">
 {[['required', 'Required'], ['unique', 'Unique'], ['index', 'Index']].map(([k, l]) => (
 <label key={k} className="flex items-center gap-1.5 cursor-pointer">
 <input
 type="checkbox"
 checked={!!(field as any)[k]}
 disabled={isCodeFirst}
 onChange={e => {
 if (isCodeFirst) return
 updateField(i, k, e.target.checked)
 }}
 className="accent-gray-500 w-3 h-3 disabled:opacity-50 disabled:cursor-not-allowed"
 />
 <span className="text-sm font-semibold text-z-secondary">{l}</span>
 </label>
 ))}
 </div>

 {/* Advanced panel */}
 {!isCodeFirst && (
 <FieldAdvancedPanel
 field={field}
 onUpdate={(key, value) => updateField(i, key, value)}
 theme={theme}
 availableCollections={availableCollections}
 />
 )}
 </motion.div>
 ))}
 </AnimatePresence>

 {fields.length === 0 && (
 <div className="py-16 text-center">
 <Layers size={40} className="mx-auto text-gray-700 mb-4" strokeWidth={1} />
 <p className="text-sm font-semibold text-gray-600">No fields yet</p>
 <p className="text-sm text-gray-600 mt-1">Click "Add Field" or use AI Generate to get started</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* ── Code Modal ─────────────────────────────────────────────────── */}
 <AnimatePresence>
 {showCode && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-3xl border rounded-none-none shadow-2xl p-6 relative flex flex-col h-[80vh] bg-black border-z-border">
 <button onClick={() => setShowCode(false)} className="absolute top-4 right-4 text-z-secondary hover:text-white"><X size={20} /></button>
 <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
 <Code className="text-gray-600 dark:text-z-secondary" /> Generated TypeScript
 </h2>
 <div className="flex-1 bg-[#1E1E1E] border border-z-border p-5 overflow-auto text-sm font-mono text-gray-600 dark:text-z-muted relative rounded-none-none">
 <button
 onClick={() => { navigator.clipboard.writeText(generateCode()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
 className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white transition-colors rounded-none-none"
 >
 {copied ? <Check size={14} /> : <Copy size={14} />}
 </button>
 <pre><code>{generateCode()}</code></pre>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* ── AI Generate Modal ───────────────────────────────────────────── */}
 <AnimatePresence>
 {showAI && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg border rounded-none-none shadow-2xl p-6 relative bg-black border-z-border">
 <button onClick={() => setShowAI(false)} className="absolute top-4 right-4 text-z-secondary hover:text-white"><X size={20} /></button>
 <h2 className="text-xl font-semibold mb-2 flex items-center gap-3">
 <Sparkles className="text-purple-400" /> AI Schema Architect
 </h2>
 <p className="text-sm text-z-muted mb-5 font-medium">
 Describe what you need — the AI will generate a complete schema with fields, types, and relations.
 </p>
 <textarea
 rows={4}
 value={aiPrompt}
 onChange={e => setAiPrompt(e.target.value)}
 placeholder='e.g. "A blog post collection with title, slug, content, featured image, author relation to users, published date, and category select field with options."'
 className="w-full bg-black border border-z-border focus:border-purple-500/50 p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none-none placeholder:text-gray-600 text-white resize-none mb-4"
 />
 <button
 disabled={isAIGenerating || !aiPrompt}
 onClick={handleAIGenerate}
 className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold flex justify-center items-center gap-2 transition-all rounded-none-none disabled:opacity-50"
 >
 {isAIGenerating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Schema</>}
 </button>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 {/* ── Introspect Modal ─────────────────────────────────────────────── */}
 <AnimatePresence>
 {showIntrospect && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
 <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-lg border rounded-none-none shadow-2xl p-6 relative bg-black border-z-border">
 <button onClick={() => setShowIntrospect(false)} className="absolute top-4 right-4 text-z-secondary hover:text-white"><X size={20} /></button>
 <h2 className="text-xl font-semibold mb-2 flex items-center gap-3">
 <Database className="text-gray-600 dark:text-z-secondary" /> DB Introspection
 </h2>
 <p className="text-sm text-z-muted mb-5 font-medium">
 Connect to a Postgres database to reverse-engineer tables into Zenith schema fields.
 </p>
 <input
 type="text"
 placeholder="postgresql://user:password@localhost:5432/mydb"
 value={dbUri}
 onChange={e => setDbUri(e.target.value)}
 className="w-full bg-black border border-z-border focus:border-gray-500/50 p-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none-none placeholder:text-gray-600 text-white mb-4 font-mono"
 />
 <button
 disabled={isIntrospecting}
 onClick={handleIntrospect}
 className="w-full py-3.5 bg-gray-500 hover:bg-gray-400 text-white text-sm font-semibold flex justify-center items-center gap-2 transition-all rounded-none-none"
 >
 {isIntrospecting ? <><Loader2 size={14} className="animate-spin" /> Scanning...</> : <><RefreshCw size={14} /> Analyze Database</>}
 </button>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}
