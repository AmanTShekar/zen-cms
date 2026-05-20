import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import api from '../lib/api'
import FormBuilder from '../components/FormBuilder'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'

const CollectionDetail: React.FC<{ isGlobal?: boolean }> = ({ isGlobal: initialIsGlobal }) => {
  const { slug: routeSlug, id: routeId } = useParams<{ slug: string; id: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [data, setData] = useState<any>(null)
  const [fields, setFields] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isZenMode, setIsZenMode] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [isGlobal, setIsGlobal] = useState(initialIsGlobal)
  const [resolvedSlug, setResolvedSlug] = useState(routeSlug)
  const [resolvedId, setResolvedId] = useState(routeId?.split(':')[0] || 'singleton')

  const [activeLocale, setActiveLocale] = useState('en')
  const [isTranslationMode, setIsTranslationMode] = useState(false)
  const [sourceLocale, setSourceLocale] = useState('en')
  const [targetLocale, setTargetLocale] = useState('es')

  const [presence, setPresence] = useState<{
    isLocked: boolean
    activeUsers: any[]
    message: string | null
  }>({
    isLocked: false,
    activeUsers: [],
    message: null,
  })
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [selectedFieldsToRollback, setSelectedFieldsToRollback] = useState<string[]>([])

  useEffect(() => {
    const fetchSchemaAndData = async () => {
      setLoading(true)
      try {
        const healthRes = await api.get('/health')
        const collections = healthRes.data.data?.collections || []
        const globals = healthRes.data.data?.globals || []

        const globalMatch = globals.find((g: Record<string, unknown>) => g.slug === routeSlug)
        const collectionMatch = collections.find(
          (c: Record<string, unknown>) => c.slug === routeSlug
        )

        const effectiveIsGlobal = !!globalMatch || initialIsGlobal
        const effectiveSlug = effectiveIsGlobal ? `globals/${routeSlug}` : routeSlug
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
          }
        } else {
          setData({})
        }
      } catch {
        console.error('Failed to fetch schema')
      } finally {
        setTimeout(() => setLoading(false), 300)
      }
    }

    fetchSchemaAndData()
  }, [routeSlug, routeId, initialIsGlobal])

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
      }
    }

    const fetchPresence = async () => {
      try {
        const res = await api.get(`/presence/${resolvedSlug}/${resolvedId}`)
        setPresence(res.data.data)
      } catch (err) {
        console.error('Failed to fetch presence data', err)
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

  const handleVersionClick = (version: any) => {
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
        'p-12 space-y-14 animate-fade-in min-h-screen transition-colors duration-500',
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
                <div className="flex flex-wrap items-center gap-4 mb-3">
                  <span className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] italic">
                    Record_Entry_Module
                  </span>
                  {presence.activeUsers.length > 0 && (
                    <div className="flex items-center -space-x-1.5 ml-4">
                      {presence.activeUsers.map((user, i) => {
                        const initials = user.email ? user.email.slice(0, 2).toUpperCase() : '??'
                        return (
                          <div
                            key={user.id || i}
                            title={user.email}
                            className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black border-2 border-black shadow-[0_0_8px_rgba(79,70,229,0.3)] relative group cursor-help"
                          >
                            {initials}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-gray-950 border border-white/10 text-white text-[8px] font-black uppercase tracking-widest rounded-none shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[60]">
                              {user.email}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="w-2.5 h-2.5 rounded-none bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest italic">
                    {id === 'new' ? 'Initialize_Protocol_V6' : 'Active_Session_Established'}
                  </span>
                </div>
                <h1 className="text-7xl font-black tracking-tighter uppercase italic leading-[0.9] truncate max-w-3xl">
                  {id === 'new'
                    ? 'New_Record_Init'
                    : data?.name || data?.title || config?.labels?.singular || 'Manifest_Update'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
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
              </div>
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
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400">Active Language:</span>
                    <select
                      value={activeLocale}
                      onChange={(e) => setActiveLocale(e.target.value)}
                      className={cn(
                        'bg-app-subtle border border-border px-3 py-1.5 text-xs font-bold focus:border-accent outline-none',
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
                ) : (
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">Reference:</span>
                      <select
                        value={sourceLocale}
                        onChange={(e) => setSourceLocale(e.target.value)}
                        className={cn(
                          'bg-app-subtle border border-border px-3 py-1.5 text-xs font-bold focus:border-accent outline-none',
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
                          'bg-app-subtle border border-border px-3 py-1.5 text-xs font-bold focus:border-accent outline-none',
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
                <button
                  onClick={() => setSelectedVersion(null)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-none transition-colors"
                >
                  <Minimize2 size={14} className="text-gray-400" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Review and compare revision values against the current draft.
                  </p>
                  <p className="text-[8px] font-bold uppercase text-amber-500 tracking-widest leading-relaxed">
                    Check the fields you wish to selectively roll back. Unchecked fields will remain untouched.
                  </p>
                </div>

                <div className="space-y-4">
                  {fields.map((field) => {
                    const currentVal = data?.[field.name]
                    const revisionVal = selectedVersion.snapshot?.[field.name]
                    const isDifferent = JSON.stringify(currentVal) !== JSON.stringify(revisionVal)
                    const isChecked = selectedFieldsToRollback.includes(field.name)

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
                            {isDifferent && (
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
                              <span className="text-[7px] font-black uppercase tracking-wider text-red-400 block">Current Draft Value:</span>
                              <pre className="whitespace-pre-wrap break-all text-red-300">
                                {typeof currentVal === 'object' ? JSON.stringify(currentVal, null, 2) : String(currentVal ?? '—')}
                              </pre>
                            </div>
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-none space-y-1">
                              <span className="text-[7px] font-black uppercase tracking-wider text-emerald-400 block">Revision Value:</span>
                              <pre className="whitespace-pre-wrap break-all text-emerald-300">
                                {typeof revisionVal === 'object' ? JSON.stringify(revisionVal, null, 2) : String(revisionVal ?? '—')}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest block pl-7">
                            Value: {typeof revisionVal === 'object' ? '[Object]' : String(revisionVal ?? '—')}
                          </span>
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
    </div>
  )
}

export default CollectionDetail
