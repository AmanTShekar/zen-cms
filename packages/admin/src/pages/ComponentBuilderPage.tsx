import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
 Plus, Box, Save, Loader2, Trash2, Copy, Code, Sparkles, Eye, EyeOff,
 ChevronRight, Check, X, Braces, Download
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import api from '../lib/api'
import { confirm } from '../store/confirmStore'
import toast from 'react-hot-toast'
import type { CustomComponent } from '../hooks/useCustomComponents'
import { invalidateCustomComponentsCache } from '../hooks/useCustomComponents'

const FIELD_TYPES = [
 'text', 'textarea', 'number', 'boolean', 'richtext', 'date',
 'email', 'media', 'relation', 'color', 'array', 'group', 'blocks', 'dz',
 'select', 'json', 'slug', 'code', 'password',
]

const CATEGORIES = ['General', 'Layout', 'Content', 'Commerce', 'Media', 'Social', 'Navigation', 'Forms']

type EditorTab = 'visual' | 'code' | 'ai'

const ComponentBuilderPage: React.FC = () => {
 const { theme } = useTheme()
 const dark = theme === 'dark'
 const [components, setComponents] = useState<CustomComponent[]>([])
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [activeComponent, setActiveComponent] = useState<CustomComponent | null>(null)
 const [activeTab, setActiveTab] = useState<EditorTab>('visual')
 const [codeImport, setCodeImport] = useState('')
 const [aiPrompt, setAiPrompt] = useState('')
 const [isAIGenerating, setIsAIGenerating] = useState(false)
 const [copied, setCopied] = useState(false)
 const [showPreview, setShowPreview] = useState(false)

 useEffect(() => {
 loadComponents()
 }, [])

 const loadComponents = async () => {
 setLoading(true)
 try {
 const res = await api.get('/system/components')
 setComponents(res.data.data || [])
 } catch {
 toast.error('Failed to load components')
 } finally {
 setLoading(false)
 }
 }

 const handleCreateNew = () => {
 setActiveComponent({
 id: '',
 slug: '',
 displayName: '',
 category: 'General',
 icon: 'Box',
 description: '',
 fields: [{ name: 'title', type: 'text' }]
 })
 setActiveTab('visual')
 }

 const addField = () => {
 if (!activeComponent) return
 setActiveComponent({
 ...activeComponent,
 fields: [...activeComponent.fields, { name: '', type: 'text' }]
 })
 }

 const updateField = (index: number, key: string, value: any) => {
 if (!activeComponent) return
 const newFields = [...activeComponent.fields]
 newFields[index] = { ...newFields[index], [key]: value }
 setActiveComponent({ ...activeComponent, fields: newFields })
 }

 const removeField = (index: number) => {
 if (!activeComponent) return
 const newFields = [...activeComponent.fields]
 newFields.splice(index, 1)
 setActiveComponent({ ...activeComponent, fields: newFields })
 }

 const handleSave = async () => {
 if (!activeComponent || !activeComponent.slug || !activeComponent.displayName) {
 toast.error('Slug and Display Name are required')
 return
 }
 setSaving(true)
 try {
 if (activeComponent.id) {
 await api.put(`/system/components/${activeComponent.id}`, activeComponent)
 toast.success('Component updated successfully')
 } else {
 const { id, ...dataToPost } = activeComponent
 await api.post('/system/components', dataToPost)
 toast.success('Component created successfully')
 }
 invalidateCustomComponentsCache()
 loadComponents()
 setActiveComponent(null)
 } catch (err: any) {
 toast.error(err.response?.data?.message || 'Failed to save component')
 } finally {
 setSaving(false)
 }
 }

 const handleDelete = async (id: string) => {
 if (!await confirm({ message: 'Delete this component? This may break pages currently using it.' })) return
 try {
 await api.delete(`/system/components/${id}`)
 toast.success('Component deleted')
 invalidateCustomComponentsCache()
 if (activeComponent?.id === id) setActiveComponent(null)
 loadComponents()
 } catch {
 toast.error('Failed to delete component')
 }
 }

 const handleDuplicate = async (id: string) => {
 try {
 await api.post(`/system/components/${id}/duplicate`)
 toast.success('Component duplicated')
 invalidateCustomComponentsCache()
 loadComponents()
 } catch {
 toast.error('Failed to duplicate component')
 }
 }

 // ── Code Import: parse JSON / TypeScript interface ──────────────────────────
 const handleCodeImport = () => {
 try {
 // Try JSON parse first
 let parsed: any = null
 const trimmed = codeImport.trim()

 if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
 const jsonData = JSON.parse(trimmed.startsWith('[') ? `{"fields":${trimmed}}` : trimmed)
 parsed = jsonData
 } else if (trimmed.includes('interface') || trimmed.includes('type ')) {
 // Parse TypeScript interface
 const fieldMatches = [...trimmed.matchAll(/(\w+)\??:\s*(string|number|boolean|Date|any|object|unknown)(?:\[\])?/g)]
 parsed = {
 fields: fieldMatches.map(m => ({
 name: m[1],
 type: m[2] === 'string' ? 'text' : m[2] === 'number' ? 'number' : m[2] === 'boolean' ? 'checkbox' : 'json'
 }))
 }
 // Try to extract interface name
 const nameMatch = trimmed.match(/interface\s+(\w+)/)
 if (nameMatch) {
 parsed.displayName = nameMatch[1]
 parsed.slug = nameMatch[1].replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
 }
 }

 if (parsed && parsed.fields && Array.isArray(parsed.fields)) {
 setActiveComponent({
 id: '',
 slug: parsed.slug || '',
 displayName: parsed.displayName || parsed.name || '',
 category: parsed.category || 'General',
 icon: 'Box',
 description: parsed.description || '',
 fields: parsed.fields,
 })
 setActiveTab('visual')
 toast.success(`Imported ${parsed.fields.length} fields from code`)
 } else {
 toast.error('Could not parse fields. Use JSON format: { "slug": "...", "displayName": "...", "fields": [...] }')
 }
 } catch (err: any) {
 toast.error(`Parse error: ${err.message}`)
 }
 }

 // ── Register via code (backend endpoint) ───────────────────────────────────
 const handleRegisterCode = async () => {
 try {
 const parsed = JSON.parse(codeImport)
 const res = await api.post('/system/components/register-code', parsed)
 toast.success('Component registered from code!')
 invalidateCustomComponentsCache()
 loadComponents()
 setCodeImport('')
 setActiveTab('visual')
 const comp = res.data?.data
 if (comp) setActiveComponent(comp)
 } catch (err: any) {
 toast.error(err.response?.data?.message || err.message || 'Failed to register component')
 }
 }

 // ── AI Generate ────────────────────────────────────────────────────────────
 const handleAIGenerate = async () => {
 if (!aiPrompt) return toast.error('Enter a prompt')
 setIsAIGenerating(true)
 try {
 const res = await api.post('/system/ai-architect', {
 prompt: `Generate a reusable UI component schema (as JSON with slug, displayName, category, description, and fields array). Component description: ${aiPrompt}`
 })
 const schema = res.data?.data
 if (schema && schema.fields) {
 setActiveComponent({
 id: '',
 slug: schema.slug || '',
 displayName: schema.displayName || schema.name || '',
 category: schema.category || 'General',
 icon: 'Box',
 description: schema.description || '',
 fields: schema.fields,
 })
 setActiveTab('visual')
 toast.success('AI generated component schema!')
 } else {
 toast.error('AI did not return a valid component schema')
 }
 } catch (err: any) {
 toast.error(err.response?.data?.error?.message || 'AI generation failed')
 } finally {
 setIsAIGenerating(false)
 }
 }

 // ── Generate JSON preview ──────────────────────────────────────────────────
 const generateJSON = () => {
 if (!activeComponent) return '{}'
 return JSON.stringify({
 slug: activeComponent.slug,
 displayName: activeComponent.displayName,
 category: activeComponent.category,
 description: activeComponent.description,
 fields: activeComponent.fields,
 }, null, 2)
 }

 // ── Generate TypeScript Interface ─────────────────────────────────────────
 const generateTS = () => {
 if (!activeComponent) return ''
 const typeName = activeComponent.displayName.replace(/\s+/g, '') || 'Component'
 const typeMap: Record<string, string> = {
 text: 'string', textarea: 'string', email: 'string', password: 'string',
 slug: 'string', code: 'string', color: 'string',
 number: 'number', checkbox: 'boolean',
 date: 'Date', media: 'MediaItem', relation: 'string | null',
 richtext: 'string', json: 'Record<string, unknown>',
 array: 'any[]', blocks: 'Block[]', group: 'Record<string, unknown>',
 select: 'string',
 }
 const fields = activeComponent.fields.map(f => {
 const ts = typeMap[f.type] || 'unknown'
 return ` ${f.name}: ${ts}`
 }).join('\n')
 return `interface ${typeName} {\n${fields}\n}`
 }

 const inputCls = cn(
 'w-full border p-3 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded',
 dark ? 'bg-black border-white/[0.08] focus:border-emerald-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-emerald-500 text-black'
 )

 return (
 <div className={cn('flex h-[calc(100vh-64px)] overflow-hidden', dark ? 'bg-black' : 'bg-gray-50')}>
 {/* ── Sidebar List ──────────────────────────────────────────────── */}
 <div className={cn('w-64 border-r shrink-0 flex flex-col', dark ? 'border-white/[0.08] bg-black' : 'border-gray-200 bg-white')}>
 <div className="p-4 border-b border-inherit flex items-center justify-between">
 <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
 <Box size={14} className="text-emerald-500" /> Components
 </h2>
 <button
 onClick={handleCreateNew}
 className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-colors"
 >
 <Plus size={14} />
 </button>
 </div>
 <div className="flex-1 overflow-auto p-2 space-y-1">
 {loading ? (
 <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={16} /></div>
 ) : components.map(c => (
 <div key={c.id} className="group flex items-center gap-2 relative">
 <button
 onClick={() => { setActiveComponent(c); setActiveTab('visual') }}
 className={cn(
 'flex-1 text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors overflow-hidden text-ellipsis whitespace-nowrap rounded',
 activeComponent?.id === c.id
 ? 'bg-emerald-500 text-white'
 : dark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
 )}
 >
 {c.displayName}
 </button>
 <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
 <button
 onClick={(e) => { e.stopPropagation(); handleDuplicate(c.id) }}
 className="p-1 text-gray-400 hover:text-emerald-400 transition-colors"
 title="Duplicate"
 >
 <Copy size={12} />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }}
 className="p-1 text-gray-400 hover:text-red-500 transition-colors"
 title="Delete"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </div>
 ))}
 {!loading && components.length === 0 && (
 <div className="p-4 text-center text-[9px] text-gray-500 uppercase tracking-widest ">
 No components found
 </div>
 )}
 </div>
 </div>

 {/* ── Editor Main ────────────────────────────────────────────────── */}
 <div className="flex-1 overflow-auto bg-inherit relative custom-editor-scrollbar">
 {activeComponent ? (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-4xl mx-auto p-8 space-y-6"
 >
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-black uppercase tracking-widest ">Component Builder</h1>
 <p className={cn('text-[10px] uppercase tracking-widest font-bold mt-1', dark ? 'text-gray-500' : 'text-gray-400')}>
 {activeComponent.id ? 'Editing existing component' : 'Creating new component'}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setShowPreview(!showPreview)}
 className={cn('flex items-center gap-2 px-4 py-2.5 border text-[10px] font-black uppercase tracking-widest rounded-none transition-all', dark ? 'border-white/[0.08] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')}
 >
 {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
 {showPreview ? 'Hide' : 'Preview'}
 </button>
 <button
 onClick={handleSave}
 disabled={saving}
 className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest shadow-lg rounded-none transition-all disabled:opacity-50"
 >
 {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
 Save Component
 </button>
 </div>
 </div>

 {/* Tab navigation */}
 <div className={cn('flex items-center gap-1 p-1 border rounded-none w-fit', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200')}>
 {([
 { key: 'visual', label: 'Visual Editor', icon: Box },
 { key: 'code', label: 'Code / JSON Import', icon: Code },
 { key: 'ai', label: 'AI Generate', icon: Sparkles },
 ] as { key: EditorTab; label: string; icon: React.ElementType }[]).map(tab => {
 const Icon = tab.icon
 return (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={cn(
 'flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-none transition-all',
 activeTab === tab.key
 ? 'bg-emerald-500 text-white shadow'
 : dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-900'
 )}
 >
 <Icon size={12} /> {tab.label}
 </button>
 )
 })}
 </div>

 {/* ── Visual Editor ───────────────────────────────────────────── */}
 <AnimatePresence mode="wait">
 {activeTab === 'visual' && (
 <motion.div key="visual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
 {/* General info */}
 <div className={cn('p-6 border rounded-none space-y-4', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm')}>
 <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 border-b border-emerald-500/20 pb-2">General Info</h3>
 <div className="grid grid-cols-2 gap-4">
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
 <div className={cn('p-6 border rounded-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm')}>
 <div className="flex items-center justify-between mb-5 border-b border-emerald-500/20 pb-2">
 <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fields Configuration</h3>
 <button onClick={addField} className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest px-3 py-1.5 bg-emerald-500/10 rounded-none">
 <Plus size={12} /> Add Field
 </button>
 </div>
 <AnimatePresence>
 <div className="space-y-3">
 {activeComponent.fields.map((field, idx) => (
 <motion.div
 key={idx}
 layout
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0 }}
 className={cn('flex items-center gap-3 p-3.5 border rounded-none group', dark ? 'bg-black border-white/[0.06]' : 'bg-gray-50 border-gray-100')}
 >
 <input
 type="text"
 value={field.name}
 onChange={e => updateField(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
 placeholder="field_name"
 className="flex-1 bg-transparent border-b border-transparent focus:border-emerald-500 text-[11px] font-mono outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1 transition-colors"
 />
 <select
 value={field.type}
 onChange={e => updateField(idx, 'type', e.target.value)}
 className="w-36 bg-transparent border-b border-transparent focus:border-emerald-500 text-[10px] font-black uppercase tracking-widest outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1 transition-colors cursor-pointer"
 >
 {FIELD_TYPES.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
 </select>
 <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">
 <input type="checkbox" checked={field.required || false} onChange={e => updateField(idx, 'required', e.target.checked)} className="accent-emerald-500" />
 Req
 </label>
 <button onClick={() => removeField(idx)} className="text-red-500/40 hover:text-red-500 transition-colors p-1.5 rounded opacity-0 group-hover:opacity-100">
 <Trash2 size={14} />
 </button>
 </motion.div>
 ))}
 </div>
 </AnimatePresence>
 {activeComponent.fields.length === 0 && (
 <div className="py-12 text-center">
 <Box size={32} className="mx-auto text-gray-700 mb-3" strokeWidth={1} />
 <p className="text-[10px] text-gray-600 uppercase tracking-widest ">No fields yet. Add one above.</p>
 </div>
 )}
 </div>

 {/* JSON Preview */}
 {showPreview && (
 <div className={cn('p-6 border rounded-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm')}>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
 <Braces size={12} /> Live JSON Preview
 </h3>
 <div className="flex gap-2">
 <button
 onClick={() => { navigator.clipboard.writeText(generateJSON()); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
 className={cn('flex items-center gap-1.5 px-3 py-1.5 border text-[9px] font-black uppercase tracking-widest rounded-none transition-all', dark ? 'border-white/[0.08] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')}
 >
 {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />} Copy JSON
 </button>
 <button
 onClick={() => { const blob = new Blob([generateTS()], { type: 'text/typescript' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${activeComponent.slug || 'component'}.ts`; a.click() }}
 className={cn('flex items-center gap-1.5 px-3 py-1.5 border text-[9px] font-black uppercase tracking-widest rounded-none transition-all text-blue-400 border-blue-400/20 hover:bg-blue-500/10')}
 >
 <Download size={12} /> TypeScript
 </button>
 </div>
 </div>
 <pre className={cn('text-[11px] font-mono overflow-auto max-h-64 p-4 rounded-none text-emerald-400', dark ? 'bg-black' : 'bg-gray-900')}>{generateJSON()}</pre>
 </div>
 )}
 </motion.div>
 )}

 {/* ── Code / JSON Import Tab ───────────────────────────────── */}
 {activeTab === 'code' && (
 <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
 <div className={cn('p-6 border rounded-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm')}>
 <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-2">
 <Code size={12} /> Import from Code / JSON
 </h3>
 <p className={cn('text-[10px] mb-4 font-medium', dark ? 'text-gray-400' : 'text-gray-500')}>
 Paste a JSON component definition, a TypeScript interface, or a raw fields array. The parser will auto-detect the format.
 </p>

 {/* Format examples */}
 <div className={cn('p-4 rounded-none text-[10px] font-mono mb-4 text-emerald-400 border', dark ? 'bg-black border-white/[0.08]' : 'bg-gray-900 border-gray-700')}>
 <p className="text-gray-500 mb-2">// JSON format (recommended)</p>
 {`{
 "slug": "hero-section",
 "displayName": "Hero Section",
 "category": "Layout",
 "description": "Full-width hero with CTA",
 "fields": [
 { "name": "headline", "type": "text", "required": true },
 { "name": "subtext", "type": "textarea" },
 { "name": "backgroundImage", "type": "media" },
 { "name": "ctaLabel", "type": "text" },
 { "name": "ctaUrl", "type": "text" }
 ]
}`}
 </div>

 <textarea
 rows={12}
 value={codeImport}
 onChange={e => setCodeImport(e.target.value)}
 placeholder='Paste JSON or TypeScript interface here...'
 className={cn('w-full border p-4 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none placeholder:text-gray-600 resize-none', dark ? 'bg-black border-white/[0.08] focus:border-emerald-500/50 text-white' : 'bg-gray-50 border-gray-200 focus:border-emerald-500 text-gray-900')}
 />

 <div className="flex gap-3 mt-4">
 <button
 onClick={handleCodeImport}
 disabled={!codeImport.trim()}
 className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all disabled:opacity-40"
 >
 <ChevronRight size={14} /> Import to Visual Editor
 </button>
 <button
 onClick={handleRegisterCode}
 disabled={!codeImport.trim()}
 className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all disabled:opacity-40"
 title="Save directly to database without going through visual editor"
 >
 <Save size={14} /> Register Directly
 </button>
 <button
 onClick={() => setCodeImport('')}
 className={cn('flex items-center gap-2 px-4 py-2.5 border text-[10px] font-black uppercase tracking-widest rounded-none transition-all', dark ? 'border-white/[0.08] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')}
 >
 <X size={14} /> Clear
 </button>
 </div>
 </div>
 </motion.div>
 )}

 {/* ── AI Generate Tab ─────────────────────────────────────── */}
 {activeTab === 'ai' && (
 <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
 <div className={cn('p-6 border rounded-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-100 shadow-sm')}>
 <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-2">
 <Sparkles size={12} /> AI Component Architect
 </h3>
 <p className={cn('text-[10px] mb-6 font-medium', dark ? 'text-gray-400' : 'text-gray-500')}>
 Describe a component and the AI will generate its complete field schema. Works best with detailed descriptions.
 </p>

 <div className="space-y-4">
 <div>
 <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2">Describe your component</label>
 <textarea
 rows={5}
 value={aiPrompt}
 onChange={e => setAiPrompt(e.target.value)}
 placeholder={`e.g. "A pricing card component with a plan name, price per month, list of up to 5 feature bullets, a CTA button label, a highlighted/featured boolean flag, and a color accent picker."`}
 className={cn('w-full border p-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none placeholder:text-gray-600 resize-none', dark ? 'bg-black border-white/[0.08] focus:border-purple-500/50 text-white' : 'bg-gray-50 border-gray-200 focus:border-purple-500 text-gray-900')}
 />
 </div>

 {/* Prompt suggestions */}
 <div className="flex flex-wrap gap-2">
 {[
 'Navigation bar with logo, links array, and CTA button',
 'Product card with image, name, price, and discount badge',
 'Team member card with photo, name, role, bio, and social links',
 'Testimonial with quote, author, avatar, rating, and company',
 ].map(suggestion => (
 <button
 key={suggestion}
 onClick={() => setAiPrompt(suggestion)}
 className={cn('text-[9px] font-bold px-3 py-1.5 border rounded-none transition-all', dark ? 'border-white/[0.08] text-gray-500 hover:text-white hover:border-purple-500/50' : 'border-gray-200 text-gray-500 hover:text-black hover:border-purple-400')}
 >
 {suggestion.slice(0, 40)}...
 </button>
 ))}
 </div>

 <button
 disabled={isAIGenerating || !aiPrompt.trim()}
 onClick={handleAIGenerate}
 className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all rounded-none disabled:opacity-50 shadow-lg shadow-purple-900/30"
 >
 {isAIGenerating
 ? <><Loader2 size={14} className="animate-spin" /> Generating with AI...</>
 : <><Sparkles size={14} /> Generate Component</>
 }
 </button>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </motion.div>
 ) : (
 <div className="h-full flex items-center justify-center">
 <div className="text-center space-y-5 max-w-md px-8">
 <div className="w-16 h-16 mx-auto rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
 <Box size={28} className="text-emerald-400" strokeWidth={1.5} />
 </div>
 <div>
 <p className="text-[14px] font-black uppercase tracking-[0.2em] ">Component Builder</p>
 <p className={cn('text-[11px] font-medium mt-2 leading-relaxed', dark ? 'text-gray-500' : 'text-gray-400')}>
 Create reusable components like Navbars, Cards, and Hero Sections to use in Dynamic Zones and Blocks.
 Import from JSON, TypeScript interfaces, or let AI generate them.
 </p>
 </div>
 <div className="flex gap-3 justify-center">
 <button onClick={handleCreateNew} className="flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all shadow-lg shadow-emerald-900/30">
 <Plus size={14} /> New Component
 </button>
 <button onClick={() => { handleCreateNew(); setTimeout(() => setActiveTab('ai'), 50) }} className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all shadow-lg shadow-purple-900/30">
 <Sparkles size={14} /> AI Generate
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 )
}

export default ComponentBuilderPage
