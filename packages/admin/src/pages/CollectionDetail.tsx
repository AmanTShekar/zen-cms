import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2,
  Save,
  Globe,
  History,
  ArrowLeft,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Terminal,
  RefreshCw,
  ArrowRight,
  Clock,
  Eye,
} from 'lucide-react'
import api from '../lib/api'
import FormBuilder from '../components/FormBuilder'
import SpatialEditor from './SpatialEditor'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import type { FieldConfig } from '@zenithcms/types'

interface ActiveUser { id?: string; email?: string }
interface VersionDoc { _id: string; createdAt: string; snapshot: Record<string, unknown> }
interface PresenceState { isLocked: boolean; activeUsers: ActiveUser[]; message: string | null }

const CollectionDetail: React.FC<{ isGlobal?: boolean }> = ({ isGlobal: initialIsGlobal }) => {
  const { slug: routeSlug, id: routeId } = useParams<{ slug: string; id: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isPagesPath = window.location.pathname.includes('/collections/pages/') || window.location.pathname.startsWith('/globals/')
  const [showVisualEditor, setShowVisualEditor] = useState(isPagesPath)
  const [focusedSectionId, setFocusedSectionId] = useState<string | undefined>()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [fields, setFields] = useState<FieldConfig[]>([])
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isZenMode, setIsZenMode] = useState(false)
  const [versions, setVersions] = useState<VersionDoc[]>([])
  const getSlugFromPath = useCallback(() => {
    if (routeSlug) return routeSlug
    const path = window.location.pathname
    if (path.includes('/collections/pages/')) return 'pages'
    if (path.includes('/globals/')) {
      const parts = path.split('/')
      const globalsIndex = parts.indexOf('globals')
      if (globalsIndex !== -1 && parts[globalsIndex + 1]) {
        return parts[globalsIndex + 1]
      }
    }
    return ''
  }, [routeSlug])

  const [isGlobal, setIsGlobal] = useState(initialIsGlobal)
  const [resolvedSlug, setResolvedSlug] = useState(() => getSlugFromPath())
  const [resolvedId, setResolvedId] = useState(routeId?.split(':')[0] || 'singleton')

  const [activeLocale, setActiveLocale] = useState('en')
  const [isTranslationMode, setIsTranslationMode] = useState(false)
  const [sourceLocale, setSourceLocale] = useState('en')
  const [targetLocale, setTargetLocale] = useState('es')

  const [presence, setPresence] = useState<PresenceState>({
    isLocked: false,
    activeUsers: [],
    message: null,
  })
  const [selectedVersion, setSelectedVersion] = useState<VersionDoc | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [selectedFieldsToRollback, setSelectedFieldsToRollback] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState('')
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [versionPreviewMode, setVersionPreviewMode] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewToken, setPreviewToken] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Generate preview token when data is available
  useEffect(() => {
    if (!data || !resolvedId || resolvedId === 'new') return
    const generateToken = async () => {
      try {
        const res = await api.post(`/${resolvedSlug}/${resolvedId}/preview-token`)
        setPreviewToken(res.data.data?.token || null)
      } catch {
        setPreviewToken(null)
      }
    }
    generateToken()
  }, [data, resolvedId, resolvedSlug])

  const fetchSchemaAndData = useCallback(async () => {
    setLoading(true)
    try {
      const healthRes = await api.get('/health')
      const collections = healthRes.data.data?.collections || []
      const globals = healthRes.data.data?.globals || []

      const baseSlug = getSlugFromPath()

      const globalMatch = globals.find((g: Record<string, unknown>) => g.slug === baseSlug)
      const collectionMatch = collections.find(
        (c: Record<string, unknown>) => c.slug === baseSlug
      )

      const effectiveIsGlobal = !!globalMatch || initialIsGlobal
      const effectiveSlug = effectiveIsGlobal ? `globals/${baseSlug}` : baseSlug
      const effectiveId = effectiveIsGlobal ? 'singleton' : routeId?.split(':')[0] || 'singleton'

      setIsGlobal(effectiveIsGlobal)
      setResolvedSlug(effectiveSlug)
      setResolvedId(effectiveId)

      const schema = globalMatch || collectionMatch
      if (schema) {
        setFields(schema.fields || [])
        setConfig(schema)
      }

      if (effectiveId !== 'new') {
        try {
          const dataRes = await api.get(`/${effectiveSlug}/${effectiveId}`)
          setData(dataRes.data.data)

          if (!effectiveIsGlobal) {
            try {
              const versionsRes = await api.get(`/${effectiveSlug}/${effectiveId}/versions`)
              setVersions(versionsRes.data.data || [])
            } catch {
              setVersions([])
            }
          }
        } catch {
          console.error('Failed to fetch data')
          toast.error('Failed to load content data')
        }
      } else {
        setData({})
      }
    } catch {
      console.error('Failed to fetch schema')
      toast.error('Failed to load collection schema')
    } finally {
      setTimeout(() => setLoading(false), 300)
    }
  }, [getSlugFromPath, routeId, initialIsGlobal])

  useEffect(() => {
    fetchSchemaAndData()
  }, [fetchSchemaAndData])

  useEffect(() => {
    if (resolvedId === 'new' || isGlobal) return

    const sendHeartbeat = async () => {
      try {
        await api.post('/presence/heartbeat', {
          collection: resolvedSlug,
          documentId: resolvedId,
        })
      } catch (err) {
        console.error('Presence heartbeat failed', err)
        toast.error('Presence sync failed')
      }
    }

    const fetchPresence = async () => {
      try {
        const res = await api.get(`/presence/${resolvedSlug}/${resolvedId}`)
        setPresence(res.data.data)
      } catch (err) {
        console.error('Failed to fetch presence data', err)
        toast.error('Failed to fetch presence data')
      }
    }

    sendHeartbeat()
    fetchPresence()

    const heartbeatInterval = setInterval(sendHeartbeat, 10000)
    const fetchInterval = setInterval(fetchPresence, 10000)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(fetchInterval)
      api.delete(`/presence/${resolvedSlug}/${resolvedId}`).catch(() => {})
    }
  }, [resolvedSlug, resolvedId, isGlobal])

  const handleVersionClick = (version: VersionDoc) => {
    setSelectedVersion(version)
    setSelectedFieldsToRollback([])
  }

  const handleRestoreVersion = async () => {
    if (!selectedVersion) return
    setRestoring(true)
    try {
      const res = await api.post(
        `/versions/${resolvedSlug}/${resolvedId}/${selectedVersion._id}/restore`
      )
      toast.success('REVISION_RESTORED_SUCCESSFULLY')

      const restoredDoc = res.data.data?.document || selectedVersion.snapshot
      setData(restoredDoc)
      setSelectedVersion(null)

      const versionsRes = await api.get(`/${resolvedSlug}/${resolvedId}/versions`)
      setVersions(versionsRes.data.data || [])
    } catch (err) {
      toast.error('REVISION_RESTORATION_FAILED')
      console.error(err)
    } finally {
      setRestoring(false)
    }
  }

  const id = resolvedId

  const handleSave = async (formData: Record<string, unknown>) => {
    // 🔍 Pre-flight Validation check
    if (Object.keys(formData).length === 0 && id === 'new') {
      toast.error('EMPTY_MANIFEST_REJECTED')
      return
    }

    setSaving(true)
    try {
      const payload = { ...formData }
      if (id === 'new') {
        const res = await api.post(`/${resolvedSlug}`, payload)
        toast.success('DATA_NODE_INITIALIZED_OK')
        // Guided transition to active session
        setTimeout(() => {
          navigate(`/collections/${routeSlug}/${res.data.data._id}`)
        }, 500)
      } else {
        await api.patch(`/${resolvedSlug}/${id}`, payload)
        toast.success('PERSISTENCE_SYNC_SUCCESS')

        // Refresh local version archive
        if (!isGlobal) {
          const versionsRes = await api.get(`/${resolvedSlug}/${id}/versions`)
          setVersions(versionsRes.data.data || [])
        }
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'SYNCHRONIZATION_FAILURE'
      toast.error(errorMsg.toUpperCase())
      console.error('Persistence Error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div
        className={cn(
          'h-screen w-full flex flex-col items-center justify-center gap-6',
          theme === 'dark' ? 'bg-black' : 'bg-[#fafafa]'
        )}
      >
        <Loader2 size={32} className="animate-spin text-indigo-500" strokeWidth={1.5} />
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-400 animate-pulse italic">
          Synchronizing_Spatial_Record...
        </p>
      </div>
    )

  return (
    <div
      className={cn(
        'pt-2 px-8 pb-12 space-y-8 animate-fade-in min-h-screen transition-colors duration-500',
        theme === 'dark' ? 'bg-black text-white' : 'bg-[#fafafa] text-gray-900',
        isZenMode && 'p-0'
      )}
    >
      <AnimatePresence>
        {!isZenMode && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8"
          >
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate(-1)}
                className={cn(
                  'w-10 h-10 flex items-center justify-center border rounded-none transition-all shadow-sm',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'
                )}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col">
                <h1 className="text-7xl font-black tracking-tighter uppercase italic leading-[0.9] truncate max-w-3xl">
                  {id === 'new'
                    ? 'New_Record_Init'
                    : data?.name || data?.title || (config as { labels?: { singular?: string } } | null)?.labels?.singular || 'Manifest_Update'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {(() => {
                const hasBlocksField = fields.some((f) => f.type === 'blocks') || resolvedSlug?.includes('pages')
                if (!hasBlocksField) return null
                // Extract the first block/section ID for pre-selection when opening visual editor
                  const firstSectionId = (data as { sections?: { id?: string }[] } | null)?.sections?.[0]?.id
                  return (
                  <button
                    onClick={() => {
                      setFocusedSectionId(firstSectionId)
                      setShowVisualEditor(true)
                    }}
                    className={cn(
                      'px-6 py-4 rounded-none font-black text-[10px] uppercase tracking-widest transition-all italic leading-none flex items-center gap-3',
                      theme === 'dark'
                        ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20'
                        : 'bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100'
                    )}
                  >
                    <Eye size={16} />
                    <span>Visual Editor</span>
                  </button>
                )
              })()}
              <button
                onClick={() => setIsZenMode(true)}
                className={cn(
                  'p-4 border rounded-none transition-all shadow-sm',
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'
                )}
              >
                <Maximize2 size={18} />
              </button>
              <div className="flex items-center gap-2 p-1 border rounded-none bg-white/[0.02] border-white/5">
                <button
                  onClick={() => document.getElementById('record-form-submit')?.click()}
                  disabled={saving}
                  className={cn(
                    'px-6 py-4 rounded-none font-black text-[10px] uppercase tracking-widest transition-all italic leading-none flex items-center gap-3',
                    theme === 'dark'
                      ? 'bg-white/5 text-gray-400 hover:text-white'
                      : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'
                  )}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={() => {
                    // Logic to set status to published and save
                    const form = document.querySelector('form')
                    if (form) {
                      const statusInput = document.createElement('input')
                      statusInput.type = 'hidden'
                      statusInput.name = 'status'
                      statusInput.value = 'published'
                      form.appendChild(statusInput)
                      document.getElementById('record-form-submit')?.click()
                    }
                  }}
                  disabled={saving}
                  className={cn(
                    'px-8 py-4 rounded-none font-black text-[10px] uppercase tracking-widest shadow-xl transition-all italic leading-none flex items-center gap-3',
                    theme === 'dark'
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                  )}
                >
                  <Globe size={16} strokeWidth={3} />
                  <span>Publish</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowSchedulePicker(!showSchedulePicker)}
                    disabled={saving}
                    className={cn(
                      'px-4 py-4 rounded-none font-black text-[10px] uppercase tracking-widest transition-all italic leading-none flex items-center gap-3 border-l border-white/5',
                      theme === 'dark'
                        ? 'bg-white/5 text-gray-400 hover:text-amber-400'
                        : 'bg-white border-gray-100 text-gray-400 hover:text-amber-600'
                    )}
                    title="Schedule publish"
                  >
                    <Clock size={16} />
                  </button>
                  {showSchedulePicker && (
                    <div className={cn(
                      'absolute right-0 top-full mt-2 p-6 border shadow-2xl z-50 min-w-[320px]',
                      theme === 'dark' ? 'bg-[#080808] border-white/10' : 'bg-white border-gray-100'
                    )}>
                      <div className="space-y-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 italic">
                          Schedule Publication
                        </span>
                        <input
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className={cn(
                            'w-full border rounded-none py-3 px-4 text-xs font-mono italic outline-none',
                            theme === 'dark'
                              ? 'bg-black border-white/10 text-white focus:border-indigo-500'
                              : 'bg-gray-50 border-gray-200 text-black focus:border-indigo-500'
                          )}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setShowSchedulePicker(false); setScheduledDate('') }}
                            className="flex-1 py-3 text-[9px] font-black uppercase tracking-widest border rounded-none transition-all italic"
                          >
                            Clear
                          </button>
                          <button
                            onClick={async () => {
                              if (!scheduledDate) return
                              const form = document.querySelector('form')
                              if (form) {
                                const si = document.createElement('input')
                                si.type = 'hidden'; si.name = 'scheduledAt'; si.value = new Date(scheduledDate).toISOString()
                                const si2 = document.createElement('input')
                                si2.type = 'hidden'; si2.name = 'status'; si2.value = 'scheduled'
                                form.appendChild(si); form.appendChild(si2)
                                document.getElementById('record-form-submit')?.click()
                                setShowSchedulePicker(false)
                                toast.success(`Scheduled for ${new Date(scheduledDate).toLocaleString()}`)
                              }
                            }}
                            disabled={!scheduledDate}
                            className={cn(
                              'flex-1 py-3 text-[9px] font-black uppercase tracking-widest rounded-none transition-all italic',
                              theme === 'dark'
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-amber-500 text-white hover:bg-amber-600'
                            )}
                          >
                            Schedule
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {previewToken && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                      'px-4 py-4 rounded-none font-black text-[10px] uppercase tracking-widest transition-all italic leading-none flex items-center gap-3 border-l',
                      showPreview
                        ? theme === 'dark'
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-indigo-600 text-white border-indigo-500'
                        : theme === 'dark'
                          ? 'bg-white/5 text-gray-400 hover:text-indigo-400 border-white/5'
                          : 'bg-white border-gray-100 text-gray-400 hover:text-indigo-600'
                    )}
                    title="Toggle preview"
                  >
                    <Eye size={16} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPreview && previewToken && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              'border rounded-none overflow-hidden',
              theme === 'dark' ? 'border-white/10 bg-[#0a0a0a]' : 'border-gray-200 bg-white'
            )}
          >
            <div className={cn(
              'flex items-center justify-between px-6 py-3 border-b',
              theme === 'dark' ? 'border-white/10 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
            )}>
              <div className="flex items-center gap-3">
                <Eye size={14} className="text-indigo-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 italic">
                  Live Preview
                </span>
                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setPreviewLoading(true)
                    try {
                      const res = await api.post(`/${resolvedSlug}/${resolvedId}/preview-token`)
                      setPreviewToken(res.data.data?.token || null)
                    } catch { /* ignore */ }
                    setPreviewLoading(false)
                  }}
                  className={cn(
                    'p-2 rounded-none transition-all',
                    theme === 'dark' ? 'hover:bg-white/5 text-gray-500' : 'hover:bg-gray-100 text-gray-400'
                  )}
                  title="Refresh preview token"
                >
                  <RefreshCw size={12} className={previewLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className={cn(
                    'p-2 rounded-none transition-all',
                    theme === 'dark' ? 'hover:bg-white/5 text-gray-500' : 'hover:bg-gray-100 text-gray-400'
                  )}
                >
                  <Minimize2 size={12} />
                </button>
              </div>
            </div>
            <div className="relative" style={{ height: '600px' }}>
              <iframe
                src={`${import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:5173'}?preview=true&token=${previewToken}&collection=${resolvedSlug}&id=${resolvedId}`}
                className="w-full h-full border-0"
                title="Content Preview"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-16">
        {/* Edit Interface */}
        <div
          className={cn(
            'xl:col-span-3 space-y-16',
            isZenMode && 'xl:col-span-4 max-w-7xl mx-auto py-32 px-16'
          )}
        >
          <AnimatePresence>
            {isZenMode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'flex items-center justify-between mb-12 border-b pb-8',
                  theme === 'dark' ? 'border-white/5' : 'border-gray-100'
                )}
              >
                <button
                  onClick={() => setIsZenMode(false)}
                  className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-500 transition-colors italic"
                >
                  <Minimize2 size={16} /> Exit_Tactical_View
                </button>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">
                      Live_Session
                    </span>
                    <span className="text-xl font-black tracking-tighter italic leading-none">
                      ORCHESTRATOR_LOCKED
                    </span>
                  </div>
                  <button
                    onClick={() => document.getElementById('record-form-submit')?.click()}
                    className={cn(
                      'px-8 py-3 rounded-none font-black text-[10px] uppercase tracking-widest shadow-lg italic leading-none transition-all',
                      theme === 'dark'
                        ? 'bg-white text-black hover:bg-gray-200'
                        : 'bg-gray-900 text-white'
                    )}
                  >
                    Sync Node
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {fields.some((f: any) => f.localized) && (
            <div
              className={cn(
                'border rounded-none p-6 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors',
                theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-100'
              )}
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#8b5cf6]" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Localization_Engine
                  </span>
                </div>

                {!isTranslationMode ? (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400">Active Language:</span>
                      <select
                        value={activeLocale}
                        onChange={(e) => setActiveLocale(e.target.value)}
                        className={cn(
                          'bg-black border border-white/10 px-3 py-1.5 text-xs font-bold focus:border-purple-500 outline-none',
                          theme === 'dark' ? 'bg-black text-white border-white/10' : 'bg-gray-50 border-gray-200'
                        )}
                      >
                        {[
                          { code: 'en', label: 'English (US)' },
                          { code: 'es', label: 'Spanish (ES)' },
                          { code: 'fr', label: 'French (FR)' },
                          { code: 'de', label: 'German (DE)' },
                          { code: 'ja', label: 'Japanese (JP)' },
                        ].map((loc) => (
                          <option key={loc.code} value={loc.code}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* i18n Translation Progress */}
                    {activeLocale !== 'en' && data && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const localizedFields = fields.filter((f: any) => f.localized)
                          const i18nData = (data as { i18n?: Record<string, unknown> } | null)?.i18n?.[activeLocale] || {}
                          const translatedCount = localizedFields.filter(
                            (f: any) => i18nData[f.name] !== undefined && i18nData[f.name] !== null && i18nData[f.name] !== ''
                          ).length
                          const pct = localizedFields.length > 0
                            ? Math.round((translatedCount / localizedFields.length) * 100)
                            : 0
                          return (
                            <>
                              <div className="w-20 h-1.5 bg-white/5 border border-white/5 rounded-none overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full transition-all duration-500',
                                    pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-indigo-500' : 'bg-amber-500'
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={cn(
                                'text-[8px] font-black tracking-widest italic',
                                pct === 100 ? 'text-emerald-400' : 'text-gray-500'
                              )}>
                                {pct}%
                              </span>
                              <span className="text-[8px] text-gray-600 uppercase tracking-widest">
                                {translatedCount}/{localizedFields.length}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">Reference:</span>
                      <select
                        value={sourceLocale}
                        onChange={(e) => setSourceLocale(e.target.value)}
                        className={cn(
                          'bg-black border border-white/10 px-3 py-1.5 text-xs font-bold focus:border-purple-500 outline-none',
                          theme === 'dark' ? 'bg-black text-white border-white/10' : 'bg-gray-50 border-gray-200'
                        )}
                      >
                        {[
                          { code: 'en', label: 'English (US)' },
                          { code: 'es', label: 'Spanish (ES)' },
                          { code: 'fr', label: 'French (FR)' },
                          { code: 'de', label: 'German (DE)' },
                          { code: 'ja', label: 'Japanese (JP)' },
                        ].map((loc) => (
                          <option key={loc.code} value={loc.code}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-indigo-500 font-bold text-sm">→</div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">Target Translation:</span>
                      <select
                        value={targetLocale}
                        onChange={(e) => setTargetLocale(e.target.value)}
                        className={cn(
                          'bg-black border border-white/10 px-3 py-1.5 text-xs font-bold focus:border-purple-500 outline-none',
                          theme === 'dark' ? 'bg-black text-white border-white/10' : 'bg-gray-50 border-gray-200'
                        )}
                      >
                        {[
                          { code: 'en', label: 'English (US)' },
                          { code: 'es', label: 'Spanish (ES)' },
                          { code: 'fr', label: 'French (FR)' },
                          { code: 'de', label: 'German (DE)' },
                          { code: 'ja', label: 'Japanese (JP)' },
                        ].map((loc) => (
                          <option key={loc.code} value={loc.code} disabled={loc.code === sourceLocale}>
                            {loc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsTranslationMode(!isTranslationMode)}
                className={cn(
                  'px-4 py-2 font-black text-[9px] uppercase tracking-widest transition-all italic flex items-center gap-2 border rounded-none',
                  isTranslationMode
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700'
                    : theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'
                )}
              >
                <Globe size={12} />
                <span>{isTranslationMode ? 'Close Side-By-Side' : 'Translate Side-By-Side'}</span>
              </button>
            </div>
          )}

          <div className={cn("grid grid-cols-1 gap-8", (isTranslationMode && fields.some((f: any) => f.localized)) ? "lg:grid-cols-2" : "grid-cols-1")}>
            {isTranslationMode && fields.some((f: any) => f.localized) && (
              <div
                className={cn(
                  'border rounded-none p-10 shadow-sm relative overflow-hidden transition-colors',
                  theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-100'
                )}
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] italic">
                    Reference Source: {sourceLocale.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase text-gray-400 bg-white/5 border border-white/10 rounded">
                    Read Only
                  </span>
                </div>
                <FormBuilder
                  fields={fields}
                  initialData={data}
                  readOnlyLocale={sourceLocale}
                />
              </div>
            )}

            <div
              className={cn(
                'border rounded-none p-10 shadow-sm relative overflow-hidden transition-colors',
                theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-100'
              )}
            >
              <div className="absolute top-0 right-0 p-10 opacity-[0.01] pointer-events-none">
                <Terminal size={180} strokeWidth={0.5} />
              </div>
              {isTranslationMode && fields.some((f: any) => f.localized) && (
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">
                    Translation Target: {targetLocale.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded">
                    Writable
                  </span>
                </div>
              )}
              <FormBuilder
                fields={fields}
                initialData={data}
                onSubmit={handleSave}
                isSubmitting={saving}
                activeLocale={isTranslationMode && fields.some((f: any) => f.localized) ? targetLocale : activeLocale}
              />
              <button id="record-form-submit" type="submit" className="hidden" />
            </div>
          </div>
        </div>

        {/* Meta Orchestration Sidebar */}
        {!isZenMode && (
          <div className="space-y-8">
            {/* Record Intelligence */}
            <div
              className={cn(
                'border rounded-none p-8 shadow-sm space-y-8 relative overflow-hidden group',
                theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-100'
              )}
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <ShieldCheck size={100} strokeWidth={0.5} />
              </div>
              <div className="flex items-center gap-4 px-2">
                <div
                  className={cn(
                    'w-9 h-9 rounded-none flex items-center justify-center shadow-inner',
                    theme === 'dark' ? 'bg-white/5 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  )}
                >
                  <ShieldCheck size={18} />
                </div>
                <h3 className="text-xs font-black uppercase italic tracking-widest">
                  Metadata_Node
                </h3>
              </div>
              <div className="space-y-4">
                <div
                  className={cn(
                    'p-5 border rounded-none flex flex-col gap-1.5 shadow-inner transition-colors',
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/5'
                      : 'bg-gray-50 border-gray-100'
                  )}
                >
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic leading-none">
                    Kernel_ID
                  </span>
                  <span className="text-[10px] font-black uppercase italic truncate text-indigo-500">
                    #{id.toUpperCase()}
                  </span>
                </div>
                <div
                  className={cn(
                    'p-5 border rounded-none flex flex-col gap-1.5 shadow-inner transition-colors',
                    theme === 'dark'
                      ? 'bg-white/[0.02] border-white/5'
                      : 'bg-gray-50 border-gray-100'
                  )}
                >
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic leading-none">
                    Sync_Status
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-500 uppercase italic">
                      Operational
                    </span>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-none shadow-[0_0_8px_#10b981]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Temporal History */}
            <div
              className={cn(
                'border rounded-none p-8 shadow-sm space-y-8 relative overflow-hidden group',
                theme === 'dark' ? 'bg-[#080808] border-white/5' : 'bg-white border-gray-100'
              )}
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <History size={100} strokeWidth={0.5} />
              </div>
              <div className="flex items-center gap-4 px-2">
                <div
                  className={cn(
                    'w-9 h-9 rounded-none flex items-center justify-center shadow-inner',
                    theme === 'dark' ? 'bg-white/5 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                  )}
                >
                  <History size={18} />
                </div>
                <h3 className="text-xs font-black uppercase italic tracking-widest">
                  Version_Archive
                </h3>
              </div>
              <div className="space-y-3">
                {versions.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center gap-4">
                    <RefreshCw size={24} className="text-gray-500/20 animate-spin-slow" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] italic leading-relaxed">
                      No historical_manifests_detected
                    </span>
                  </div>
                ) : (
                  versions.map((v, i) => (
                    <div
                      key={v._id}
                      onClick={() => handleVersionClick(v)}
                      className={cn(
                        'p-4 border rounded-none transition-all cursor-pointer group flex items-center justify-between',
                        theme === 'dark'
                          ? 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30'
                          : 'bg-gray-50 border-gray-100 hover:border-indigo-100'
                      )}
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black uppercase italic leading-none">
                          Revision_Manifest_{versions.length - i}
                        </span>
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest italic">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <ArrowRight
                        size={12}
                        className="text-gray-500 group-hover:text-indigo-500 transition-colors"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedVersion && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 15 }}
              className={cn(
                'border rounded-none w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]',
                theme === 'dark'
                  ? 'bg-black border-white/5 text-white'
                  : 'bg-white border-gray-100 text-gray-900'
              )}
            >
              <div className="p-8 border-b border-gray-50 dark:border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 bg-indigo-600 rounded-none flex items-center justify-center text-white shadow-lg">
                    <History size={16} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-widest italic">
                      Preview_Historical_Manifest
                    </h3>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest italic mt-1">
                      {new Date(selectedVersion.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setVersionPreviewMode(!versionPreviewMode)}
                    className={cn(
                      'px-3 py-1.5 text-[8px] font-black uppercase tracking-widest italic border rounded-none transition-all',
                      versionPreviewMode
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                    )}
                  >
                    {versionPreviewMode ? 'JSON View' : 'Preview'}
                  </button>
                  <button
                    onClick={() => setSelectedVersion(null)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-none transition-colors"
                  >
                    <Minimize2 size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Review and compare revision values against the current draft.
                </p>
                <p className="text-[8px] font-bold uppercase text-amber-500 tracking-widest leading-relaxed">
                  {versionPreviewMode
                    ? 'Field values shown in preview mode. Switch to JSON view for raw data.'
                    : 'Check the fields you wish to selectively roll back. Unchecked fields will remain untouched.'}
                </p>

                <div className="space-y-4">
                  {fields.map((field) => {
                    const currentVal = data?.[field.name]
                    const revisionVal = selectedVersion.snapshot?.[field.name]
                    const isDifferent = JSON.stringify(currentVal) !== JSON.stringify(revisionVal)
                    const isChecked = selectedFieldsToRollback.includes(field.name)

                    const renderFieldValue = (val: any, side: 'current' | 'revision') => {
                      const colorClass = side === 'current' ? 'text-red-300 border-red-500/20 bg-red-500/5' : 'text-emerald-300 border-emerald-500/20 bg-emerald-500/5'
                      if (versionPreviewMode) {
                        if (field.type === 'media' || (field.type as string) === 'image') {
                          const url = typeof val === 'object' ? val?.url : val
                          return url ? (
                            <div className="p-2">
                              <img src={url} alt="" className="max-h-24 object-contain border border-white/10 rounded-none" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            </div>
                          ) : <span className="text-gray-500 italic">—</span>
                        }
                        if (field.type === 'richtext') {
                          return (
                            <div className="p-3 text-[11px] leading-relaxed [&>h1]:text-lg [&>h2]:text-base [&>h3]:text-sm [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4" dangerouslySetInnerHTML={{ __html: val || '—' }} />
                          )
                        }
                        if (field.type === 'boolean' || field.type === 'checkbox') {
                          return <span className={val ? 'text-emerald-400' : 'text-red-400'}>{val ? '✓ True' : '✗ False'}</span>
                        }
                        if (field.type === 'date') {
                          return <span>{val ? new Date(val).toLocaleString() : '—'}</span>
                        }
                        if (field.type === 'number') {
                          return <span className="text-[14px] font-black tabular-nums">{val ?? '—'}</span>
                        }
                        if (typeof val === 'string' && val.length > 0) {
                          return <span className="break-words">{val}</span>
                        }
                        if (val === null || val === undefined) {
                          return <span className="text-gray-500 italic">—</span>
                        }
                      }
                      // Default JSON view for both preview mode complex types and non-preview mode
                      return (
                        <pre className="whitespace-pre-wrap break-all text-[10px] font-mono leading-relaxed">
                          {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '—')}
                        </pre>
                      )
                    }

                    return (
                      <div
                        key={field.name}
                        className={cn(
                          "p-4 border rounded-none transition-colors",
                          isDifferent
                            ? theme === 'dark'
                              ? "bg-indigo-500/5 border-indigo-500/20"
                              : "bg-indigo-50/50 border-indigo-100"
                            : theme === 'dark'
                              ? "bg-white/[0.01] border-white/5 opacity-60"
                              : "bg-gray-50/50 border-gray-100 opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {isDifferent && !versionPreviewMode && (
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFieldsToRollback([...selectedFieldsToRollback, field.name])
                                  } else {
                                    setSelectedFieldsToRollback(selectedFieldsToRollback.filter(f => f !== field.name))
                                  }
                                }}
                                className="rounded-none border-white/10 text-indigo-600 focus:ring-0 focus:ring-offset-0 bg-black cursor-pointer w-4 h-4"
                              />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic">
                              {field.label || field.name}
                            </span>
                          </div>
                          {isDifferent ? (
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-none">
                              Changed
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                              Identical
                            </span>
                          )}
                        </div>

                        {isDifferent ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-mono">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-none space-y-1">
                              <span className="text-[7px] font-black uppercase tracking-wider text-red-400 block">Current:</span>
                              {renderFieldValue(currentVal, 'current')}
                            </div>
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-none space-y-1">
                              <span className="text-[7px] font-black uppercase tracking-wider text-emerald-400 block">Revision:</span>
                              {renderFieldValue(revisionVal, 'revision')}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 border border-white/5 rounded-none">
                            {renderFieldValue(revisionVal, 'revision')}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="p-8 border-t border-gray-50 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex justify-end gap-4">
                <button
                  onClick={() => setSelectedVersion(null)}
                  className={cn(
                    'px-6 py-3 font-black text-[9px] uppercase tracking-widest transition-all italic',
                    theme === 'dark'
                      ? 'bg-white/5 text-gray-400 hover:text-white'
                      : 'bg-white border border-gray-100 text-gray-400 hover:text-gray-900'
                  )}
                >
                  Cancel
                </button>
                {selectedFieldsToRollback.length > 0 && (
                  <button
                    onClick={async () => {
                      setRestoring(true)
                      try {
                        const res = await api.post(
                          `/versions/${resolvedSlug}/${resolvedId}/${selectedVersion._id}/rollback-fields`,
                          { fields: selectedFieldsToRollback }
                        )
                        toast.success('SELECTIVE_REVISION_RESTORED_SUCCESSFULLY')
                        const restoredDoc = res.data.data?.document || selectedVersion.snapshot
                        setData(restoredDoc)
                        setSelectedVersion(null)
                        setSelectedFieldsToRollback([])

                        const versionsRes = await api.get(`/${resolvedSlug}/${resolvedId}/versions`)
                        setVersions(versionsRes.data.data || [])
                      } catch (err) {
                        toast.error('SELECTIVE_REVISION_RESTORATION_FAILED')
                        console.error(err)
                      } finally {
                        setRestoring(false)
                      }
                    }}
                    disabled={restoring}
                    className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-none text-[9px] font-black uppercase tracking-widest shadow-xl shadow-amber-600/20 hover:brightness-110 transition-all italic flex items-center gap-2"
                  >
                    {restoring ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RefreshCw size={12} />
                    )}
                    Rollback Selected Fields ({selectedFieldsToRollback.length})
                  </button>
                )}
                <button
                  onClick={handleRestoreVersion}
                  disabled={restoring}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:brightness-110 transition-all italic flex items-center gap-2"
                >
                  {restoring ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <RefreshCw size={12} />
                  )}
                  Restore Full Revision
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {showVisualEditor && (
        <div className="fixed inset-0 z-[1000] bg-black">
          <SpatialEditor
            id={isGlobal ? (resolvedSlug.split('/').pop() || '') : resolvedId}
            isGlobal={isGlobal}
            focusedSectionId={focusedSectionId}
            onClose={() => {
              if (isPagesPath) {
                navigate(-1)
              } else {
                setShowVisualEditor(false)
                fetchSchemaAndData()
              }
            }}
          />
        </div>
      )}
    </div>
  )
}

export default CollectionDetail
