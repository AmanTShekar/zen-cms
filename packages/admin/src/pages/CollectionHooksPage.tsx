import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Loader2,
  Code2,
  Plus,
  Trash2,
  Shield,
  Globe,
  Zap,
  ChevronDown,
  ChevronRight,
  FileCode,
  Terminal,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import { useSystemMetadata } from '../hooks/useQueries'

// ── Types ─────────────────────────────────────────────────────────────────────

interface HookEntry {
  name: string
  label: string
  description: string
  event: string
  hasReturn: boolean
}

interface EndpointEntry {
  path: string
  method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  description: string
}

interface CollectionConfig {
  slug: string
  name: string
  hooks?: Record<string, string>
  endpoints?: EndpointEntry[]
  access?: Record<string, string>
  publicRead?: boolean
}

// ── Available hooks ───────────────────────────────────────────────────────────

const COLLECTION_HOOKS: HookEntry[] = [
  { name: 'beforeValidate', label: 'Before Validate', description: 'Runs before document validation. Use to sanitize or enrich input data.', event: 'beforeValidate', hasReturn: true },
  { name: 'beforeCreate', label: 'Before Create', description: 'Runs after validation, before document is saved. Use to set computed fields.', event: 'beforeCreate', hasReturn: true },
  { name: 'afterCreate', label: 'After Create', description: 'Runs after document is created. Use for side effects like notifications.', event: 'afterCreate', hasReturn: false },
  { name: 'beforeUpdate', label: 'Before Update', description: 'Runs after validation, before document is updated.', event: 'beforeUpdate', hasReturn: true },
  { name: 'afterUpdate', label: 'After Update', description: 'Runs after document is updated. Use for cache invalidation, sync.', event: 'afterUpdate', hasReturn: false },
  { name: 'beforeDelete', label: 'Before Delete', description: 'Runs before document deletion. Use to prevent deletion or cascade.', event: 'beforeDelete', hasReturn: false },
  { name: 'afterDelete', label: 'After Delete', description: 'Runs after document is deleted. Use for cleanup.', event: 'afterDelete', hasReturn: false },
  { name: 'afterRead', label: 'After Read', description: 'Runs after document is read. Use to transform output data.', event: 'afterRead', hasReturn: true },
  { name: 'afterError', label: 'After Error', description: 'Runs when an error occurs during any lifecycle event.', event: 'afterError', hasReturn: false },
]

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const

const HOOK_TEMPLATE = `(data, user, context) => {
  // Your hook logic here
  // data: the document data being processed
  // user: the authenticated user performing the action
  // context: { hookType: string /* additional context */ }
  return data;
}`

// const ENDPOINT_TEMPLATE = `(req, res) => {
//   // Custom endpoint logic
//   // req: Express request object (includes zenith adapter via req.zenith.adapter)
//   // res: Express response object
//   res.json({ message: 'Hello from custom endpoint' });
// }`

