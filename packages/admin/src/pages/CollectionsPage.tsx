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
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { useSystemMetadata } from '../hooks/useQueries'
import { PageHeader } from '../components/ui/PageHeader'

const CollectionsPage: React.FC = () => {
 const { theme } = useTheme()
 const navigate = useNavigate()
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
        <Loader2 className="animate-spin text-gray-600 dark:text-z-secondary" size={32} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <PageHeader
        title="Content Assets"
        actions={
          <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
            <button
              onClick={() => setIsVisualModalOpen(true)}
              className="flex items-center gap-2 px-6 py-4 bg-z-accent text-white text-sm font-semibold hover:bg-z-accent transition-colors shadow-lg shadow-sm"
            >
              <Plus size={14} />
              Create Collection
            </button>

            <button
              onClick={() => setIsAIModalOpen(true)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-semibold   transition-colors",
                'bg-z-panel hover:bg-z-hover text-z-primary border-z-border'
              )}
            >
              <Zap size={14} className="text-z-active-text" />
              AI Architect
            </button>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-z-secondary" size={14} />
              <input
                type="text"
                placeholder="FILTER_COLLECTIONS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full border rounded-none-none py-4 pl-12 pr-4 text-sm font-semibold transition-all outline-none  ',
                  theme === 'dark'
                    ? 'bg-z-hover border-z-border text-white focus:border-z-accent/50 focus:bg-z-hover'
                    : 'bg-z-panel border-z-border focus:border-z-accent/50'
                )}
              />
            </div>
          </div>
        }
      />
      <div className={cn(
        'flex-1 overflow-y-auto p-6 md:p-10 space-y-10 transition-colors duration-500',
        theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-z-primary'
      )}>
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
                'p-8 border rounded-none-none flex flex-col gap-4 transition-all relative overflow-hidden group',
                theme === 'dark'
                  ? 'bg-z-panel border-z-border'
                  : 'bg-z-panel border-z-border shadow-sm shadow-sm'
              )}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <item.icon size={80} />
              </div>
              <span className="text-sm font-semibold text-z-secondary">
                {item.label}
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-semibold">
                  {item.value}
                </span>
                <span className="text-sm font-bold text-gray-600 dark:text-z-secondary">
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
              <div
                onClick={() => navigate(`/collections/${col.slug}`)}
                className={cn(
                  'group p-8 border flex flex-col items-center text-center gap-5 transition-all duration-500 relative overflow-hidden cursor-pointer',
                  theme === 'dark'
                    ? 'bg-black/65 backdrop-blur-xl border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.1)] hover:scale-[1.02] hover:border-z-accent/50 hover:shadow-[0_8px_40px_rgba(139,92,246,0.15)]'
                    : 'bg-white/80 backdrop-blur-xl border-black/5 shadow-[0_4px_30px_rgba(0,0,0,0.05)] hover:scale-[1.02] hover:border-z-accent/50 hover:shadow-[0_8px_40px_rgba(139,92,246,0.15)]'
                )}
              >
                {/* Micro-animation gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-z-accent/0 to-z-accent/0 group-hover:from-z-accent/5 group-hover:to-transparent transition-all duration-500" />
                
                <div
                  className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 relative z-10',
                    theme === 'dark'
                      ? 'bg-white/5 text-z-muted group-hover:bg-z-accent/20 group-hover:text-z-active-text'
                      : 'bg-black/5 text-z-muted group-hover:bg-z-accent/10 group-hover:text-z-accent'
                  )}
                >
                  <Layers size={24} strokeWidth={1.5} />
                </div>

                <div className="relative z-10 flex flex-col items-center w-full">
                  <h3 className="text-xl font-black tracking-tight leading-none mb-3 group-hover:text-z-active-text transition-colors duration-500">
                    {col.label.replace(/-/g, ' ')}
                  </h3>
                  <div className="flex items-center justify-center mb-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest', theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/5 text-black')}>
                      {stats[col.slug] || 0} Entries
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-z-secondary leading-relaxed max-w-[90%]">
                    Manage and organize your {col.label.toLowerCase()} documents.
                  </p>
                </div>

                <div className="w-full flex items-center justify-center pt-5 mt-auto border-t border-z-border/50 relative z-10">
                  <Link
                    to={`/collections/${col.slug}/hooks`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-z-secondary hover:text-z-active-text transition-colors duration-300"
                  >
                    <Code2 size={12} />
                    Manage Hooks
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {isAIModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
              className={cn(
                'w-full max-w-3xl p-8 border shadow-2xl relative',
                theme === 'dark'
                  ? 'bg-[#0a0a0a] border-z-border text-white'
                  : 'bg-z-panel border-z-border'
              )}
            >
              <button
                onClick={() => setIsAIModalOpen(false)}
                className="absolute top-4 right-4 text-z-secondary hover:text-white"
              >
                ✕
              </button>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Zap className="text-gray-600 dark:text-z-secondary" /> AI Schema Architect
              </h2>
              <p className="text-sm font-bold text-z-secondary mb-6">
                Describe the collection you want to create and let AI build the schema configuration.
              </p>

              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., I need a blog post collection with title, content, cover image, seo metadata, and a category dropdown..."
                className={cn(
                  'w-full h-32 p-4 mb-4 font-mono text-sm border outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:ring-2 focus:ring-gray-500 resize-none',
                  theme === 'dark' ? 'bg-black border-z-border' : 'bg-z-input border-z-border'
                )}
              />

              <button
                onClick={handleAIGenerate}
                disabled={aiLoading}
                className="w-full py-4 bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white font-semibold flex items-center justify-center gap-2"
              >
                {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
                {aiLoading ? 'Synthesizing Architecture...' : 'Generate Schema'}
              </button>

              {aiResult && (
                <div className="mt-6 border-t border-z-border pt-6">
                  <p className="text-sm font-bold text-z-muted mb-2">
                    Generated Schema Configuration (Copy to cms.config.ts)
                  </p>
                  <div className="relative">
                    <pre className="p-4 bg-black text-gray-600 dark:text-z-muted text-xs font-mono overflow-auto max-h-64 border border-z-border">
                      {JSON.stringify(aiResult, null, 2)}
                    </pre>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(aiResult, null, 2))}
                      className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-sm font-semibold text-white"
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
                  ? 'bg-[#0a0a0a] border-z-border text-white'
                  : 'bg-z-panel border-z-border text-z-primary'
              )}
            >
              <button
                onClick={() => setIsVisualModalOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-z-hover hover:bg-white/10 rounded-none-none border border-z-border transition-colors text-z-muted hover:text-white"
              >
                ✕
              </button>
              <h2 className="text-3xl font-semibold mb-4 flex items-center gap-3">
                <Database className="text-gray-600 dark:text-z-secondary animate-pulse" /> Visual Schema Builder
              </h2>
              <p className="text-sm font-semibold text-z-secondary mb-8 border-b border-z-border pb-4">
                Define collection specifications, fields, types, and constraints visually without
                writing code.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newColName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Review"
                    className={cn(
                      'w-full px-4 py-3 text-sm font-bold border rounded-none-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all   ',
                      theme === 'dark'
                        ? 'bg-black border-z-border text-white'
                        : 'bg-z-input border-z-border'
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">
                    Slug
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={newColSlug}
                    onChange={(e) => setNewColSlug(e.target.value)}
                    placeholder="e.g. reviews"
                    className={cn(
                      'w-full px-4 py-3 text-sm font-bold border rounded-none-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all lowercase  ',
                      theme === 'dark'
                        ? 'bg-black border-z-border text-z-muted'
                        : 'bg-z-input border-z-border text-z-secondary'
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
                  className="w-4 h-4 text-gray-600 focus:ring-gray-500 border-z-border-strong rounded-none-none bg-black"
                />
                <label
                  htmlFor="enable-drafts-checkbox"
                  className="text-sm font-semibold text-z-muted cursor-pointer select-none"
                >
                  Enable Draft/Publish Workflow
                </label>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-z-border pb-3">
                  <h3 className="text-xs font-semibold text-z-muted">
                    Field Definitions
                  </h3>
                  <button
                    onClick={handleAddField}
                    className="px-4 py-2 border border-dashed border-gray-500/30 text-gray-600 dark:text-z-muted hover:bg-gray-500/5 text-sm font-semibold transition-all flex items-center gap-2"
                  >
                    <Plus size={12} /> Add Field
                  </button>
                </div>

                <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                  {newColFields.map((field, index) => (
                    <div
                      key={index}
                      className={cn(
                        'p-5 border rounded-none-none grid grid-cols-1 md:grid-cols-4 gap-4 items-center relative group/field',
                        theme === 'dark'
                          ? 'bg-black border-z-border'
                          : 'bg-z-input border-z-border shadow-sm'
                      )}
                    >
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">
                          Field Name
                        </label>
                        <input
                          type="text"
                          name={`field-name-${index}`}
                          value={field.name}
                          onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                          placeholder="e.g. rating"
                          className={cn(
                            'w-full px-3 py-2 text-xs font-bold border rounded-none-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all lowercase font-mono',
                            theme === 'dark'
                              ? 'bg-black border-z-border text-white'
                              : 'bg-z-panel border-z-border'
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">
                          Type
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                          className={cn(
                            'w-full px-3 py-2 text-xs font-bold border rounded-none-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
                            theme === 'dark'
                              ? 'bg-black border-z-border text-white'
                              : 'bg-z-panel border-z-border'
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
                          <label className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">
                            Options (Comma separated)
                          </label>
                          <input
                            type="text"
                            value={field.options || ''}
                            onChange={(e) => handleFieldChange(index, 'options', e.target.value)}
                            placeholder="e.g. red, blue, green"
                            className={cn(
                              'w-full px-3 py-2 text-xs font-bold border rounded-none-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
                              theme === 'dark'
                                ? 'bg-black border-z-border text-white'
                                : 'bg-z-panel border-z-border'
                            )}
                          />
                        </div>
                      ) : field.type === 'relationship' ? (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-600 dark:text-z-secondary block">
                            Relate To Collection
                          </label>
                          <select
                            value={field.relationTo || ''}
                            onChange={(e) => handleFieldChange(index, 'relationTo', e.target.value)}
                            className={cn(
                              'w-full px-3 py-2 text-xs font-bold border rounded-none-none focus:ring-2 focus:ring-gray-500 outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
                              theme === 'dark'
                                ? 'bg-black border-z-border text-white'
                                : 'bg-z-panel border-z-border'
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
                            className="w-3.5 h-3.5 text-gray-600 focus:ring-gray-500 border-z-border-strong rounded-none-none bg-black"
                          />
                          <label
                            htmlFor={`required-checkbox-${index}`}
                            className="text-sm font-semibold text-z-muted cursor-pointer select-none"
                          >
                            Required Field
                          </label>
                        </div>
                      )}

                      <div className="flex justify-end pt-5 md:pt-0">
                        <button
                          onClick={() => handleRemoveField(index)}
                          disabled={newColFields.length === 1}
                          className="p-2 border border-transparent hover:border-red-500/30 hover:bg-red-500/5 text-z-secondary hover:text-red-500 transition-colors disabled:opacity-20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-z-border flex justify-end gap-4">
                <button
                  onClick={() => setIsVisualModalOpen(false)}
                  className={cn(
                    'px-6 py-3 font-semibold text-sm   transition-all leading-none border',
                    theme === 'dark'
                      ? 'bg-z-hover border-z-border text-z-muted hover:text-white'
                      : 'bg-z-panel border-z-border text-z-muted hover:text-z-primary'
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCollection}
                  disabled={visualLoading}
                  className="px-8 py-3 bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 text-white rounded-none-none text-sm font-semibold shadow-xl shadow-gray-600/20 transition-all flex items-center gap-2 leading-none"
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
    </div>
  )
}

export default CollectionsPage
