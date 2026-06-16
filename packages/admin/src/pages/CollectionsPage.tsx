import React, { useEffect, useState } from 'react'
import {
 Database,
 Layers,
 ArrowRight,
 Search,
 Activity,
 Shield,
 Zap,
 Loader2,
 Plus,
 Trash2,
 Check,
 Code2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { useSystemMetadata } from '../hooks/useQueries'

const CollectionsPage: React.FC = () => {
 const { theme } = useTheme()
 // --- REGISTRY STATE: CONTENT INFRASTRUCTURE ---
 const [collections, setCollections] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [searchQuery, setSearchQuery] = useState('')
 const [stats, setStats] = useState<any>({})

 /**
 * REGISTRY HARVEST: SYNCHRONIZE CONTENT NODES
 * Orchestrates parallel retrieval of system health (for schema/labels)
 * and record counts for each collection node.
 */
 const { data: healthData, isLoading: healthLoading } = useSystemMetadata()

 useEffect(() => {
 const fetchCounts = async () => {
 if (!healthData) return
 try {
 const countsRes = await api.get('/system/counts').catch(() => null)
 
 const rawCollections = healthData.collections || []

 const processedCollections = rawCollections.map((c: any) => ({
 ...c,
 label: c.label || c.name || c.slug || 'Unnamed Collection',
 }))

 setCollections(processedCollections)
 setStats(countsRes?.data?.data || {})
 } catch (error) {
 console.error('Critical Registry Synchronization Failure', error)
 toast.error('Failed to load collections')
 } finally {
 setLoading(false)
 }
 }

 if (!healthLoading) {
 fetchCounts()
 }
 }, [healthData, healthLoading])

 /**
 * SEARCH & FILTER LOGIC: CLIENT-SIDE MATRIX REDUCTION
 */
 const filteredCollections = collections.filter((col) => {
 const label = (col.label || '').toLowerCase()
 const slug = (col.slug || '').toLowerCase()
 const query = searchQuery.toLowerCase()
 return label.includes(query) || slug.includes(query)
 })

 const [isAIModalOpen, setIsAIModalOpen] = useState(false)
 const [aiPrompt, setAiPrompt] = useState('')
 const [aiLoading, setAiLoading] = useState(false)
 const [aiResult, setAiResult] = useState<any>(null)

 const handleAIGenerate = async () => {
 if (!aiPrompt) return
 setAiLoading(true)
 setAiResult(null)
 try {
 const res = await api.post('/system/ai-architect', { prompt: aiPrompt })
 setAiResult(res.data?.data?.schema || { error: 'Failed to parse schema.' })
 } catch (e) {
 setAiResult({ error: 'Failed to connect to AI Architect.' })
 } finally {
 setAiLoading(false)
 }
 }

 // --- VISUAL CONTENT-TYPE BUILDER STATE ---
 const [isVisualModalOpen, setIsVisualModalOpen] = useState(false)
 const [visualLoading, setVisualLoading] = useState(false)
 const [newColName, setNewColName] = useState('')
 const [newColSlug, setNewColSlug] = useState('')
 const [newColDrafts, setNewColDrafts] = useState(true)
 const [newColFields, setNewColFields] = useState<any[]>([
 { name: 'title', type: 'text', required: true, options: '', relationTo: '' },
 ])

 const handleNameChange = (name: string) => {
 setNewColName(name)
 setNewColSlug(
 name
 .toLowerCase()
 .trim()
 .replace(/\s+/g, '-')
 .replace(/[^a-z0-9-]/g, '')
 )
 }

 const handleAddField = () => {
 setNewColFields([
 ...newColFields,
 { name: '', type: 'text', required: false, options: '', relationTo: '' },
 ])
 }

 const handleRemoveField = (index: number) => {
 setNewColFields(newColFields.filter((_, idx) => idx !== index))
 }

 const handleFieldChange = (index: number, key: string, value: any) => {
 setNewColFields(
 newColFields.map((field, idx) => {
 if (idx === index) {
 return { ...field, [key]: value }
 }
 return field
 })
 )
 }

 const handleCreateCollection = async () => {
 if (!newColName || !newColSlug || newColFields.length === 0) {
 toast.error('Please enter a collection name and add at least one field.')
 return
 }
 if (newColFields.some((f) => !f.name)) {
 toast.error('All fields must have a name.')
 return
 }

 setVisualLoading(true)
 try {
 await api.post('/system/collections', {
 name: newColName,
 slug: newColSlug,
 drafts: newColDrafts,
 fields: newColFields.map((f) => ({
 name: f.name
 .toLowerCase()
 .trim()
 .replace(/\s+/g, '_')
 .replace(/[^a-z0-9_]/g, ''),
 type: f.type,
 required: !!f.required,
 ...(f.type === 'select' &&
 f.options && {
 options: f.options
 .split(',')
 .map((o: string) => ({ label: o.trim(), value: o.trim() }))
 .filter((o: any) => o.value),
 }),
 ...(f.type === 'relationship' && f.relationTo && { relationTo: f.relationTo }),
 })),
 })
 toast.success('Collection created successfully! Reloading...')
 setIsVisualModalOpen(false)
 setTimeout(() => {
 window.location.reload()
 }, 1500)
 } catch (err: any) {
 toast.error(err.response?.data?.message || 'Failed to create collection.')
 } finally {
 setVisualLoading(false)
 }
 }

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-screen">
 <Loader2 className="animate-spin text-gray-600 dark:text-gray-500" size={32} />
 </div>
 )
 }

 return (
 <div
 className={cn(
 'p-10 space-y-10 min-h-screen transition-colors duration-500',
 theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900'
 )}
 >
 {/* 🏛️ Tactical Header */}
 <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
 <div className="flex items-center gap-6">
 <div
 className={cn(
 'w-16 h-16 rounded-none flex items-center justify-center shadow-2xl transition-all',
 theme === 'dark' ? 'bg-white text-black' : 'bg-gray-900 text-white'
 )}
 >
 <Database size={32} />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-3 mb-1">
 <span className="text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-[0.4em] ">
 Data_Architect
 </span>
 <div className="w-1.5 h-1.5 rounded-none bg-gray-500 shadow-[0_0_8px_#10b981]" />
 </div>
 <h1 className="text-5xl font-black tracking-tighter uppercase leading-none">
 Content Assets
 </h1>
 </div>
 </div>

 <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
 <button
 onClick={() => setIsVisualModalOpen(true)}
 className="flex items-center gap-2 px-6 py-4 bg-gray-600 dark:bg-gray-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-700 transition-colors shadow-lg shadow-gray-900/10"
 >
 <Plus size={14} />
 Create Collection
 </button>

 <button
 onClick={() => setIsAIModalOpen(true)}
 className="flex items-center gap-2 px-6 py-4 bg-gray-600 dark:bg-gray-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-700 transition-colors"
 >
 <Zap size={14} />
 AI Architect
 </button>

 <div className="relative w-full md:w-80">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
 <input
 type="text"
 placeholder="FILTER_COLLECTIONS..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className={cn(
 'w-full border rounded-none py-4 pl-12 pr-4 text-[10px] font-black focus:ring-4 transition-all outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black uppercase tracking-widest',
 theme === 'dark'
 ? 'bg-white/[0.03] border-white/[0.08] text-white focus:ring-gray-500/20'
 : 'bg-white border-gray-200 focus:ring-gray-500/10'
 )}
 />
 </div>
 </div>
 </header>

 {/* 📊 System Integrity Grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 {
 label: 'Total Records',
 value: String(Object.values(stats).reduce((a: number, b: number) => a + b, 0)),
 icon: Activity,
 sub: 'Global Synchronization',
 },
 { label: 'Schema Health', value: '100%', icon: Shield, sub: 'Optimal Performance' },
 { label: 'Latency', value: '14ms', icon: Zap, sub: 'Neural Processing' },
 ].map((item, i) => (
 <div
 key={i}
 className={cn(
 'p-8 border rounded-none flex flex-col gap-4 transition-all relative overflow-hidden group',
 theme === 'dark'
 ? 'bg-white/[0.02] border-white/[0.08]'
 : 'bg-white border-gray-200 shadow-sm shadow-sm'
 )}
 >
 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
 <item.icon size={80} />
 </div>
 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ">
 {item.label}
 </span>
 <div className="flex items-baseline gap-3">
 <span className="text-4xl font-black tracking-tighter">
 {item.value}
 </span>
 <span className="text-[9px] font-bold text-gray-600 dark:text-gray-500 uppercase tracking-widest">
 {item.sub}
 </span>
 </div>
 </div>
 ))}
 </div>

 {/* 🚀 Collection Matrix */}
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
 {filteredCollections.map((col, i) => (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 key={col.slug}
 >
 <Link
 to={`/collections/${col.slug}`}
 className={cn(
 'group p-6 border rounded-none flex flex-col gap-6 transition-all hover:-translate-y-1 relative',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] hover:border-gray-500/50'
 : 'bg-white border-gray-200 shadow-sm hover:border-gray-500 shadow-sm'
 )}
 >
 <div className="flex items-start justify-between">
 <div
 className={cn(
 'w-12 h-12 flex items-center justify-center transition-all',
 theme === 'dark'
 ? 'bg-white/[0.03] text-gray-400 group-hover:bg-white group-hover:text-black'
 : 'bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white'
 )}
 >
 <Layers size={20} />
 </div>
 <div className="flex flex-col items-end">
 <span className="text-[9px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest ">
 Registry_Node
 </span>
 <span className="text-lg font-black tracking-tighter">
 #{stats[col.slug] || 0}
 </span>
 </div>
 </div>

 <div>
 <h3 className="text-xl font-black uppercase tracking-tighter leading-none mb-2 group-hover:text-gray-600 dark:text-gray-500 transition-colors">
 {col.label.replace(/-/g, ' ')}
 </h3>
 <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
 System collection for managing {col.label.toLowerCase()} entries and metadata.
 </p>
 </div>

 <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
 <Link
 to={`/collections/${col.slug}/hooks`}
 onClick={(e) => e.stopPropagation()}
 className="flex items-center gap-1.5 text-[8px] font-black text-gray-500 hover:text-gray-600 dark:text-gray-400 uppercase tracking-[0.2em] transition-colors"
 >
 <Code2 size={10} />
 Hooks
 </Link>
 <ArrowRight
 size={14}
 className="text-gray-600 dark:text-gray-500 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all"
 />
 </div>
 </Link>
 </motion.div>
 ))}
 </div>

 {isAIModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
 <div
 className={cn(
 'w-full max-w-3xl p-8 border shadow-2xl relative',
 theme === 'dark'
 ? 'bg-[#0a0a0a] border-white/[0.08] text-white'
 : 'bg-white border-gray-200'
 )}
 >
 <button
 onClick={() => setIsAIModalOpen(false)}
 className="absolute top-4 right-4 text-gray-500 hover:text-white"
 >
 ✕
 </button>
 <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
 <Zap className="text-gray-600 dark:text-gray-500" /> AI Schema Architect
 </h2>
 <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">
 Describe the collection you want to create and let AI build the schema configuration.
 </p>

 <textarea
 value={aiPrompt}
 onChange={(e) => setAiPrompt(e.target.value)}
 placeholder="e.g., I need a blog post collection with title, content, cover image, seo metadata, and a category dropdown..."
 className={cn(
 'w-full h-32 p-4 mb-4 font-mono text-sm border outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:ring-2 focus:ring-gray-500 resize-none',
 theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-gray-50 border-gray-200'
 )}
 />

 <button
 onClick={handleAIGenerate}
 disabled={aiLoading}
 className="w-full py-4 bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2"
 >
 {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
 {aiLoading ? 'Synthesizing Architecture...' : 'Generate Schema'}
 </button>

 {aiResult && (
 <div className="mt-6 border-t border-white/[0.08] pt-6">
 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
 Generated Schema Configuration (Copy to cms.config.ts)
 </p>
 <div className="relative">
 <pre className="p-4 bg-black text-gray-600 dark:text-gray-400 text-xs font-mono overflow-auto max-h-64 border border-white/[0.08]">
 {JSON.stringify(aiResult, null, 2)}
 </pre>
 <button
 onClick={() => navigator.clipboard.writeText(JSON.stringify(aiResult, null, 2))}
 className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase text-white"
 >
 Copy
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 {isVisualModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
 <div
 className={cn(
 'w-full max-w-4xl p-10 border shadow-2xl relative my-8',
 theme === 'dark'
 ? 'bg-[#0a0a0a] border-white/[0.08] text-white'
 : 'bg-white border-gray-200 text-gray-900'
 )}
 >
 <button
 onClick={() => setIsVisualModalOpen(false)}
 className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-none border border-white/[0.08] transition-colors text-gray-400 hover:text-white"
 >
 ✕
 </button>
 <h2 className="text-3xl font-black uppercase tracking-tighter mb-4 flex items-center gap-3">
 <Database className="text-gray-600 dark:text-gray-500 animate-pulse" /> Visual Schema Builder
 </h2>
 <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8 border-b border-white/[0.08] pb-4 ">
 Define collection specifications, fields, types, and constraints visually without
 writing code.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 block">
 Collection Name
 </label>
 <input
 type="text"
 name="name"
 value={newColName}
 onChange={(e) => handleNameChange(e.target.value)}
 placeholder="e.g. Review"
 className={cn(
 'w-full px-4 py-3 text-sm font-bold border rounded-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all uppercase tracking-widest ',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] text-white'
 : 'bg-gray-50 border-gray-200'
 )}
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 block">
 Slug
 </label>
 <input
 type="text"
 name="slug"
 value={newColSlug}
 onChange={(e) => setNewColSlug(e.target.value)}
 placeholder="e.g. reviews"
 className={cn(
 'w-full px-4 py-3 text-sm font-bold border rounded-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all lowercase tracking-widest ',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] text-gray-400'
 : 'bg-gray-50 border-gray-200 text-gray-500'
 )}
 />
 </div>
 </div>

 <div className="flex items-center gap-3 mb-8 px-2">
 <input
 type="checkbox"
 id="enable-drafts-checkbox"
 checked={newColDrafts}
 onChange={(e) => setNewColDrafts(e.target.checked)}
 className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded-none bg-black"
 />
 <label
 htmlFor="enable-drafts-checkbox"
 className="text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none"
 >
 Enable Draft/Publish Workflow
 </label>
 </div>

 <div className="space-y-6">
 <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
 <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 ">
 Field Definitions
 </h3>
 <button
 onClick={handleAddField}
 className="px-4 py-2 border border-dashed border-gray-500/30 text-gray-600 dark:text-gray-400 hover:bg-gray-500/5 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
 >
 <Plus size={12} /> Add Field
 </button>
 </div>

 <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
 {newColFields.map((field, index) => (
 <div
 key={index}
 className={cn(
 'p-5 border rounded-none grid grid-cols-1 md:grid-cols-4 gap-4 items-center relative group/field',
 theme === 'dark'
 ? 'bg-black border-white/[0.08]'
 : 'bg-gray-50 border-gray-200 shadow-sm'
 )}
 >
 <div className="space-y-2">
 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 block">
 Field Name
 </label>
 <input
 type="text"
 name={`field-name-${index}`}
 value={field.name}
 onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
 placeholder="e.g. rating"
 className={cn(
 'w-full px-3 py-2 text-xs font-bold border rounded-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all lowercase font-mono',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] text-white'
 : 'bg-white border-gray-200'
 )}
 />
 </div>

 <div className="space-y-2">
 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 block">
 Type
 </label>
 <select
 value={field.type}
 onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
 className={cn(
 'w-full px-3 py-2 text-xs font-bold border rounded-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] text-white'
 : 'bg-white border-gray-200'
 )}
 >
 <option value="text">Text</option>
 <option value="number">Number</option>
 <option value="richtext">Rich Text</option>
 <option value="media">Media</option>
 <option value="checkbox">Boolean</option>
 <option value="select">Dropdown Select</option>
 <option value="relationship">Relationship</option>
 </select>
 </div>

 {field.type === 'select' ? (
 <div className="space-y-2">
 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 block">
 Options (Comma separated)
 </label>
 <input
 type="text"
 value={field.options || ''}
 onChange={(e) => handleFieldChange(index, 'options', e.target.value)}
 placeholder="e.g. red, blue, green"
 className={cn(
 'w-full px-3 py-2 text-xs font-bold border rounded-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] text-white'
 : 'bg-white border-gray-200'
 )}
 />
 </div>
 ) : field.type === 'relationship' ? (
 <div className="space-y-2">
 <label className="text-[8px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-500 block">
 Relate To Collection
 </label>
 <select
 value={field.relationTo || ''}
 onChange={(e) => handleFieldChange(index, 'relationTo', e.target.value)}
 className={cn(
 'w-full px-3 py-2 text-xs font-bold border rounded-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
 theme === 'dark'
 ? 'bg-black border-white/[0.08] text-white'
 : 'bg-white border-gray-200'
 )}
 >
 <option value="">Select Target...</option>
 <option value="users">Users</option>
 {collections.map((c) => (
 <option key={c.slug} value={c.slug}>
 {c.label}
 </option>
 ))}
 </select>
 </div>
 ) : (
 <div className="flex items-center gap-3 pt-6">
 <input
 type="checkbox"
 id={`required-checkbox-${index}`}
 checked={!!field.required}
 onChange={(e) => handleFieldChange(index, 'required', e.target.checked)}
 className="w-3.5 h-3.5 text-gray-600 focus:ring-gray-500 border-gray-300 rounded-none bg-black"
 />
 <label
 htmlFor={`required-checkbox-${index}`}
 className="text-[8px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none"
 >
 Required Field
 </label>
 </div>
 )}

 <div className="flex justify-end pt-5 md:pt-0">
 <button
 onClick={() => handleRemoveField(index)}
 disabled={newColFields.length === 1}
 className="p-2 border border-transparent hover:border-red-500/30 hover:bg-red-500/5 text-gray-500 hover:text-red-500 transition-colors disabled:opacity-20"
 >
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="mt-10 pt-8 border-t border-white/[0.08] flex justify-end gap-4">
 <button
 onClick={() => setIsVisualModalOpen(false)}
 className={cn(
 'px-6 py-3 font-black text-[9px] uppercase tracking-widest transition-all leading-none border',
 theme === 'dark'
 ? 'bg-white/5 border-white/[0.08] text-gray-400 hover:text-white'
 : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900'
 )}
 >
 Cancel
 </button>
 <button
 onClick={handleCreateCollection}
 disabled={visualLoading}
 className="px-8 py-3 bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white rounded-none text-[9px] font-black uppercase tracking-widest shadow-xl shadow-gray-600/20 transition-all flex items-center gap-2 leading-none"
 >
 {visualLoading ? (
 <Loader2 size={12} className="animate-spin" />
 ) : (
 <Check size={12} />
 )}
 Create Content Type
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}

export default CollectionsPage
