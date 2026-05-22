import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Reorder } from 'framer-motion'
import {
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Cpu,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import api from '../lib/api'
import toast from 'react-hot-toast'

// Import new modular components from ./editor/components/
import { LeftPanel } from './editor/components/LeftPanel'
import { RightPanel } from './editor/components/RightPanel'
import { SectionBlock } from './editor/components/SectionBlock'
import { BlockPickerModal as BlockPicker } from './editor/components/BlockPickerModal'
import { SEOModal as SeoModal } from './editor/components/SEOModal'
import { TemplatesModal } from './editor/components/TemplatesModal'
import { RelationsModal } from './editor/components/RelationsModal'
import { MediaLibraryModal as MediaLibrary } from './editor/components/MediaLibraryModal'
import { DynamicZoneModal as DynamicZoneEditor } from './editor/components/DynamicZoneModal'
import { SchemaFieldRenderer } from './editor/components/SchemaFieldRenderer'
import { EditorToolbar } from './editor/EditorToolbar'
import { BLOCK_LIBRARY, type Section, type PageData, detectFieldType, humanize } from './editor/constants'
import { cn } from '../lib/utils'

// Stores & Hooks
import { useEditorStore } from '../store/editorStore'
import { usePanelStore } from '../store/panelStore'
import { useWorkflowStore } from '../store/workflowStore'
import { useI18nStore } from '../store/i18nStore'
import { usePreviewSync } from '../hooks/usePreviewSync'
import { useUnsavedGuard } from '../hooks/useUnsavedGuard'
import { useValidation } from '../hooks/useValidation'

// Main Component
const SpatialEditor: React.FC<{ isGlobal?: boolean }> = ({ isGlobal }) => {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
  const nodeCounter = useRef(0)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Zustand stores
  const {
    data: dataRaw,
    setData: editorSetData,
    setLoading: editorSetLoading,
    setSaving: editorSetSaving,
    setHasUnsavedChanges: editorSetHasUnsavedChanges,
    updateData: editorUpdateData,
    undo,
    redo,
    activeSection: editorActiveSection,
    selectedField: editorSelectedField,
    schemaFields: editorSchemaFields,
    fieldSettings: editorFieldSettings,
    fieldErrors: editorFieldErrors,
    setHistory,
    setSelectedField,
    setSchemaFields,
    setFieldSettings,
    setFieldErrors: setStoreFieldErrors,
    setRelationsField,
    setRelationsSearch,
    setRelationResults,
    setSelectedRelations,
    setAvailableCollections,
    setActiveSection: editorSetActiveSection,
    setBlockPickerOpen,
    setRelationsModalOpen
  } = useEditorStore()
  const { viewMode, templatesOpen, setTemplatesOpen, setSeoOpen, showFieldIndicators } = usePanelStore()
  const { workflowStatus, setWorkflowStatus, publishStatus, setPublishStatus, workflowReviewers, setWorkflowReviewers, workflowComments, setWorkflowComments, scheduledAt, setScheduledAt, setReleases, setActiveRelease } = useWorkflowStore()
  const { i18nEnabled, currentLocale, translations, setTranslations, updateTranslation: i18nUpdateTranslation } = useI18nStore()

  const loading = useEditorStore((s) => s.loading)
  const saving = useEditorStore((s) => s.saving)
  const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges)

  const data = dataRaw as PageData | null
  // const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL as string | undefined

  // ── Local UI state ──────────────────────────────────────────────────────────
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null)
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set())
  const [dynamicZoneModalOpen, setDynamicZoneModalOpen] = useState(false)
  const [activeDynamicZone, setActiveDynamicZone] = useState<{ sectionId: string; fieldKey: string } | null>(null)
  // const [blockSearch, setBlockSearch] = useState('')
  const [newComment, setNewComment] = useState('')
  // const [templatesLoading, setTemplatesLoading] = useState(false)
  const [injectionIndex, setInjectionIndex] = useState<number | null>(null)

  // Hooks
  usePreviewSync(iframeRef, data, 300)
  useUnsavedGuard({ hasUnsavedChanges })
  const validate = useValidation(BLOCK_LIBRARY.map((b) => ({ slug: b.type, label: b.title, fields: b.fields || [], defaultContent: b.defaultContent })))

  // i18n helpers
  const getTranslatedValue = (sectionId: string, fieldKey: string, defaultValue: string): string => {
    if (!i18nEnabled || currentLocale === 'en') return defaultValue
    return translations[`${sectionId}:${fieldKey}`]?.[currentLocale] || defaultValue
  }
  const setTranslatedValue = (sectionId: string, fieldKey: string, value: string) => {
    i18nUpdateTranslation(`${sectionId}:${fieldKey}`, currentLocale, value)
    editorSetHasUnsavedChanges(true)
  }

  // Resize handlers
  const startResizing = useCallback((side: 'left' | 'right') => () => setResizingSide(side), [])
  const stopResizing = useCallback(() => setResizingSide(null), [])
  const resize = useCallback((e: MouseEvent) => {
    if (resizingSide === 'left') { const w = e.clientX; if (w >= 200 && w <= 500) usePanelStore.getState().setLeftWidth(w) }
    else if (resizingSide === 'right') { const w = window.innerWidth - e.clientX; if (w >= 200 && w <= 700) usePanelStore.getState().setRightWidth(w) }
  }, [resizingSide])

  useEffect(() => {
    if (resizingSide) { window.addEventListener('mousemove', resize); window.addEventListener('mouseup', stopResizing) }
    return () => { window.removeEventListener('mousemove', resize); window.removeEventListener('mouseup', stopResizing) }
  }, [resizingSide, resize, stopResizing])

  // Preview sync effects
  useEffect(() => { if (iframeRef.current?.contentWindow) iframeRef.current.contentWindow.postMessage({ type: 'SET_THEME', theme }, '*') }, [theme])
  useEffect(() => { if (iframeRef.current?.contentWindow && editorActiveSection) iframeRef.current.contentWindow.postMessage({ type: 'ZENITH_PARENT_SELECT', sectionId: editorActiveSection }, '*') }, [editorActiveSection])

  // Task 04: iframe message handler — versioned protocol with type guard + cleanup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our storefront origin (or '*' in dev)
      const expectedOrigin = import.meta.env.VITE_STOREFRONT_URL || window.location.origin
      if (expectedOrigin !== '*' && event.origin !== expectedOrigin && event.origin !== window.location.origin) return
      // Versioned protocol guard
      if (event.data?.version !== 1) return
      switch (event.data?.type) {
        case 'ZENITH_SECTION_SELECT': {
          const sectionId = event.data.sectionId
          if (sectionId) { editorSetActiveSection(sectionId); setSelectedSections(new Set([sectionId])) }
          break
        }
        default:
          // Silently ignore unknown message types
          break
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [editorSetActiveSection])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.key === 's') { e.preventDefault(); handleSave(); return }
      if (isMeta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return }
      if (isMeta && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) { e.preventDefault(); handleRedo(); return }
      if (isMeta && e.key === 'd' && editorActiveSection && editorActiveSection !== 'root') { e.preventDefault(); duplicateSection(editorActiveSection); return }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedSections.size > 0) { e.preventDefault(); selectedSections.forEach((sectionId) => removeSection(sectionId)); setSelectedSections(new Set()); return }
      if (e.key === 'Escape') { setSelectedSections(new Set()); editorSetActiveSection(null); setBlockPickerOpen(false); setSeoOpen(false); setTemplatesOpen(false); return }
      if (e.key === '/' && !e.target && (e.target as HTMLElement).tagName !== 'INPUT') { setBlockPickerOpen(true) }
      if (isMeta && e.key === 'p') { e.preventDefault(); const p = usePanelStore.getState(); p.setRightOpen(!p.rightOpen); return }
      if (isMeta && e.key === '\\') { e.preventDefault(); const p = usePanelStore.getState(); p.setLeftOpen(!p.leftOpen); return }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editorActiveSection, selectedSections])

  // Task 03: Auto-save with ref-based state capture to avoid stale closures
  // Store latest state in refs so the timeout callback always reads fresh values
  const autoSaveStateRef = useRef<{ data: PageData | null; publishStatus: string; workflowStatus: string; workflowReviewers: any[]; workflowComments: any[]; scheduledAt: string; translations: any; fieldSettings: Record<string, any> }>({
    data: null, publishStatus: 'draft', workflowStatus: 'draft', workflowReviewers: [], workflowComments: [], scheduledAt: '', translations: {}, fieldSettings: {},
  })
  // Keep refs in sync with latest state
  useEffect(() => {
    autoSaveStateRef.current = {
      data, publishStatus, workflowStatus, workflowReviewers, workflowComments, scheduledAt, translations, fieldSettings: editorFieldSettings,
    }
  }, [data, publishStatus, workflowStatus, workflowReviewers, workflowComments, scheduledAt, translations, editorFieldSettings])

  useEffect(() => {
    if (!hasUnsavedChanges || saving) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      // Read from refs at fire time — always fresh
      const s = autoSaveStateRef.current
      if (!s.data) return
      // Build a handleSave-equivalent inline to avoid stale closure
      ;(async () => {
        if (!s.data) return
        const errors = validate(s.data)
        if (errors.length > 0) {
          const errorMap: Record<string, string> = {}
          errors.forEach(e => {
            const key = `${e.sectionId}:${e.fieldName}`
            errorMap[key] = e.message
          })
          setStoreFieldErrors(errorMap)
          toast.error(`${errors.length} validation error(s) found. Please fix the errors.`)
          return
        }
        // Clear errors
        setStoreFieldErrors({})
        editorSetSaving(true)
        try {
          const payload = { ...s.data, _status: s.publishStatus, workflowStatus: s.workflowStatus, reviewers: s.workflowReviewers, comments: s.workflowComments, scheduledAt: s.scheduledAt || undefined, publishedAt: s.publishStatus === 'published' ? (s.data.publishedAt || new Date().toISOString()) : null, i18n: s.translations, _fieldSettings: s.fieldSettings }
          if (isGlobal) await api.patch(`/globals/landing-page`, payload)
          else await api.patch(`/pages/${id}`, payload)
          editorSetHasUnsavedChanges(false)
          toast.success(s.publishStatus === 'published' ? '🚀 Published!' : '💾 Saved as Draft', {})
        } catch { toast.error('Failed to save changes') } finally { editorSetSaving(false) }
      })()
    }, 30000)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [data, hasUnsavedChanges, saving, isGlobal, id, validate])

  // Load templates
  useEffect(() => {
    if (!templatesOpen) return
    // setTemplatesLoading(true)
    api.get('/templates').then((res) => useEditorStore.getState().setTemplates(res.data.data || [])).catch(() => { /* ignore */ })// .finally(() => setTemplatesLoading(false))
  }, [templatesOpen])

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      editorSetLoading(true)
      try {
        const res = isGlobal ? await api.get(`/globals/landing-page`) : await api.get(`/pages/${id}`)
        const normalizedSections = (res.data.data.sections || []).map((s: any) => ({ ...s, id: s.id || `node_${nodeCounter.current++}`, content: s.content || s.blockData || {} }))
        editorSetData({ ...res.data.data, sections: normalizedSections })
        if (normalizedSections.length > 0) editorSetActiveSection('root')

        const collection = isGlobal ? 'globals' : 'pages'
        const docId = isGlobal ? 'landing-page' : id
        const historyRes = await api.get(`/versions/${collection}/${docId}`)
        setHistory(historyRes.data.data || [])

        setPublishStatus(res.data.data._status || res.data.data.status || 'draft')
        setWorkflowStatus(res.data.data.workflowStatus || 'draft')
        setWorkflowReviewers(res.data.data.reviewers || [])
        setWorkflowComments(res.data.data.comments || [])
        setScheduledAt(res.data.data.scheduledAt || '')
        setTranslations(res.data.data.i18n || {})

        try { const releasesRes = await api.get('/releases'); setReleases(releasesRes.data.data || []); setActiveRelease(releasesRes.data.data?.find((r: any) => r.status === 'pending') || null) } catch { /* ignore */ }
        try { const colsRes = await api.get('/system/health'); setAvailableCollections(colsRes?.data?.data?.registry?.collections || []) } catch { /* ignore */ }

        // Initialize field settings
        const settings: Record<string, any> = {}
        normalizedSections.forEach((s: any) => {
          Object.keys(s.content || {}).forEach((key) => {
            const settingKey = `${s.id}:${key}`
            settings[settingKey] = { required: false, unique: false, maxLength: null, minLength: null, private: false, relation: null, ...res.data.data._fieldSettings?.[settingKey] }
          })
        })
        setFieldSettings(settings)

        // Initialize schema fields
        const schema: any[] = []
        normalizedSections.forEach((s: any) => {
          Object.keys(s.content || {}).forEach((key) => {
            schema.push({ id: `${s.id}:${key}`, name: key, blockId: s.id, blockType: s.blockType, type: detectFieldType(key, s.content[key]), label: humanize(key), required: false, unique: false, sortable: true, filterable: true, private: false })
          })
        })
        setSchemaFields(schema)
      } catch { toast.error('Failed to sync editor') } finally { setTimeout(() => editorSetLoading(false), 500) }
    }
    fetchData()
  }, [id, isGlobal])

  // ── Action handlers ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!data) return
    const errors = validate(data)
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {}
      errors.forEach(e => {
        const key = `${e.sectionId}:${e.fieldName}`
        errorMap[key] = e.message
      })
      setStoreFieldErrors(errorMap)
      toast.error(`${errors.length} validation error(s) found. Please fix the errors before saving.`)
      return
    }
    // Clear field errors if none
    setStoreFieldErrors({})
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    editorSetSaving(true)
    try {
      const payload = { ...data, _status: publishStatus, workflowStatus, reviewers: workflowReviewers, comments: workflowComments, scheduledAt: scheduledAt || undefined, publishedAt: publishStatus === 'published' ? (data.publishedAt || new Date().toISOString()) : null, i18n: translations, _fieldSettings: editorFieldSettings }
      if (isGlobal) await api.patch(`/globals/landing-page`, payload)
      else await api.patch(`/pages/${id}`, payload)
      editorSetHasUnsavedChanges(false)
      toast.success(publishStatus === 'published' ? '🚀 Published!' : '💾 Saved as Draft', {})
    } catch { toast.error('Failed to save changes') } finally { editorSetSaving(false) }
  }

  const handleUndo = () => { undo(); toast.success('Undone', { icon: '↩️' }) }
  const handleRedo = () => { redo(); toast.success('Redone', { icon: '↪️' }) }

  const handlePublish = async () => { setPublishStatus('published'); await handleSave() }
  const handleUnpublish = async () => { setPublishStatus('draft'); toast.success('Unpublished - now visible only to editors') }

  // Section operations
  const addBlock = (blockType: string) => {
    const block = BLOCK_LIBRARY.find((b) => b.type === blockType)
    if (!block) return
    const newSection: Section = { id: `block_${nodeCounter.current++}`, blockType: block.type, title: block.title, content: { ...block.defaultContent } }
    editorUpdateData((prev) => {
      const sections = prev?.sections || []
      const newSections = [...sections]
      if (injectionIndex !== null) {
        newSections.splice(injectionIndex, 0, newSection)
      } else {
        newSections.push(newSection)
      }
      return { ...prev, sections: newSections }
    })
    editorSetActiveSection(newSection.id)
    setBlockPickerOpen(false)
    setInjectionIndex(null)
    toast.success(`Section added: ${blockType.toUpperCase()}`, { icon: '⚡' })
  }

  const duplicateSection = (sectionId: string) => {
    if (!data) return
    const sectionToDuplicate = data.sections.find((s) => s.id === sectionId)
    if (!sectionToDuplicate) return
    const duplicatedSection: Section = { ...sectionToDuplicate, id: `block_${nodeCounter.current++}`, title: `${sectionToDuplicate.title} (Copy)`, content: JSON.parse(JSON.stringify(sectionToDuplicate.content)) }
    editorUpdateData((prev) => { const idx = prev.sections.findIndex((s) => s.id === sectionId); const newSections = [...prev.sections]; newSections.splice(idx + 1, 0, duplicatedSection); return { ...prev, sections: newSections } })
    editorSetActiveSection(duplicatedSection.id)
    toast.success('Section duplicated', { icon: '📋' })
  }

  const removeSection = (id: string) => {
    editorUpdateData((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== id) }))
    if (editorActiveSection === id) editorSetActiveSection(null)
    if (selectedSections.has(id)) { const newSelected = new Set(selectedSections); newSelected.delete(id); setSelectedSections(newSelected) }
    toast.error('Section removed')
  }

  const updateAlign = (sectionId: string, align: 'left' | 'center' | 'right') => {
    editorUpdateData((prev) => { const newSections = [...prev.sections]; const idx = newSections.findIndex((s) => s.id === sectionId); if (idx !== -1) newSections[idx].align = align; return { ...prev, sections: newSections } })
  }

  const handleReorder = (newSections: Section[]) => editorUpdateData((prev) => ({ ...prev, sections: newSections }))

  const handleFieldChange = (sectionId: string, key: string, value: any) => {
    editorUpdateData((prev) => { const newSections = [...prev.sections]; const sIdx = newSections.findIndex((s) => s.id === sectionId); if (sIdx !== -1) newSections[sIdx].content[key] = value; return { ...prev, sections: newSections } })
    const nextErrors = { ...editorFieldErrors }
    delete nextErrors[`${sectionId}:${key}`]
    setStoreFieldErrors(nextErrors)
  }

  // Template operations
  const saveAsTemplate = async (sectionIds: string[]) => {
    const templateSections = data?.sections.filter((s) => sectionIds.includes(s.id)) || []
    if (templateSections.length === 0) return
    try { await api.post('/templates', { name: `Template ${new Date().toLocaleTimeString()}`, content: { sections: templateSections } }); setTemplatesOpen(false); toast.success('Template saved to server!', { icon: '📦' }) } catch { toast.error('Failed to save template') }
  }

  const applyTemplate = async (template: any) => {
    editorUpdateData((prev) => ({ ...prev, sections: [...(prev.sections || []), ...(template.sections || []).map((s: Section) => ({ ...s, id: `block_${nodeCounter.current++}` }))] }))
    setTemplatesOpen(false)
    toast.success(`${template.name} applied!`, { icon: '✨' })
  }

  const deleteTemplate = async (templateId: string) => {
    try { await api.delete(`/templates/${templateId}`); toast.success('Template deleted') } catch { toast.error('Failed to delete template') }
  }

  // Release operations
  // const createRelease = async (name: string) => {
  //   try { const res = await api.post('/releases', { name, status: 'pending' }); setReleases([...releases, res.data.data]); setActiveRelease(res.data.data); toast.success(`Release bundle "${name}" created`) } catch { toast.error('Failed to create release bundle') }
  // }

  // const publishRelease = async () => {
  //   if (!activeRelease) return
  //   try { await api.post(`/releases/${activeRelease.id}/publish`); toast.success('🚀 Release published!'); setReleases(releases.map((r) => (r.id === activeRelease.id ? { ...r, status: 'published' } : r))); setActiveRelease(null) } catch { toast.error('Failed to publish release') }
  // }

  // const addToRelease = async () => {
  //   if (!activeRelease) return
  //   try { await api.post(`/releases/${activeRelease.id}/add`, { documentId: id, collection: isGlobal ? 'globals' : 'pages' }); toast.success('Document added to release') } catch { toast.error('Failed to add to release') }
  // }

  // Version restore
  const handleRestore = async (versionId: string) => {
    const collection = isGlobal ? 'globals' : 'pages'
    const docId = isGlobal ? 'landing-page' : id
    editorSetSaving(true)
    try { const res = await api.post(`/versions/${collection}/${docId}/${versionId}/restore`); editorUpdateData(() => res.data.data.document); toast.success('Version restored') } catch { toast.error('Restore failed') } finally { editorSetSaving(false) }
  }

  // Workflow operations
  // const submitForReview = async () => { setWorkflowStatus('in_review'); editorSetHasUnsavedChanges(true); toast.success('Submitted for review', { icon: '👀' }) }
  // const approveChanges = async () => { setWorkflowStatus('published'); setPublishStatus('published'); editorSetHasUnsavedChanges(true); toast.success('Changes approved & published', { icon: '✅' }) }
  // const requestChanges = async () => { setWorkflowStatus('changes_requested'); editorSetHasUnsavedChanges(true); toast.success('Changes requested', { icon: '🔄' }) }
  // const addWorkflowComment = async () => {
  //   if (!newComment.trim()) return
  //   setWorkflowComments([...workflowComments, { id: `comment_${Date.now()}`, text: newComment, author: 'current_user', createdAt: new Date().toISOString(), type: 'comment' }])
  //   setNewComment('')
  //   editorSetHasUnsavedChanges(true)
  // }
  // const schedulePublish = async (date: string) => { setScheduledAt(date); setWorkflowStatus('scheduled'); editorSetHasUnsavedChanges(true); toast.success(`Scheduled for ${new Date(date).toLocaleString()}`) }

  // Meta handlers
  // const handleMetaChange = (field: string, value: string) => editorUpdateData((prev) => ({ ...prev, meta: { ...(prev.meta || {}), [field]: value } }))

  // Task 02: Store relation field metadata for schema-aware picker
  // const [relationFieldMeta, setRelationFieldMeta] = useState<{ relationTo?: string | string[]; hasMany?: boolean } | null>(null)

  // Relations — schema-aware: accepts optional relationTo/hasMany from field config
  const openRelationsModal = (sectionId: string, fieldKey: string, extra?: { relationTo?: string | string[]; hasMany?: boolean }) => {
    setRelationsField({ sectionId, fieldKey })
    setRelationsSearch('')
    setRelationResults([])
    setSelectedRelations(new Set())
    // setRelationFieldMeta(extra || null)
    setRelationsModalOpen(true)
    // Pre-fetch from target collection if relationTo is known
    if (extra?.relationTo && typeof extra.relationTo === 'string') {
      fetchRelationResults(extra.relationTo)
    } else if (extra?.relationTo && Array.isArray(extra.relationTo) && extra.relationTo.length === 1) {
      fetchRelationResults(extra.relationTo[0])
    }
  }

  // Task 02: getFieldConfig helper for schema-aware field rendering
  const getFieldConfig = useCallback((sectionId: string, fieldKey: string) => {
    const section = data?.sections?.find((s) => s.id === sectionId)
    if (!section) return null
    // Look up the field schema from BLOCK_LIBRARY
    const blockDef = BLOCK_LIBRARY.find((b) => b.type === section.blockType)
    if (!blockDef) return null
    // For now, return a basic config with type detection
    const val = section.content[fieldKey]
    const type = detectFieldType(fieldKey, val)
    const config: any = { name: fieldKey, type }
    // Attach relations metadata from editorFieldSettings if configured
    const settingKey = `${sectionId}:${fieldKey}`
    const settings = editorFieldSettings[settingKey]
    if (settings?.relation) config.relationTo = settings.relation
    if (settings?.hasMany !== undefined) config.hasMany = settings.hasMore
    return config
  }, [data?.sections, editorFieldSettings])
  const fetchRelationResults = async (collection: string, search?: string) => { try { const params: any = { limit: 20 }; if (search) params.search = search; const res = await api.get(`/${collection}`, { params }); setRelationResults(res.data.data || []) } catch { /* ignore */ } }
  // const toggleRelation = (itemId: string) => { const next = new Set(selectedRelations); if (next.has(itemId)) next.delete(itemId); else next.add(itemId); setSelectedRelations(next) }
  // const applyRelations = () => {
  //   if (!relationsField) return
  //   editorUpdateData((prev) => { const newSections = [...prev.sections]; const sIdx = newSections.findIndex((s) => s.id === relationsField.sectionId); if (sIdx !== -1) newSections[sIdx].content[relationsField.fieldKey] = Array.from(selectedRelations); return { ...prev, sections: newSections } })
  //   setRelationsModalOpen(false)
  //   toast.success(`${selectedRelations.size} items linked`)
  // }

  // Dynamic Zone
  const addToDynamicZone = (componentType: string) => {
    if (!activeDynamicZone) return
    const component = BLOCK_LIBRARY.find((b) => b.type === componentType)
    if (!component) return
    editorUpdateData((prev) => {
      const newSections = [...prev.sections]
      const sIdx = newSections.findIndex((s) => s.id === activeDynamicZone.sectionId)
      if (sIdx !== -1) {
        const zone = (newSections[sIdx].content[activeDynamicZone.fieldKey] as any[]) || []
        newSections[sIdx].content[activeDynamicZone.fieldKey] = [...zone, { __component: `content.${componentType}`, ...component.defaultContent, id: `dz_${Date.now()}` }]
      }
      return { ...prev, sections: newSections }
    })
    toast.success(`${component.title} added to zone`)
  }

  const removeFromDynamicZone = (index: number) => {
    if (!activeDynamicZone) return
    editorUpdateData((prev) => {
      const newSections = [...prev.sections]
      const sIdx = newSections.findIndex((s) => s.id === activeDynamicZone.sectionId)
      if (sIdx !== -1) { const zone = [...((newSections[sIdx].content[activeDynamicZone.fieldKey] as any[]) || [])]; zone.splice(index, 1); newSections[sIdx].content[activeDynamicZone.fieldKey] = zone }
      return { ...prev, sections: newSections }
    })
  }

  // Schema field change
  // const handleSchemaFieldChange = (fieldId: string, key: string, value: any) => {
  //   setSchemaFields(editorSchemaFields.map((f) => (f.id === fieldId ? { ...f, [key]: value } : f)))
  //   setFieldSettings({ ...editorFieldSettings, [fieldId]: { ...editorFieldSettings[fieldId], [key]: value } })
  //   editorSetHasUnsavedChanges(true)
  // }

  // const handleFieldSettingsChange = (fieldId: string, settings: any) => {
  //   setFieldSettings({ ...editorFieldSettings, [fieldId]: settings })
  //   editorSetHasUnsavedChanges(true)
  // }

  // Loading state
  if (loading)
    return (
      <div className={cn('h-screen w-full flex flex-col items-center justify-center gap-8', theme === 'dark' ? 'bg-black' : 'bg-[#fafafa]')}>
        <Cpu size={48} className="text-indigo-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.8em] text-gray-500 animate-pulse italic">Initializing Canvas...</p>
      </div>
    )

  return (
    <div className={cn('h-screen flex flex-col overflow-hidden transition-colors duration-500', theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black')}>
      {/* ── Header ── */}
      {/* ── Editor Toolbar ── */}
      <EditorToolbar
        handleSave={handleSave}
        handlePublish={handlePublish}
        handleUnpublish={handleUnpublish}
        isGlobal={isGlobal}
      />

      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel */}
        <LeftPanel
          isGlobal={isGlobal}
          resizingSide={resizingSide}
          startResizing={startResizing}
          addBlock={addBlock}
          setInjectionIndex={setInjectionIndex}
        />

        {/* Canvas */}
        <main className={cn('flex-1 relative flex flex-col overflow-hidden transition-colors', theme === 'dark' ? 'bg-[#030303]' : 'bg-gray-50')}>

          <div className="flex-1 overflow-y-auto px-10 pt-10 pb-20 no-scrollbar scroll-smooth relative z-10 custom-editor-scrollbar">
            <div className="max-w-[1400px] mx-auto min-h-screen flex flex-col">
              {viewMode === 'visual' ? (
                <div className="flex-1 space-y-12">
                  {/* Document Kernel (Root Fields) */}
                  <div id="document-kernel" className={cn('space-y-6 transition-all duration-500', data?.align === 'center' && 'text-center', data?.align === 'right' && 'text-right')}>
                    <div className="flex items-center justify-between">
                      <div className={cn('flex items-center gap-0.5 p-0.5 rounded-none border', theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200')}>
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button key={align} onClick={() => data && editorSetData({ ...data, align })} className={cn('p-1 transition-all', data?.align === align || (!data?.align && align === 'left') ? theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-indigo-500')}>
                            {align === 'left' && <AlignLeft size={12} />} {align === 'center' && <AlignCenter size={12} />} {align === 'right' && <AlignRight size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <SchemaFieldRenderer
                      field={{ id: 'root:title', name: 'title', blockId: 'root', blockType: 'root', type: 'text', label: 'Page Title' }}
                      sectionId="root"
                      value={data?.title || ''}
                      onChange={(val) => editorSetData({ ...data!, title: val })}
                      showFieldIndicators={showFieldIndicators}
                      selectedField={editorSelectedField}
                      i18nEnabled={i18nEnabled}
                      getTranslatedValue={getTranslatedValue}
                      setTranslatedValue={setTranslatedValue}
                    />

                    {/* Description */}
                    <SchemaFieldRenderer
                      field={{ id: 'root:heroDescription', name: 'heroDescription', blockId: 'root', blockType: 'root', type: 'richtext', label: 'Hero Description' }}
                      sectionId="root"
                      value={data?.heroDescription || ''}
                      onChange={(val) => editorSetData({ ...data!, heroDescription: val })}
                      showFieldIndicators={showFieldIndicators}
                      selectedField={editorSelectedField}
                      i18nEnabled={i18nEnabled}
                      getTranslatedValue={getTranslatedValue}
                      setTranslatedValue={setTranslatedValue}
                    />
                  </div>

                  {/* Sections */}
                  <Reorder.Group axis="y" values={data?.sections || []} onReorder={handleReorder} className="space-y-8">
                    {data?.sections?.map((section: Section, index: number) => {
                      return (
                        <Reorder.Item key={section.id} value={section} as="div" className="relative group/item">
                          <div className="relative h-4 group/portal -mt-2">
                            <button onClick={() => { setInjectionIndex(index); setBlockPickerOpen(true) }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/portal:opacity-100 transition-all z-20">
                              <div className={cn('px-4 py-1 rounded-none border backdrop-blur-xl text-[8px] font-black uppercase italic flex items-center gap-2', theme === 'dark' ? 'bg-black/80 border-white/10 text-white' : 'bg-white/80 border-gray-200 text-black')}><Plus size={10} className="text-indigo-500" /> Insert Section</div>
                            </button>
                          </div>
                          <SectionBlock
                            section={section}
                            isActive={editorActiveSection === section.id}
                            theme={theme}
                            showFieldIndicators={showFieldIndicators}
                            selectedField={editorSelectedField}
                            schemaFields={editorSchemaFields}
                            fieldErrors={editorFieldErrors}
                            onSelect={() => editorSetActiveSection(section.id)}
                            onDuplicate={() => duplicateSection(section.id)}
                            onDelete={() => removeSection(section.id)}
                            onAlign={(align) => updateAlign(section.id, align)}
                            onFieldChange={(key, val) => handleFieldChange(section.id, key, val)}
                            onFieldSelect={(blockId: string, fieldKey: string) => setSelectedField({ blockId, fieldKey })}
                            i18nEnabled={i18nEnabled}
                            currentLocale={currentLocale}
                            getTranslatedValue={getTranslatedValue}
                            setTranslatedValue={setTranslatedValue}
                            onOpenRelations={openRelationsModal}
                            onAddToDynamicZone={(sectionId, fieldKey) => { setActiveDynamicZone({ sectionId, fieldKey }); setDynamicZoneModalOpen(true) }}
                            BLOCK_LIBRARY={BLOCK_LIBRARY}
                            getFieldConfig={getFieldConfig}
                          />
                        </Reorder.Item>
                      )
                    })}
                  </Reorder.Group>

                  {/* Add Section Button */}
                  <button onClick={() => setBlockPickerOpen(true)} className={cn('w-full py-10 rounded-none border-2 border-dashed transition-all flex flex-col items-center gap-4 group', theme === 'dark' ? 'border-white/5 hover:border-indigo-500/20 hover:bg-white/[0.01]' : 'border-gray-100 hover:border-indigo-500/20 hover:bg-gray-50')}>
                    <div className={cn('w-10 h-10 rounded-none border flex items-center justify-center group-hover:scale-110 transition-all', theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200')}><Plus size={20} /></div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] italic text-gray-500 group-hover:text-indigo-400">Append Section</p>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col pt-10">
                  <div className={cn('flex-1 p-10 font-mono text-sm overflow-auto rounded-none border', theme === 'dark' ? 'bg-black/50 border-white/5 text-indigo-300' : 'bg-gray-100 border-gray-200 text-indigo-900')}>
                    <pre className="no-scrollbar">{JSON.stringify(data, null, 3)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Panel */}
        <RightPanel
          isGlobal={isGlobal}
          resizingSide={resizingSide}
          startResizing={startResizing}
          iframeRef={iframeRef}
          handleRestore={handleRestore}
          newComment={newComment}
          setNewComment={setNewComment}
        />
      </div>

      {/* ── Modals ── */}
      <BlockPicker addBlock={addBlock} />
      <SeoModal />
      <TemplatesModal selectedSections={selectedSections} setSelectedSections={setSelectedSections} applyTemplate={applyTemplate} deleteTemplate={deleteTemplate} saveAsTemplate={saveAsTemplate} />
      <RelationsModal />
      <MediaLibrary />
      <DynamicZoneEditor dynamicZoneModalOpen={dynamicZoneModalOpen} setDynamicZoneModalOpen={setDynamicZoneModalOpen} activeDynamicZone={activeDynamicZone} addToDynamicZone={addToDynamicZone} removeFromDynamicZone={removeFromDynamicZone} />
    </div>
  )
}

export default SpatialEditor