// ── Code Editor Component ─────────────────────────────────────────────────────

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  theme: 'light' | 'dark'
  height?: string
}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, theme, height = '160px' }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      spellCheck={false}
      className={cn(
        'w-full border rounded-none px-4 py-3 font-mono text-[11px] leading-relaxed resize-y outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black transition-all',
        theme === 'dark'
          ? 'bg-[#0B0F19] border-white/[0.08] text-emerald-300 focus:border-emerald-500/50'
          : 'bg-gray-900 border-gray-600 text-emerald-300 focus:border-emerald-500'
      )}
      style={{ minHeight: height, fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace' }}
    />
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const CollectionHooksPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()

  const [collection, setCollection] = useState<CollectionConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedHook, setExpandedHook] = useState<string | null>(null)

  // Local state for hooks and endpoints
  const [hooks, setHooks] = useState<Record<string, string>>({})
  const [endpoints, setEndpoints] = useState<EndpointEntry[]>([])
  const [publicRead, setPublicRead] = useState(false)

  // Dirty tracking
  const [originalHooks, setOriginalHooks] = useState<Record<string, string>>({})
  const [originalEndpoints, setOriginalEndpoints] = useState<EndpointEntry[]>([])
  const [originalPublicRead, setOriginalPublicRead] = useState(false)

  const isDirty = () => {
    return JSON.stringify(hooks) !== JSON.stringify(originalHooks) ||
      JSON.stringify(endpoints) !== JSON.stringify(originalEndpoints) ||
      publicRead !== originalPublicRead
  }

  // Field-level hooks state (unused, commented out to fix TS6133)
  // const [fieldHooks, setFieldHooks] = useState<Record<string, { beforeChange: string; afterRead: string; validate: string }>>({})
  // const [originalFieldHooks, setOriginalFieldHooks] = useState<Record<string, { beforeChange: string; afterRead: string; validate: string }>>({})

  const [fields, setFields] = useState<Array<{ name: string; type: string; label?: string }>>([])

  const { data: healthData, isLoading: healthLoading } = useSystemMetadata()

  const fetchCollectionConfig = useCallback(async () => {
    if (!healthData) return
    setLoading(true)
    try {
      // Use healthData which comes from the tenant-isolated useSystemMetadata hook
      const cols = healthData.collections || []
      const col = cols.find((c: any) => c.slug === slug)

      if (!col) {
        toast.error('Collection not found')
        navigate('/collections')
        return
      }

      const hooksConfig = col.hooks || {}
      const endpointsConfig = col.endpoints || []

      setCollection({ slug: col.slug, name: col.label || col.name || col.slug, hooks: hooksConfig, endpoints: endpointsConfig, access: col.access, publicRead: !!col.publicRead })
      setHooks(hooksConfig)
      setEndpoints(endpointsConfig)
      setPublicRead(!!col.publicRead)
      setOriginalHooks(hooksConfig)
      setOriginalEndpoints(endpointsConfig)
      setOriginalPublicRead(!!col.publicRead)

      // Extract fields and their hooks
      const colFields = (col.fields || []).filter((f: any) => !['row', 'tabs', 'ui', 'collapsible'].includes(f.type))
      setFields(colFields.map((f: any) => ({ name: f.name, type: f.type, label: f.label || f.name })))

      const fh: Record<string, any> = {}
      colFields.forEach((f: any) => {
        if (f.hooks) {
          fh[f.name] = {
            beforeChange: f.hooks.beforeChange || '',
            afterRead: f.hooks.afterRead || '',
            validate: f.hooks.validate || '',
          }
        }
      })
      // setFieldHooks(fh)
      // setOriginalFieldHooks(fh)
    } catch (err) {
      console.error('Failed to load collection config', err)
      toast.error('Failed to load collection configuration')
    } finally {
      setLoading(false)
    }
  }, [slug, navigate, healthData])

  useEffect(() => {
    if (!healthLoading) {
      fetchCollectionConfig()
    }
  }, [fetchCollectionConfig, healthData, healthLoading])

  const handleSave = async () => {
    if (!isDirty()) return
    setSaving(true)
    try {
      await api.patch(`/system/collections/${slug}`, {
        hooks,
        endpoints,
        publicRead,
      })
      setOriginalHooks(hooks)
      setOriginalEndpoints(endpoints)
      setOriginalPublicRead(publicRead)
      toast.success('Collection configuration saved')
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleAddHook = (hookName: string) => {
    if (hooks[hookName]) return
    setHooks(prev => ({
      ...prev,
      [hookName]: HOOK_TEMPLATE,
    }))
    setExpandedHook(hookName)
  }

  const handleUpdateHook = (hookName: string, code: string) => {
    setHooks(prev => ({ ...prev, [hookName]: code }))
  }

  const handleRemoveHook = (hookName: string) => {
    setHooks(prev => {
      const next = { ...prev }
      delete next[hookName]
      return next
    })
    if (expandedHook === hookName) setExpandedHook(null)
  }

  const handleAddEndpoint = () => {
    setEndpoints(prev => [...prev, { path: '', method: 'get', description: '' }])
  }

  const handleUpdateEndpoint = (idx: number, key: keyof EndpointEntry, value: string) => {
    setEndpoints(prev => prev.map((e, i) => i === idx ? { ...e, [key]: value } : e))
  }

  const handleRemoveEndpoint = (idx: number) => {
    setEndpoints(prev => prev.filter((_, i) => i !== idx))
  }

  const activeHooks = COLLECTION_HOOKS.filter(h => hooks[h.name])

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 size={32} className="text-emerald-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/[0.08] pb-8">
        <div className="flex items-center gap-4">
          <Link
            to={`/collections/${slug}`}
            className={cn(
              'w-10 h-10 rounded-none border flex items-center justify-center transition-colors',
              theme === 'dark' ? 'border-white/[0.08] text-gray-500 hover:text-white hover:border-white/[0.08]' : 'border-gray-200 text-gray-400 hover:text-gray-600'
            )}
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-none bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Code2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase italic leading-none tracking-tight">
                Hooks & Endpoints
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                {collection?.name || slug} · Lifecycle hooks and custom API endpoints
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty()}
          className={cn(
            'flex items-center justify-center gap-3 px-8 py-4 rounded-none text-[10px] font-black uppercase tracking-widest italic transition-all shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50',
            theme === 'dark' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'
          )}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Sidebar: Available hooks + Settings */}
        <div className="xl:col-span-1 space-y-6">
          {/* Public Read Toggle */}
          <div className={cn(
            'p-5 border rounded-none',
            theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-white border-gray-100'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe size={14} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Public Read Access</span>
              </div>
              <button
                onClick={() => setPublicRead(!publicRead)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {publicRead ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-gray-600" />}
              </button>
            </div>
            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-2">
              Allow unauthenticated access to read this collection
            </p>
          </div>

          {/* Available hooks to add */}
          <div className={cn(
            'border rounded-none overflow-hidden',
            theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-white border-gray-100'
          )}>
            <div className="px-5 py-3 border-b border-white/[0.08]">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Available Lifecycle Hooks</span>
            </div>
            <div className="divide-y divide-white/5">
              {COLLECTION_HOOKS.map(hook => {
                const isActive = !!hooks[hook.name]
                return (
                  <div
                    key={hook.name}
                    className={cn(
                      'px-5 py-3 flex items-center justify-between transition-colors',
                      isActive
                        ? 'bg-emerald-500/5'
                        : theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isActive && <div className="w-1.5 h-1.5 rounded-none bg-emerald-500" />}
                      <span className={cn(
                        'text-[10px] font-black uppercase tracking-widest',
                        isActive ? 'text-emerald-400' : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                      )}>
                        {hook.label}
                      </span>
                    </div>
                    {!isActive && (
                      <button
                        onClick={() => handleAddHook(hook.name)}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        title={`Add ${hook.label} hook`}
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick info */}
          <div className={cn(
            'p-5 border rounded-none space-y-3',
            theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-white border-gray-100'
          )}>
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-gray-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Runtime Info</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Active Hooks</span>
                <span className="text-[8px] text-emerald-400 font-black">{activeHooks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Custom Endpoints</span>
                <span className="text-[8px] text-emerald-400 font-black">{endpoints.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Fields</span>
                <span className="text-[8px] text-emerald-400 font-black">{fields.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content: Active hooks + Endpoints */}
        <div className="xl:col-span-2 space-y-8">
          {/* Collection Lifecycle Hooks */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-4">
              <Zap size={16} className="text-emerald-400" />
              <h2 className="text-sm font-black uppercase italic tracking-wider">Collection Lifecycle Hooks</h2>
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest ml-auto">
                {activeHooks.length} active
              </span>
            </div>

            {activeHooks.length === 0 ? (
              <div className={cn(
                'p-8 border border-dashed rounded-none text-center space-y-3',
                theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
              )}>
                <Code2 size={32} className="mx-auto text-gray-600" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  No hooks configured
                </p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider">
                  Click + in the sidebar to add lifecycle hooks
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {activeHooks.map(hook => {
                  const isOpen = expandedHook === hook.name
                  return (
                    <motion.div
                      key={hook.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={cn(
                        'border rounded-none overflow-hidden',
                        theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-white border-gray-100'
                      )}
                    >
                      <button
                        onClick={() => setExpandedHook(isOpen ? null : hook.name)}
                        className={cn(
                          'w-full px-5 py-4 flex items-center justify-between transition-colors',
                          isOpen
                            ? theme === 'dark' ? 'bg-emerald-500/5' : 'bg-emerald-50'
                            : theme === 'dark' ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown size={14} className="text-emerald-400" /> : <ChevronRight size={14} className="text-gray-500" />}
                          <FileCode size={14} className="text-emerald-400" />
                          <div className="flex flex-col items-start">
                            <span className="text-[11px] font-black uppercase tracking-tight italic text-white">{hook.label}</span>
                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">{hook.event}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveHook(hook.name) }}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          title="Remove hook"
                        >
                          <Trash2 size={14} />
                        </button>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 space-y-3">
                          <p className="text-[9px] text-gray-400 font-bold italic uppercase tracking-widest">
                            {hook.description}
                          </p>
                          <CodeEditor
                            value={hooks[hook.name]}
                            onChange={(code) => handleUpdateHook(hook.name, code)}
                            theme={theme}
                            height="200px"
                          />
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Custom Endpoints */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <Globe size={16} className="text-emerald-400" />
                <h2 className="text-sm font-black uppercase italic tracking-wider">Custom Endpoints</h2>
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                  {endpoints.length} defined
                </span>
              </div>
              <button
                onClick={handleAddEndpoint}
                className="flex items-center gap-2 px-3 py-1.5 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-[9px] font-black uppercase italic transition-all text-emerald-400 hover:text-white"
              >
                <Plus size={10} />
                Add Endpoint
              </button>
            </div>

            {endpoints.length === 0 ? (
              <div className={cn(
                'p-8 border border-dashed rounded-none text-center space-y-3',
                theme === 'dark' ? 'border-white/[0.08]' : 'border-gray-200'
              )}>
                <Globe size={32} className="mx-auto text-gray-600" />
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  No custom endpoints
                </p>
                <p className="text-[9px] text-gray-600 uppercase tracking-wider">
                  Add custom API endpoints for this collection
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {endpoints.map((ep, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-5 border rounded-none space-y-4',
                      theme === 'dark' ? 'bg-white/[0.01] border-white/[0.08]' : 'bg-white border-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <select
                        value={ep.method}
                        onChange={(e) => handleUpdateEndpoint(idx, 'method', e.target.value)}
                        className={cn(
                          'bg-[#0B0F19] border text-[9px] font-black uppercase italic outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black py-1.5 px-3 rounded-none focus:border-emerald-500',
                          theme === 'dark' ? 'border-white/[0.08] text-emerald-400' : 'border-gray-200 text-emerald-600'
                        )}
                      >
                        {HTTP_METHODS.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={ep.path}
                        onChange={(e) => handleUpdateEndpoint(idx, 'path', e.target.value)}
                        placeholder="/custom-path"
                        className={cn(
                          'flex-1 border rounded-none py-2 px-3 text-[11px] font-mono italic transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                          theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-white focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                        )}
                      />
                      <button
                        onClick={() => handleRemoveEndpoint(idx)}
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ep.description}
                      onChange={(e) => handleUpdateEndpoint(idx, 'description', e.target.value)}
                      placeholder="Brief description of this endpoint..."
                      className={cn(
                        'w-full border rounded-none py-2 px-3 text-[10px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black',
                        theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08] text-gray-300 focus:border-emerald-500' : 'bg-gray-50 border-gray-200 focus:border-emerald-500'
                      )}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info card */}
          <div className={cn(
            'p-6 border rounded-none space-y-4',
            theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-100'
          )}>
            <div className="flex items-center gap-3">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Developer Notes</span>
            </div>
            <ul className="space-y-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              <li>• Hooks are stored as JSON configuration and executed server-side</li>
              <li>• <code className="text-emerald-400 font-mono">before*</code> hooks can modify data by returning the modified value</li>
              <li>• <code className="text-emerald-400 font-mono">after*</code> hooks are for side effects (fire-and-forget)</li>
              <li>• Custom endpoints are mounted at <code className="text-emerald-400 font-mono">/api/v1/{slug}/your-path</code></li>
              <li>• Access <code className="text-emerald-400 font-mono">req.zenith.adapter</code> for database operations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CollectionHooksPage
