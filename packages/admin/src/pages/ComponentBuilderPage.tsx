import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Box, Save, Loader2, Trash2, Copy } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { cn } from '../lib/utils'
import api from '../lib/api'
import { confirm } from '../store/confirmStore'
import toast from 'react-hot-toast'
import type { CustomComponent } from '../hooks/useCustomComponents'
import { invalidateCustomComponentsCache } from '../hooks/useCustomComponents'

const FIELD_TYPES = [
  'text', 'textarea', 'number', 'boolean', 'richtext', 'date', 
  'email', 'media', 'relation', 'color', 'array', 'group', 'blocks', 'dz'
]

const CATEGORIES = ['General', 'Layout', 'Content', 'Commerce', 'Media', 'Social']

const ComponentBuilderPage: React.FC = () => {
  const { theme } = useTheme()
  const [components, setComponents] = useState<CustomComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeComponent, setActiveComponent] = useState<CustomComponent | null>(null)

  useEffect(() => {
    loadComponents()
  }, [])

  const loadComponents = async () => {
    try {
      const res = await api.get('/system/components')
      setComponents(res.data.data)
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
        const { id, ...dataToPost } = activeComponent // remove empty id
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

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar List */}
      <div className={cn(
        'w-64 border-r shrink-0 flex flex-col',
        theme === 'dark' ? 'border-white/5 bg-black' : 'border-gray-200 bg-gray-50'
      )}>
        <div className="p-4 border-b border-inherit flex items-center justify-between">
          <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Box size={14} /> Components
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
                onClick={() => setActiveComponent(c)}
                className={cn(
                  'flex-1 text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors overflow-hidden text-ellipsis whitespace-nowrap',
                  activeComponent?.id === c.id
                    ? 'bg-emerald-500 text-white'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                      : 'text-gray-600 hover:bg-black/5 hover:text-black'
                )}
              >
                {c.displayName}
              </button>
              <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-black/50 backdrop-blur">
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
            <div className="p-4 text-center text-[9px] text-gray-500 uppercase tracking-widest italic">
              No components found
            </div>
          )}
        </div>
      </div>

      {/* Editor Main */}
      <div className="flex-1 overflow-auto bg-inherit p-8 relative custom-editor-scrollbar">
        {activeComponent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto space-y-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black uppercase tracking-widest italic">Component Builder</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Design reusable UI blocks and data structures</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Component
              </button>
            </div>

            <div className={cn(
              'p-6 border space-y-4',
              theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100'
            )}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4 border-b border-emerald-500/20 pb-2">General Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Display Name</label>
                  <input
                    type="text"
                    value={activeComponent.displayName}
                    onChange={(e) => setActiveComponent({ ...activeComponent, displayName: e.target.value })}
                    className={cn(
                      'w-full border p-3 text-[11px] font-bold outline-none transition-colors',
                      theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                    )}
                    placeholder="e.g. Hero Section"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Category</label>
                  <select
                    value={activeComponent.category}
                    onChange={(e) => setActiveComponent({ ...activeComponent, category: e.target.value })}
                    className={cn(
                      'w-full border p-3 text-[11px] font-bold outline-none transition-colors',
                      theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                    )}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Component Slug (API ID)</label>
                  <input
                    type="text"
                    value={activeComponent.slug}
                    onChange={(e) => setActiveComponent({ ...activeComponent, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    disabled={!!activeComponent.id}
                    className={cn(
                      'w-full border p-3 text-[11px] font-bold outline-none transition-colors',
                      theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500 disabled:opacity-50' : 'bg-gray-50 border-gray-200 focus:border-emerald-500 disabled:opacity-50'
                    )}
                    placeholder="e.g. hero-section"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Description</label>
                  <input
                    type="text"
                    value={activeComponent.description}
                    onChange={(e) => setActiveComponent({ ...activeComponent, description: e.target.value })}
                    className={cn(
                      'w-full border p-3 text-[11px] font-bold outline-none transition-colors',
                      theme === 'dark' ? 'bg-black border-white/10 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                    )}
                    placeholder="Brief description of this component..."
                  />
                </div>
              </div>
            </div>

            <div className={cn(
              'p-6 border space-y-4',
              theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-gray-100'
            )}>
              <div className="flex items-center justify-between mb-4 border-b border-emerald-500/20 pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Fields Configuration</h3>
                <button
                  onClick={addField}
                  className="flex items-center gap-1 text-[9px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest"
                >
                  <Plus size={12} /> Add Field
                </button>
              </div>
              
              <div className="space-y-3">
                {activeComponent.fields.map((field, idx) => (
                  <div key={idx} className={cn(
                    'flex items-center gap-3 p-3 border group',
                    theme === 'dark' ? 'bg-black border-white/10' : 'bg-gray-50 border-gray-200'
                  )}>
                    <input
                      type="text"
                      value={field.name}
                      onChange={e => updateField(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="field_name"
                      className="flex-1 bg-transparent border-b border-transparent focus:border-emerald-500 text-[11px] font-mono outline-none py-1"
                    />
                    <select
                      value={field.type}
                      onChange={e => updateField(idx, 'type', e.target.value)}
                      className="w-32 bg-transparent border-b border-transparent focus:border-emerald-500 text-[10px] font-black uppercase tracking-widest outline-none py-1"
                    >
                      {FIELD_TYPES.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                    </select>
                    <label className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-gray-400">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={e => updateField(idx, 'required', e.target.checked)}
                        className="accent-emerald-500"
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
              <Box size={48} className="mx-auto text-white/5 dark:text-white/10" strokeWidth={1} />
              <p className="text-[12px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Component Builder</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                Create reusable components like Navbars, Cards, and Headers to use in Dynamic Zones and Blocks.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ComponentBuilderPage
