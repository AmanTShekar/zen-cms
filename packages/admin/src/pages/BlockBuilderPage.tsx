import { useState, useEffect, useCallback } from 'react'
import {
 Plus, Database, Code, Check, Trash2, Box, Settings, X,
 Save, Loader2, FileText, Hash, Globe, Lock, Calendar,
 Image, Link2, ToggleLeft, AlignLeft, Braces, Tag, Layers, Eye,
 LayoutTemplate, ArrowDownToLine, Folders
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { clearBlockCache } from '../hooks/useBlockLibrary'
import api from '../lib/api'
import { PageHeader } from '../components/ui/PageHeader'

// ── Full field type catalogue ────────────────────────────────────────────────
const FIELD_TYPES = [
 // Basic
 { value: 'text', label: 'Text', icon: FileText, color: '#6b7280', desc: 'Small or long text like title or description' },
 { value: 'textarea', label: 'Textarea', icon: AlignLeft, color: '#6b7280', desc: 'Multi-line text for longer descriptions' },
 { value: 'number', label: 'Number', icon: Hash, color: '#3b82f6', desc: 'Numbers (integer, float, decimal)' },
 { value: 'email', label: 'Email', icon: Globe, color: 'var(--z-accent)', desc: 'Email field with validation format' },
 { value: 'password', label: 'Password', icon: Lock, color: '#ef4444', desc: 'Password field with encryption' },
 { value: 'checkbox', label: 'Boolean', icon: ToggleLeft, color: 'var(--z-accent)', desc: 'Yes/No, 1/0, True/False' },
 { value: 'date', label: 'Date', icon: Calendar, color: '#f59e0b', desc: 'A date picker with hours, minutes and seconds' },
 { value: 'media', label: 'Media', icon: Image, color: '#06b6d4', desc: 'Files like images, videos, etc' },
 { value: 'richtext', label: 'Rich Text', icon: FileText, color: '#84cc16', desc: 'A rich text editor with formatting options' },
 { value: 'relation', label: 'Relation', icon: Link2, color: '#ec4899', desc: 'Refers to another collection' },
 { value: 'json', label: 'JSON', icon: Braces, color: '#6366f1', desc: 'Data in JSON format' },
 { value: 'array', label: 'Array', icon: Layers, color: '#f59e0b', desc: 'A repeating group of fields' },
 // Structural (Payload-style)
 { value: 'row', label: 'Row', icon: LayoutTemplate, color: '#ec4899', desc: 'Group fields side-by-side' },
 { value: 'collapsible', label: 'Collapsible', icon: ArrowDownToLine, color: 'var(--z-accent)', desc: 'Wrap fields in an accordion' },
 { value: 'tabs', label: 'Tabs', icon: Folders, color: '#3b82f6', desc: 'Organize fields into tabs' },
] as const

type FieldType = typeof FIELD_TYPES[number]['value']

interface FieldConfig {
 name?: string
 type: FieldType
 label?: string
 required?: boolean
 unique?: boolean
 description?: string
 defaultValue?: any
 relationTo?: string
 hasMany?: boolean
 options?: { label: string; value: string }[]
 fields?: FieldConfig[]
 
 // Validation
 min?: number
 max?: number
 minLength?: number
 maxLength?: number
 regex?: string
 dateFormat?: string
 
 i18n?: boolean
 
 // Admin & Layout
 admin?: {
 width?: string
 placeholder?: string
 hidden?: boolean
 readOnly?: boolean
 condition?: any
 }
}

interface SavedBlock {
 slug: string
 labels?: { singular?: string; plural?: string }
 fields?: FieldConfig[]
 admin?: { category?: string; icon?: string; description?: string }
 isGenerated?: boolean
}

// ── Main Block Builder Page ─────────────────────────────────────────────────
export default function BlockBuilderPage() {
 const { theme } = useTheme()
 const dark = theme === 'dark'

 // Block being edited
 const [title, setTitle] = useState('New Block')
 const [slug, setSlug] = useState('new-block')
 const [category, setCategory] = useState('General')
 const [icon, setIcon] = useState('Box')
 const [description, setDescription] = useState('')
 const [fields, setFields] = useState<FieldConfig[]>([])

 // Saved blocks list
 const [savedBlocks, setSavedBlocks] = useState<SavedBlock[]>([])
 const [loadingBlocks, setLoadingBlocks] = useState(true)

 // Collections for relations
 const [availableCollections, setAvailableCollections] = useState<string[]>([])

 // UI state
 const [saving, setSaving] = useState(false)
 
 // Modal State
 const [isFieldModalOpen, setIsFieldModalOpen] = useState(false)
 const [modalStep, setModalStep] = useState<'TYPE' | 'SETTINGS'>('TYPE')
 const [settingsTab, setSettingsTab] = useState<'BASIC' | 'VALIDATION' | 'ADMIN'>('BASIC')
 
 const [activeField, setActiveField] = useState<Partial<FieldConfig> | null>(null)
 
 // To handle nested fields, we need a path array. [0, 'fields', 1] means fields[0].fields[1]
 // But for this simple implementation, let's keep it flat first, and then allow nesting arrays/rows if needed.
 // We'll support editing a flat list for now, and allow structural fields to just be defined.
 // Actually, for a fully deep UX, we would have a recursive editor. For this page, we'll keep the list top-level but allow recursive config inside the advanced JSON or just as a flat list if row.
 const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null)

 const loadBlocks = useCallback(async () => {
 try {
 const res = await api.get('/blocks')
 const raw = res.data?.data
 setSavedBlocks(Array.isArray(raw) ? raw : [])
 } catch {
 setSavedBlocks([])
 } finally {
 setLoadingBlocks(false)
 }
 }, [])

 useEffect(() => {
 loadBlocks()
 // Mocking collections for relation dropdown. 
 // Usually this hits /api/collections or introspect.
 setAvailableCollections(['users', 'pages', 'media', 'categories'])
 }, [loadBlocks])

 const loadBlock = (block: SavedBlock) => {
 setTitle(block.labels?.singular || block.slug)
 setSlug(block.slug)
 setCategory(block.admin?.category || 'General')
 setIcon(block.admin?.icon || 'Box')
 setDescription(block.admin?.description || '')
 setFields(block.fields || [])
 toast.success(`Loaded block: ${block.slug}`)
 }

 const resetEditor = () => {
 setTitle('New Block')
 setSlug('new-block')
 setCategory('General')
 setIcon('Box')
 setDescription('')
 setFields([])
 }

 const handleSave = async () => {
 if (!slug || !title) return toast.error('Name and slug required')
 setSaving(true)
 try {
 const payload = { slug, title, description, category, icon, fields }
 const res = await api.post('/blocks/generate', payload)
 clearBlockCache()
 toast.success(res.data.message || 'Block generated as TypeScript code!')
 await loadBlocks()
 } catch (err: any) {
 toast.error(err.response?.data?.error?.message || 'Failed to generate block')
 } finally {
 setSaving(false)
 }
 }

 const handleFieldSubmit = () => {
 if (!activeField?.type) return toast.error('Field type required')
 if (activeField.type !== 'row' && activeField.type !== 'tabs' && !activeField.name) return toast.error('Field name is required')
 
 if (editingFieldIndex !== null) {
 const next = [...fields]
 next[editingFieldIndex] = activeField as FieldConfig
 setFields(next)
 } else {
 setFields(prev => [...prev, activeField as FieldConfig])
 }
 
 setIsFieldModalOpen(false)
 }

 const removeField = (index: number) => {
 setFields(prev => prev.filter((_, i) => i !== index))
 }

 const inputClass = cn(
  'border outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black text-sm font-bold transition-colors py-2.5 px-3 rounded-none shadow-sm',
  dark ? 'bg-z-panel backdrop-blur-md border-z-border focus:border-z-accent text-white placeholder-gray-600' : 'bg-z-panel border-z-border focus:border-z-accent text-z-primary placeholder-gray-400'
  )
 
 const blocksByCategory = savedBlocks.reduce((acc, block) => {
 const cat = block.admin?.category || 'General'
 if (!acc[cat]) acc[cat] = []
 acc[cat].push(block)
 return acc
 }, {} as Record<string, SavedBlock[]>)

 return (
 <div className={cn('flex h-[calc(100vh-4rem)] overflow-hidden', dark ? 'bg-black text-white' : 'bg-gray-50 text-z-primary')}>
 <div className={cn('w-64 flex-shrink-0 border-r flex flex-col', 'border-z-border bg-z-panel')}>
 <div className="p-4 border-b border-inherit flex items-center justify-between">
 <h2 className="text-sm font-semibold flex items-center gap-2">
 <Database size={14} className="text-gray-600 dark:text-z-secondary" /> Blocks
 </h2>
 <button onClick={resetEditor} className="p-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-z-secondary rounded-none transition-colors" title="New Block">
 <Plus size={14} />
 </button>
 </div>
 <div className="flex-1 overflow-auto p-4 space-y-4">
 {loadingBlocks ? (
 <div className="flex justify-center"><Loader2 className="animate-spin text-z-muted" size={16} /></div>
 ) : Object.keys(blocksByCategory).length === 0 ? (
 <div className="text-center text-sm text-z-secondary">No blocks yet</div>
 ) : (
 Object.entries(blocksByCategory).map(([cat, blocks]) => (
 <div key={cat} className="space-y-1.5">
 <h3 className="text-sm font-semibold text-z-secondary">{cat}</h3>
 <div className="space-y-0.5">
 {blocks.map(block => (
 <button key={block.slug} onClick={() => loadBlock(block)} className={cn('w-full flex items-center gap-2 text-left px-3 py-2 text-sm font-semibold   transition-colors rounded-none truncate', slug === block.slug ? 'bg-z-accent text-white shadow-sm' : dark ? 'text-z-muted hover:bg-z-hover hover:text-white' : 'text-gray-600 hover:bg-gray-50')}>
 {block.isGenerated ? <Code size={12} className={slug === block.slug ? 'text-white' : 'text-z-secondary/50'} /> : <Box size={12} />}
 {block.labels?.singular || block.slug}
 </button>
 ))}
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 <div className="flex-1 flex flex-col overflow-hidden relative">
 <PageHeader
   title="Component Builder"
   description={`${fields.length} fields · Generating to config/blocks/${slug}.ts`}
   icon={<Layers size={24} />}
   backLink={{ to: '/', label: 'Dashboard' }}
   actions={
     <div className="flex items-center gap-2">
       <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-z-accent hover:opacity-90 text-white text-sm font-semibold rounded-none transition-all shadow-sm disabled:opacity-50">
         {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Code
       </button>
     </div>
   }
 />

 <div className="flex-1 overflow-auto p-6 space-y-6">
 <div className={cn('rounded-none border p-6 space-y-4 shadow-sm transition-all', 'z-panel')}>
 <h3 className="text-sm font-semibold text-gray-600 dark:text-z-secondary flex items-center gap-2"><Settings size={12} /> Component Settings</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Display Name</label>
 <input type="text" value={title} onChange={e => { setTitle(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) }} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. Hero Banner" />
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">API Slug (filename)</label>
 <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className={cn(inputClass, 'w-full rounded-none font-mono')} placeholder="e.g. hero-banner" />
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Category</label>
 <input type="text" value={category} onChange={e => setCategory(e.target.value)} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. Layout, Content, Media" />
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Description</label>
 <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={cn(inputClass, 'w-full rounded-none')} placeholder="Brief description for editors" />
 </div>
 </div>
 </div>

 <div className={cn('rounded-none border shadow-sm transition-all', 'z-panel')}>
 <div className="px-6 py-4 border-b border-inherit flex items-center justify-between">
 <h3 className="text-sm font-semibold text-gray-600 dark:text-z-secondary flex items-center gap-2"><Layers size={12} /> Fields ({fields.length})</h3>
 <button onClick={() => { setModalStep('TYPE'); setActiveField({}); setEditingFieldIndex(null); setSettingsTab('BASIC'); setIsFieldModalOpen(true) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-z-secondary text-sm font-semibold rounded-none transition-all">
 <Plus size={12} /> Add new field
 </button>
 </div>
 <div className="p-0">
 {fields.length === 0 ? (
 <div className="py-16 text-center">
 <Layers size={40} className="mx-auto text-gray-700 mb-4" strokeWidth={1} />
 <p className="text-sm font-semibold text-gray-600">No fields yet</p>
 </div>
 ) : (
 <div className="divide-y divide-gray-100 dark:divide-white/5">
 {fields.map((field, i) => (
 <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-z-hover transition-colors group cursor-pointer"
 onClick={() => { setActiveField(field); setEditingFieldIndex(i); setModalStep('SETTINGS'); setSettingsTab('BASIC'); setIsFieldModalOpen(true) }}>
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 rounded-none bg-gray-500/10 flex items-center justify-center">
 {(() => { const ft = FIELD_TYPES.find(t => t.value === field.type); const Icon = ft ? ft.icon : Box; return <Icon size={14} className="text-gray-600 dark:text-z-secondary" /> })()}
 </div>
 <div>
 <div className="text-sm font-bold text-z-primary dark:text-white flex items-center gap-2">
 {field.name || `[${field.type}]`}
 {field.required && <span className="text-sm text-red-500">*</span>}
 {field.i18n && <Globe size={10} className="text-z-active-text" />}
 </div>
 <div className="text-sm font-bold text-z-secondary mt-0.5">{field.type} {field.label ? `· ${field.label}` : ''}</div>
 </div>
 </div>
 <button onClick={(e) => { e.stopPropagation(); removeField(i) }} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-500/10 rounded-none transition-all"><Trash2 size={14} /></button>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 <AnimatePresence>
 {isFieldModalOpen && (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
 <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-4xl border rounded-none shadow-sm flex flex-col max-h-[85vh] bg-black border-z-border overflow-hidden">
 <div className="px-6 py-4 border-b border-z-border flex items-center justify-between bg-black/50">
 <h2 className="text-sm font-semibold text-white flex items-center gap-2">
 {modalStep === 'TYPE' ? 'Select a field for your Component' : `Configure ${activeField?.type} field`}
 </h2>
 <button onClick={() => setIsFieldModalOpen(false)} className="text-z-secondary hover:text-white p-1"><X size={18} /></button>
 </div>

 {modalStep === 'TYPE' && (
 <div className="flex-1 overflow-auto p-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
 {FIELD_TYPES.map((ft) => {
 const Icon = ft.icon
 return (
 <button key={ft.value} onClick={() => { setActiveField({ type: ft.value, admin: {} }); setModalStep('SETTINGS') }} className="flex items-start gap-4 p-4 rounded-none border border-z-border bg-z-hover hover:border-z-accent/50 hover:opacity-90/5 transition-all text-left">
 <div className="mt-1 p-2 rounded-none bg-black/50 border border-z-border"><Icon size={18} style={{ color: ft.color }} /></div>
 <div>
 <div className="text-sm font-semibold text-white mb-1">{ft.label}</div>
 <div className="text-sm text-z-muted leading-relaxed font-bold">{ft.desc}</div>
 </div>
 </button>
 )
 })}
 </div>
 )}

 {modalStep === 'SETTINGS' && (
 <div className="flex flex-col flex-1 overflow-hidden">
 <div className="flex border-b border-z-border px-6 pt-4 gap-6 bg-black/20">
 {['BASIC', 'VALIDATION', 'ADMIN'].map(tab => (
 <button key={tab} onClick={() => setSettingsTab(tab as any)} className={cn("pb-3 text-sm font-semibold   transition-colors relative", settingsTab === tab ? "text-gray-600 dark:text-z-secondary" : "text-z-secondary hover:text-white")}>
 {tab}
 {settingsTab === tab && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-500" />}
 </button>
 ))}
 </div>
 <div className="flex-1 overflow-auto p-6 max-w-3xl mx-auto w-full">
 {settingsTab === 'BASIC' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="col-span-2 sm:col-span-1">
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Name (Key in JSON)*</label>
 <input type="text" value={activeField?.name || ''} onChange={e => setActiveField(prev => ({ ...prev, name: e.target.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') }))} className={cn(inputClass, 'w-full rounded-none font-mono')} placeholder="e.g. heroTitle" />
 </div>
 <div className="col-span-2 sm:col-span-1">
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Display Label</label>
 <input type="text" value={activeField?.label || ''} onChange={e => setActiveField(prev => ({ ...prev, label: e.target.value }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. Hero Title" />
 </div>
 <div className="col-span-2">
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Description</label>
 <input type="text" value={activeField?.description || ''} onChange={e => setActiveField(prev => ({ ...prev, description: e.target.value }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="Help text for content editors" />
 </div>
 <div className="col-span-2">
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Default Value</label>
 <input type="text" value={activeField?.defaultValue || ''} onChange={e => setActiveField(prev => ({ ...prev, defaultValue: e.target.value }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. Welcome" />
 </div>
 
 {activeField?.type === 'relation' && (
 <div className="col-span-2 pt-4 border-t border-z-border space-y-4">
 <label className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">Relation Options</label>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Relates To</label>
 <select value={activeField.relationTo || ''} onChange={e => setActiveField(prev => ({ ...prev, relationTo: e.target.value }))} className={cn(inputClass, 'w-full rounded-none cursor-pointer')}>
 <option value="">-- Select Collection --</option>
 {availableCollections.map(c => <option key={c} value={c}>{c}</option>)}
 </select>
 </div>
 <div className="flex items-center">
 <label className="flex items-center gap-2 cursor-pointer mt-4">
 <input type="checkbox" checked={!!activeField?.hasMany} onChange={e => setActiveField(prev => ({ ...prev, hasMany: e.target.checked }))} className="accent-gray-500 w-4 h-4" />
 <span className="text-xs font-bold text-gray-300">Has Many (Array of references)</span>
 </label>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {settingsTab === 'VALIDATION' && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-z-hover p-4 rounded-none border border-z-border">
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={!!activeField?.required} onChange={e => setActiveField(prev => ({ ...prev, required: e.target.checked }))} className="accent-gray-500 w-4 h-4" />
 <span className="text-xs font-bold text-gray-300">Required field</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={!!activeField?.unique} onChange={e => setActiveField(prev => ({ ...prev, unique: e.target.checked }))} className="accent-gray-500 w-4 h-4" />
 <span className="text-xs font-bold text-gray-300">Unique field</span>
 </label>
 </div>
 
 {(activeField?.type === 'text' || activeField?.type === 'textarea') && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Min Length</label>
 <input type="number" value={activeField?.minLength || ''} onChange={e => setActiveField(prev => ({ ...prev, minLength: parseInt(e.target.value) || undefined }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. 5" />
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Max Length</label>
 <input type="number" value={activeField?.maxLength || ''} onChange={e => setActiveField(prev => ({ ...prev, maxLength: parseInt(e.target.value) || undefined }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. 100" />
 </div>
 <div className="col-span-2">
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Regex Pattern</label>
 <input type="text" value={activeField?.regex || ''} onChange={e => setActiveField(prev => ({ ...prev, regex: e.target.value }))} className={cn(inputClass, 'w-full rounded-none font-mono')} placeholder="^[A-Za-z]+$" />
 </div>
 </div>
 )}
 
 {activeField?.type === 'number' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Minimum Value</label>
 <input type="number" value={activeField?.min || ''} onChange={e => setActiveField(prev => ({ ...prev, min: parseInt(e.target.value) || undefined }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. 0" />
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Maximum Value</label>
 <input type="number" value={activeField?.max || ''} onChange={e => setActiveField(prev => ({ ...prev, max: parseInt(e.target.value) || undefined }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. 100" />
 </div>
 </div>
 )}
 
 {activeField?.type === 'date' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Date Mode</label>
 <select value={activeField?.dateFormat || 'date'} onChange={e => setActiveField(prev => ({ ...prev, dateFormat: e.target.value }))} className={cn(inputClass, 'w-full rounded-none cursor-pointer')}>
 <option value="date">Date Only</option>
 <option value="datetime">Date & Time</option>
 <option value="time">Time Only</option>
 </select>
 </div>
 </div>
 )}
 </div>
 )}

 {settingsTab === 'ADMIN' && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-z-hover p-4 rounded-none border border-z-border">
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={!!activeField?.i18n} onChange={e => setActiveField(prev => ({ ...prev, i18n: e.target.checked }))} className="accent-z-accent w-4 h-4" />
 <span className="text-xs font-bold text-gray-300">Enable Localization (i18n)</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={!!activeField?.admin?.hidden} onChange={e => setActiveField(prev => ({ ...prev, admin: { ...prev.admin, hidden: e.target.checked } }))} className="accent-gray-500 w-4 h-4" />
 <span className="text-xs font-bold text-gray-300">Hidden in UI</span>
 </label>
 <label className="flex items-center gap-2 cursor-pointer">
 <input type="checkbox" checked={!!activeField?.admin?.readOnly} onChange={e => setActiveField(prev => ({ ...prev, admin: { ...prev.admin, readOnly: e.target.checked } }))} className="accent-gray-500 w-4 h-4" />
 <span className="text-xs font-bold text-gray-300">Read-Only</span>
 </label>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Field Width</label>
 <select value={activeField?.admin?.width || '100%'} onChange={e => setActiveField(prev => ({ ...prev, admin: { ...prev.admin, width: e.target.value } }))} className={cn(inputClass, 'w-full rounded-none cursor-pointer')}>
 <option value="100%">100% (Full Width)</option>
 <option value="50%">50% (Half Width)</option>
 <option value="33%">33% (One Third)</option>
 <option value="25%">25% (One Quarter)</option>
 </select>
 </div>
 <div>
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Placeholder</label>
 <input type="text" value={activeField?.admin?.placeholder || ''} onChange={e => setActiveField(prev => ({ ...prev, admin: { ...prev.admin, placeholder: e.target.value } }))} className={cn(inputClass, 'w-full rounded-none')} placeholder="e.g. Enter a value..." />
 </div>
 
 <div className="col-span-2">
 <label className="text-sm font-semibold text-z-secondary block mb-1.5">Conditional Visibility JSON</label>
 <textarea rows={3} value={activeField?.admin?.condition ? JSON.stringify(activeField.admin.condition) : ''} onChange={e => {
 try {
 const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
 setActiveField(prev => ({ ...prev, admin: { ...prev.admin, condition: parsed } }))
                } catch { /* invalid JSON */ }
 }} className={cn(inputClass, 'w-full rounded-none font-mono')} placeholder='{"field": "theme", "equals": "dark"}' />
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 <div className="px-6 py-4 border-t border-z-border bg-black/50 flex justify-between">
 {modalStep === 'SETTINGS' ? (
 <button onClick={() => setModalStep('TYPE')} className="px-4 py-2 text-sm font-bold text-z-muted hover:text-white transition-colors">
 ← Back to Types
 </button>
 ) : <div />}
 {modalStep === 'SETTINGS' && (
 <button onClick={handleFieldSubmit} className="px-6 py-2 bg-z-accent hover:opacity-90 text-white text-sm font-semibold rounded-none transition-all shadow-sm">
 {editingFieldIndex !== null ? 'Update Field' : 'Add Field'}
 </button>
 )}
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}
