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
import { BuilderVisualTab } from './component-builder/BuilderVisualTab'
import { BuilderCodeTab } from './component-builder/BuilderCodeTab'
import { BuilderAITab } from './component-builder/BuilderAITab'






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
 toast.error(`Parse error: ${(err instanceof Error ? err.message : String(err))}`)
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
 toast.error(err.response?.data?.message || (err instanceof Error ? err.message : String(err)) || 'Failed to register component')
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
 richtext: 'string', json: 'any',
 array: 'any[]', blocks: 'Block[]', group: 'any',
 select: 'string',
 }
 const fields = activeComponent.fields.map(f => {
 const ts = typeMap[f.type] || 'unknown'
 return ` ${f.name}: ${ts}`
 }).join('\n')
 return `interface ${typeName} {\n${fields}\n}`
 }

 const inputCls = cn(
 'w-full border p-3 text-[11px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-colors rounded',
 dark ? 'bg-black border-white/[0.08] focus:border-gray-500 text-white' : 'bg-gray-50 border-gray-200 focus:border-gray-500 text-black'
 )

 return (
 <div className={cn('flex h-[calc(100vh-64px)] overflow-hidden', dark ? 'bg-black' : 'bg-gray-50')}>
 {/* ── Sidebar List ──────────────────────────────────────────────── */}
 <div className={cn('w-64 border-r shrink-0 flex flex-col', dark ? 'border-white/[0.08] bg-black' : 'border-gray-200 bg-white')}>
 <div className="p-4 border-b border-inherit flex items-center justify-between">
 <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
 <Box size={14} className="text-gray-600 dark:text-gray-500" /> Components
 </h2>
 <button
 onClick={handleCreateNew}
 className="p-1.5 hover:bg-gray-500/10 text-gray-600 dark:text-gray-500 rounded transition-colors"
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
 ? 'bg-gray-500 text-white'
 : dark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
 )}
 >
 {c.displayName}
 </button>
 <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
 <button
 onClick={(e) => { e.stopPropagation(); handleDuplicate(c.id) }}
 className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors"
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
 className="flex items-center gap-2 px-6 py-2.5 bg-gray-500 hover:bg-gray-400 text-white text-[10px] font-black uppercase tracking-widest shadow-lg rounded-none transition-all disabled:opacity-50"
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
 ? 'bg-gray-500 text-white shadow'
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
 <BuilderVisualTab
 activeComponent={activeComponent}
 setActiveComponent={setActiveComponent}
 showPreview={showPreview}
 generateJSON={generateJSON}
 generateTS={generateTS}
 copied={copied}
 setCopied={setCopied}
 dark={dark}
 />
 )}

 {/* ── Code / JSON Import Tab ───────────────────────────────── */}
 {activeTab === 'code' && (
 <BuilderCodeTab
 codeImport={codeImport}
 setCodeImport={setCodeImport}
 handleCodeImport={handleCodeImport}
 handleRegisterCode={handleRegisterCode}
 dark={dark}
 />
 )}

 {/* ── AI Generate Tab ─────────────────────────────────────── */}
 {activeTab === 'ai' && (
 <BuilderAITab
 aiPrompt={aiPrompt}
 setAiPrompt={setAiPrompt}
 isAIGenerating={isAIGenerating}
 handleAIGenerate={handleAIGenerate}
 dark={dark}
 />
 )}
 </AnimatePresence>
 </motion.div>
 ) : (
 <div className="h-full flex items-center justify-center">
 <div className="text-center space-y-5 max-w-md px-8">
 <div className="w-16 h-16 mx-auto rounded-none bg-gray-500/10 border border-gray-500/20 flex items-center justify-center">
 <Box size={28} className="text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
 </div>
 <div>
 <p className="text-[14px] font-black uppercase tracking-[0.2em] ">Component Builder</p>
 <p className={cn('text-[11px] font-medium mt-2 leading-relaxed', dark ? 'text-gray-500' : 'text-gray-400')}>
 Create reusable components like Navbars, Cards, and Hero Sections to use in Dynamic Zones and Blocks.
 Import from JSON, TypeScript interfaces, or let AI generate them.
 </p>
 </div>
 <div className="flex gap-3 justify-center">
 <button onClick={handleCreateNew} className="flex items-center gap-2 px-5 py-3 bg-gray-500 hover:bg-gray-400 text-white text-[10px] font-black uppercase tracking-widest rounded-none transition-all shadow-lg shadow-gray-900/30">
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
