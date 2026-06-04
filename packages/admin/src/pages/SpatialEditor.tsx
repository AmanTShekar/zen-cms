import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Reorder, useDragControls } from 'framer-motion'
import { BlockContextMenu } from './editor/components/BlockContextMenu'
import {
  Plus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Cpu,
  ChevronsUpDown,
  Terminal,
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
import { ConfirmDialog } from './editor/components/ConfirmDialog'
import { EditorToolbar } from './editor/EditorToolbar'
import FormBuilder from '../components/FormBuilder'
import { EditorErrorBoundary } from '../components/EditorErrorBoundary'
import { DocumentDiffModal } from './editor/components/DocumentDiffModal'
import { ConflictResolutionModal } from './editor/components/ConflictResolutionModal'
import { EditorStatusBar } from './editor/components/EditorStatusBar'
import { type Section, type PageData, detectFieldType, humanize } from './editor/constants'
import { useEditorBlocks } from '../context/BlockLibraryContext'
import { useCollab } from '../hooks/useCollab'
import { cn, uid } from '../lib/utils'

// Stores & Hooks
import { useEditorStore } from '../store/editorStore'
import { useShallow } from 'zustand/react/shallow'
import { usePanelStore } from '../store/panelStore'
import { useModalStore } from '../store/modalStore'
import { useWorkflowStore } from '../store/workflowStore'
import { useI18nStore } from '../store/i18nStore'
import { usePreviewSync } from '../hooks/usePreviewSync'
import { useUnsavedGuard } from '../hooks/useUnsavedGuard'
import { useValidation } from '../hooks/useValidation'
import { useAuthStore } from '../store/authStore'

const ReorderableSectionBlock = React.memo(
  ({
    section,
    index,
    totalSections,
    theme,
    showFieldIndicators,
    editorSelectedField,
    editorSchemaFields,
    editorFieldErrors,
    editorActiveSection,
    editorSetActiveSection,
    duplicateSection,
    removeSection,
    updateAlign,
    handleFieldChange,
    setSelectedField,
    i18nEnabled,
    currentLocale,
    getTranslatedValue,
    setTranslatedValue,
    setActiveDynamicZone,
    setDynamicZoneModalOpen,
    setInjectionIndex,
    setBlockPickerOpen,
    onOpenContextMenu,
    broadcastCursor,
    toggleCollapse,
    moveSection,
    copySection,
    pasteSection,
    handleBlockNameChange,
    selectedSections,
    onMultiSelect,
  }: {
    section: Section
    index: number
    totalSections: number
    theme: 'light' | 'dark'
    showFieldIndicators: boolean
    editorSelectedField: any
    editorSchemaFields: any[]
    editorFieldErrors: any
    editorActiveSection: string | null
    editorSetActiveSection: (id: string | null) => void
    duplicateSection: (id: string) => void
    removeSection: (id: string) => void
    updateAlign: (id: string, align: 'left' | 'center' | 'right') => void
    handleFieldChange: (id: string, key: string, val: any) => void
    setSelectedField: (field: any) => void
    i18nEnabled: boolean
    currentLocale: string
    getTranslatedValue: any
    setTranslatedValue: any
    setActiveDynamicZone: any
    setDynamicZoneModalOpen: any
    setInjectionIndex: any
    setBlockPickerOpen: any
    onOpenContextMenu: (e: React.MouseEvent, sectionId: string) => void
    broadcastCursor?: (sectionId?: string, fieldKey?: string) => void
    collab?: any  // collaboration context — passed through but only broadcastCursor is consumed
    toggleCollapse: (id: string) => void
    moveSection: (id: string, dir: 'up' | 'down') => void
    copySection: (id: string) => void
    pasteSection: (id: string) => void
    handleBlockNameChange: (id: string, name: string) => void
    selectedSections: Set<string>
    onMultiSelect: (id: string, multi: boolean) => void
  }) => {
    const dragControls = useDragControls()

    return (
      <Reorder.Item
        key={section.id}
        value={section.id}
        dragListener={false}
        dragControls={dragControls}
        as="div"
        whileDrag={{
          scale: 1.02,
          opacity: 0.9,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 50,
          cursor: 'grabbing',
        }}
        className="relative group/item"
      >
        <div className="relative h-8 group/portal -mt-4">
          <button
            onClick={() => {
              setInjectionIndex(index)
              setBlockPickerOpen(true)
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-60 hover:!opacity-100 transition-all z-20 px-3 py-1 rounded-none border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/70 backdrop-blur-xl"
          >
            <span className={cn(
              'text-[9px] font-black uppercase italic flex items-center gap-1.5 tracking-wider',
              theme === 'dark' ? 'text-white/70' : 'text-black/70'
            )}>
              <Plus size={10} className="text-emerald-500" /> Insert
            </span>
          </button>
        </div>
        <SectionBlock
          section={section}
          index={index}
          totalSections={totalSections}
          isActive={editorActiveSection === section.id}
          isMultiSelected={selectedSections.has(section.id)}
          theme={theme}
          showFieldIndicators={showFieldIndicators}
          selectedField={editorSelectedField}
          schemaFields={editorSchemaFields}
          fieldErrors={editorFieldErrors}
          onSelect={(e) => onMultiSelect(section.id, e?.shiftKey || false)}
          onDuplicate={() => duplicateSection(section.id)}
          onDelete={() => removeSection(section.id)}
          onAlign={(align) => updateAlign(section.id, align)}
          onFieldChange={(key, val) => handleFieldChange(section.id, key, val)}
          onFieldSelect={(blockId: string, fieldKey: string) => { 
            setSelectedField({ blockId, fieldKey }); 
            broadcastCursor?.(blockId, fieldKey);
            editorSetActiveSection(blockId);
            onMultiSelect(blockId, false);
          }}
          i18nEnabled={i18nEnabled}
          currentLocale={currentLocale}
          getTranslatedValue={getTranslatedValue}
          setTranslatedValue={setTranslatedValue}
          onAddToDynamicZone={(sectionId, fieldKey) => {
            setActiveDynamicZone({ sectionId, fieldKey })
            setDynamicZoneModalOpen(true)
          }}
          dragControls={dragControls}
          onContextMenu={(e) => onOpenContextMenu(e, section.id)}
          onToggleCollapse={() => toggleCollapse(section.id)}
          onMoveUp={() => moveSection(section.id, 'up')}
          onMoveDown={() => moveSection(section.id, 'down')}
          onCopy={() => copySection(section.id)}
          onPaste={() => pasteSection(section.id)}
          onBlockNameChange={(name) => handleBlockNameChange(section.id, name)}
        />
      </Reorder.Item>
    )
  },
  (prev, next) => {
    if (prev.section !== next.section) return false
    if (prev.index !== next.index) return false
    if (prev.totalSections !== next.totalSections) return false
    if (prev.theme !== next.theme) return false
    if (prev.showFieldIndicators !== next.showFieldIndicators) return false
    if (prev.editorActiveSection !== next.editorActiveSection) return false
    if (prev.editorFieldErrors !== next.editorFieldErrors) return false
    if (prev.editorSelectedField !== next.editorSelectedField) return false
    if (prev.editorSchemaFields !== next.editorSchemaFields) return false
    if (prev.i18nEnabled !== next.i18nEnabled) return false
    if (prev.currentLocale !== next.currentLocale) return false
    if (prev.broadcastCursor !== next.broadcastCursor) return false
    if (prev.handleFieldChange !== next.handleFieldChange) return false
    if (prev.selectedSections !== next.selectedSections) return false
    if (prev.onMultiSelect !== next.onMultiSelect) return false
    return true
  }
)

interface SpatialEditorProps {
  isGlobal?: boolean
  id?: string
  /** Pre-select a specific section/block and scroll to it on mount */
  focusedSectionId?: string
  onClose?: () => void
}

// Main Component
const SpatialEditor: React.FC<SpatialEditorProps> = ({ isGlobal, id: propId, focusedSectionId, onClose }) => {
  const params = useParams<{ id?: string; slug?: string }>()
  const navigate = useNavigate()
  const isNewDoc = !isGlobal && !params.id
  const id = propId || params.id || (isGlobal ? params.slug : 'new')
  const { theme } = useTheme()
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const BLOCK_LIBRARY = useEditorBlocks()

  // Zustand stores — useShallow prevents full re-render on unrelated state changes
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
    setAvailableCollections,
    setActiveSection: editorSetActiveSection,
  } = useEditorStore(useShallow((s) => ({
    data: s.data,
    setData: s.setData,
    setLoading: s.setLoading,
    setSaving: s.setSaving,
    setHasUnsavedChanges: s.setHasUnsavedChanges,
    updateData: s.updateData,
    undo: s.undo,
    redo: s.redo,
    activeSection: s.activeSection,
    selectedField: s.selectedField,
    schemaFields: s.schemaFields,
    fieldSettings: s.fieldSettings,
    fieldErrors: s.fieldErrors,
    setHistory: s.setHistory,
    setSelectedField: s.setSelectedField,
    setSchemaFields: s.setSchemaFields,
    setFieldSettings: s.setFieldSettings,
    setFieldErrors: s.setFieldErrors,
    setAvailableCollections: s.setAvailableCollections,
    setActiveSection: s.setActiveSection,
  })))
  const { viewMode } = usePanelStore()
  const { templatesOpen, setTemplatesOpen, setSeoOpen, showFieldIndicators, blockPickerOpen, setBlockPickerOpen } = useModalStore()
  const { workflowStatus, setWorkflowStatus, publishStatus, setPublishStatus, workflowReviewers, setWorkflowReviewers, workflowComments, setWorkflowComments, scheduledAt, setScheduledAt, setReleases, setActiveRelease } = useWorkflowStore()
  const { i18nEnabled, currentLocale, translations, setTranslations, updateTranslation: i18nUpdateTranslation } = useI18nStore()
  
  const siteId = useAuthStore((s) => s.siteId)

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
  const [injectionIndex, setInjectionIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sectionId: string } | null>(null)
  const [diffVersion, setDiffVersion] = useState<{ id: string; num: number } | null>(null)
  const [topLevelFields, setTopLevelFields] = useState<any[]>([])
  const hasBlocksField = React.useMemo(() => {
    return topLevelFields.some((f: any) => f.type === 'blocks' || f.name === 'layout' || f.name === 'sections')
  }, [topLevelFields])
  const sectionIdsMemo = React.useMemo(() => {
    return (dataRaw as PageData | null)?.sections?.map((s: Section) => s.id) || []
  }, [(dataRaw as PageData | null)?.sections?.length])
  const [conflictData, setConflictData] = useState<{
    open: boolean
    message?: string
    serverVersion?: number
    localVersion?: number
  }>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; sectionId: string | null }>({ open: false, sectionId: null })

  // Hooks
  usePreviewSync(iframeRef, data, 300)
  useUnsavedGuard({ hasUnsavedChanges })
  const collab = useCollab({
    collection: isGlobal ? 'globals' : 'pages',
    documentId: id || '',
    wsUrl: typeof window !== 'undefined' && import.meta.env.VITE_ENABLE_WS === 'true'
      ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/collaboration`
      : undefined,
    enabled: true,
  })
  const validate = useValidation(BLOCK_LIBRARY.map((b) => ({ slug: b.type, label: b.title, fields: b.fields || [], defaultContent: b.defaultContent })))

  // Keep a ref to latest data so force-save never uses stale closure state
  const dataRef = useRef(data)
  useEffect(() => { dataRef.current = data }, [data])
  // Refs for workflow/i18n state — keeps handlers from reading stale closure values
  const publishStatusRef = useRef(publishStatus)
  const workflowStatusRef = useRef(workflowStatus)
  const workflowReviewersRef = useRef(workflowReviewers)
  const workflowCommentsRef = useRef(workflowComments)
  const scheduledAtRef = useRef(scheduledAt)
  const translationsRef = useRef(translations)
  const fieldSettingsRef = useRef(editorFieldSettings)
  useEffect(() => { publishStatusRef.current = publishStatus }, [publishStatus])
  useEffect(() => { workflowStatusRef.current = workflowStatus }, [workflowStatus])
  useEffect(() => { workflowReviewersRef.current = workflowReviewers }, [workflowReviewers])
  useEffect(() => { workflowCommentsRef.current = workflowComments }, [workflowComments])
  useEffect(() => { scheduledAtRef.current = scheduledAt }, [scheduledAt])
  useEffect(() => { translationsRef.current = translations }, [translations])
  useEffect(() => { fieldSettingsRef.current = editorFieldSettings }, [editorFieldSettings])
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])
  const prevDocIdRef = useRef<string | undefined>(id)
  const copiedSectionRef = useRef<Section | null>(null)
  // Guards fetchData callbacks from running after the component unmounts
  const isCancelledRef = useRef(false)
  useEffect(() => { 
    isCancelledRef.current = false
    return () => { isCancelledRef.current = true } 
  }, [id, isGlobal, siteId])
  // Guards against concurrent saves (spam Ctrl+S) — only one save runs at a time
  const isSavingRef = useRef(false)
  // Guards templates API from racing with rapid open/close toggles
  const templatesLoadIdRef = useRef(0)
  // Safe deep clone — avoids JSON.parse/JSON.stringify crashes on circular structures
  const safeDeepClone = <T,>(obj: T): T => {
    try { return structuredClone(obj) } catch { return JSON.parse(JSON.stringify(obj)) }
  }
  const getTranslatedValue = (sectionId: string, fieldKey: string, defaultValue: string): string => {
    if (!i18nEnabled || currentLocale === 'en') return defaultValue
    return translations[`${sectionId}:${fieldKey}`]?.[currentLocale] || defaultValue
  }
  const setTranslatedValue = (sectionId: string, fieldKey: string, value: string) => {
    i18nUpdateTranslation(`${sectionId}:${fieldKey}`, currentLocale, value)
    editorSetHasUnsavedChanges(true)
  }

  const handleOpenContextMenu = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      sectionId,
    })
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
  useEffect(() => { if (iframeRef.current?.contentWindow && editorActiveSection) iframeRef.current.contentWindow.postMessage({ type: 'ZENITH_PARENT_SELECT', sectionId: editorActiveSection, id: editorActiveSection }, '*') }, [editorActiveSection])
  
  // Auto-scroll to top-level fields when focused
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      // Rich text editors might use data-field or data-name, inputs use name
      const name = target.getAttribute('name') || target.getAttribute('data-field') || target.closest('[data-field]')?.getAttribute('data-field')
      if (name && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'ZENITH_PARENT_SELECT', id: name }, '*')
      }
    }
    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  // Task 04: iframe message handler — versioned protocol with type guard + cleanup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our storefront origin (or '*' in dev)
      const expectedOrigin = import.meta.env.VITE_STOREFRONT_URL || window.location.origin
      if (expectedOrigin !== '*' && event.origin !== expectedOrigin && event.origin !== window.location.origin) return
      // Versioned protocol guard
      switch (event.data?.type) {
        case 'ZENITH_IFRAME_READY':
          if (editorActiveSection) {
            iframeRef.current?.contentWindow?.postMessage({ type: 'ZENITH_PARENT_SELECT', sectionId: editorActiveSection, id: editorActiveSection }, '*')
          }
          break
        case 'ZENITH_SECTION_SELECT': {
          const sectionId = event.data.sectionId || event.data.id
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

  // Keyboard shortcuts — use refs to avoid stale closures
  const keyboardStateRef = useRef({ editorActiveSection, selectedSections })
  useEffect(() => {
    keyboardStateRef.current = { editorActiveSection, selectedSections }
  }, [editorActiveSection, selectedSections])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when typing in inputs
      const tagName = (e.target as any)?.tagName
      const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || (e.target as any)?.isContentEditable

      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.key === 's') { e.preventDefault(); handleSave(); return }
      if (isMeta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return }
      if (isMeta && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) { e.preventDefault(); handleRedo(); return }
      if (isMeta && e.key === '\\') { e.preventDefault(); const p = usePanelStore.getState(); p.setLeftOpen(!p.leftOpen); return }
      if (isMeta && e.key === 'p') { e.preventDefault(); const p = usePanelStore.getState(); p.setRightOpen(!p.rightOpen); return }

      if (isInput) return

      const { editorActiveSection: activeSec, selectedSections: selSecs } = keyboardStateRef.current
      if (isMeta && e.key === 'd' && activeSec && activeSec !== 'root') { e.preventDefault(); duplicateSection(activeSec); return }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selSecs.size > 0) { e.preventDefault(); selSecs.forEach((sectionId) => removeSection(sectionId)); setSelectedSections(new Set()); return }
      if (e.key === 'Escape') { setSelectedSections(new Set()); editorSetActiveSection(null); setBlockPickerOpen(false); setSeoOpen(false); setTemplatesOpen(false); return }
      if (e.key === '/') { setBlockPickerOpen(true) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          const autoTitleSection = (s.data?.sections || []).find((sec: any) => sec.blockType === 'pageTitle')
          const autoDescSection = (s.data?.sections || []).find((sec: any) => sec.blockType === 'pageDescription')
          const payload = {
            ...s.data,
            title: autoTitleSection?.content?.title ?? s.data?.title,
            heroDescription: autoDescSection?.content?.description ?? s.data?.heroDescription,
            sections: (s.data?.sections || []).map((sec: any) => {
              const { id, content, ...rest } = sec;
              return { ...rest, ...(sanitizeContent(content || {})) };
            }) || [],
            _status: s.publishStatus, workflowStatus: s.workflowStatus, reviewers: s.workflowReviewers, comments: s.workflowComments, scheduledAt: s.scheduledAt || undefined, publishedAt: s.publishStatus === 'published' ? (s.data.publishedAt || new Date().toISOString()) : null, i18n: s.translations, _fieldSettings: s.fieldSettings
          }
          if (isGlobal) {
            await api.patch(`/globals/${id}`, payload)
          } else if (isNewDoc) {
            const res = await api.post(`/${params.slug || 'pages'}`, payload)
            const newId = res.data?.data?._id || res.data?.data?.id
            if (newId) {
              navigate(`/collections/${params.slug || 'pages'}/${newId}`, { replace: true })
            }
          } else {
            await api.patch(`/${params.slug || 'pages'}/${id}`, payload)
          }
          editorSetHasUnsavedChanges(false)
          useEditorStore.getState().setLastSavedAt(new Date().toISOString())
        } catch { toast.error('Auto-save failed', { icon: '⚠️', duration: 3000 }) } finally { editorSetSaving(false) }
      })()
    }, 30000)
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current) }
  }, [data, hasUnsavedChanges, saving, isGlobal, id, validate])

  // Load templates
  useEffect(() => {
    if (!templatesOpen) return
    const loadId = ++templatesLoadIdRef.current
    api.get('/templates').then((res) => {
      if (loadId !== templatesLoadIdRef.current) return  // stale race — drop
      useEditorStore.getState().setTemplates(res.data.data || [])
    }).catch(() => { /* ignore */ })
  }, [templatesOpen])

  // Load initial data
  useEffect(() => {
    // Clear undo/redo stacks when navigating to a different document
    if (prevDocIdRef.current && prevDocIdRef.current !== id) {
      useEditorStore.setState({ undoStack: [], redoStack: [] })
    }
    prevDocIdRef.current = id

    const fetchData = async () => {
      editorSetLoading(true)
      try {
        const collectionSlug = params.slug || 'pages'
        let serverData: any = { sections: [] };
        if (!isNewDoc) {
          const res = isGlobal ? await api.get(`/globals/${id}`) : await api.get(`/${collectionSlug}/${id}`)
          if (res.data?.data) {
            serverData = res.data.data;
          }
        }
        if (isCancelledRef.current) return
        const pageData = serverData
        const migratedSections = (pageData.sections || []).map((s: any) => {
          const { id, blockType, align, blockName, collapsed, content, blockData, ...restProps } = s
          const hasContent = content && Object.keys(content).length > 0
          const hasBlockData = blockData && Object.keys(blockData).length > 0
          return {
            id: id || uid(),
            blockType,
            align,
            blockName,
            collapsed,
            content: hasContent ? content : (hasBlockData ? blockData : restProps)
          }
        })

        editorSetData({ ...pageData, sections: migratedSections })
        if (isCancelledRef.current) return
        if (migratedSections.length > 0) editorSetActiveSection(migratedSections[0].id)

        const collection = isGlobal ? 'globals' : (params.slug || 'pages')
        const docId = id
        if (!isNewDoc) {
          const historyRes = await api.get(`/versions/${collection}/${docId}`)
          if (!isCancelledRef.current) {
            setHistory(historyRes.data.data || [])
          }
        }

        setPublishStatus(pageData._status || pageData.status || 'draft')
        setWorkflowStatus(pageData.workflowStatus || 'draft')
        setWorkflowReviewers(pageData.reviewers || [])
        setWorkflowComments(pageData.comments || [])
        setScheduledAt(pageData.scheduledAt || '')
        setTranslations(pageData.i18n || {})

        if (isCancelledRef.current) return
        try { const releasesRes = await api.get('/releases'); if (isCancelledRef.current) return; setReleases(releasesRes.data.data || []); setActiveRelease(releasesRes.data.data?.find((r: any) => r.status === 'pending') || null) } catch { if (!isCancelledRef.current) toast.error('Failed to load releases') }
        try { 
          const colsRes = await api.get('/health'); 
          if (isCancelledRef.current) return; 
          const healthData = colsRes?.data?.data || {};
          setAvailableCollections(healthData.collections || []);
          const colList = isGlobal ? (healthData.globals || []) : (healthData.collections || []);
          const col = colList.find((c: any) => c.slug === (params.slug || 'pages'));
          setTopLevelFields(col?.fields || []);
        } catch { if (!isCancelledRef.current) toast.error('Failed to load collections') }

        const settings: Record<string, any> = {}
        migratedSections.forEach((s: any) => {
          Object.keys(s.content || {}).forEach((key) => {
            const settingKey = `${s.id}:${key}`
            settings[settingKey] = { required: false, unique: false, maxLength: null, minLength: null, private: false, relation: null, ...pageData._fieldSettings?.[settingKey] }
          })
        })
        setFieldSettings(settings)

        const schema: any[] = []
        migratedSections.forEach((s: any) => {
          Object.keys(s.content || {}).forEach((key) => {
            schema.push({ id: `${s.id}:${key}`, name: key, blockId: s.id, blockType: s.blockType, type: detectFieldType(key, s.content[key]), label: humanize(key), required: false, unique: false, sortable: true, filterable: true, private: false })
          })
        })
        setSchemaFields(schema)
      } catch { if (!isCancelledRef.current) toast.error('Failed to sync editor', { icon: '⚠️', duration: 5000 }) } finally { if (!isCancelledRef.current) setTimeout(() => editorSetLoading(false), 500) }
    }
    fetchData()
  }, [id, isGlobal, siteId])

  const initialFocusDoneRef = useRef(false)
    
  // Reset initial focus when document ID changes
  useEffect(() => {
     initialFocusDoneRef.current = false;
  }, [id])

  // 🧲 Focus a specific section when navigated directly (e.g. from collection detail) 🧲
  useEffect(() => {
    if (!data?.sections?.length) return
    if (initialFocusDoneRef.current) return

    if (focusedSectionId) {
      const exists = data.sections.some((s: Section) => s.id === focusedSectionId)
      if (exists) {
        editorSetActiveSection(focusedSectionId)
        setSelectedSections(new Set([focusedSectionId]))
        initialFocusDoneRef.current = true
      }
    } else {
      const firstSectionId = data.sections[0].id
      editorSetActiveSection(firstSectionId)
      setSelectedSections(new Set([firstSectionId]))
      initialFocusDoneRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedSectionId, data?.sections?.length])

  // Issue 7: Reset injectionIndex when BlockPicker closes (via any path)
  // Issue 7: Scroll active section into view when it changes
  useEffect(() => {
    if (!editorActiveSection) return
    const el = document.getElementById(editorActiveSection)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Add a visual flash effect to the selected block in the left panel
      el.classList.add('ring-2', 'ring-[#8B5CF6]', 'ring-offset-2', 'ring-offset-[#0B0F19]', 'transition-all', 'duration-500')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#8B5CF6]', 'ring-offset-2', 'ring-offset-[#0B0F19]')
      }, 1000)
    }
  }, [editorActiveSection])

  useEffect(() => {
    if (blockPickerOpen === false) setInjectionIndex(null)
  }, [blockPickerOpen])

  /** Strip empty strings, nulls, and empty objects from section content to avoid Zod 422 on media/relation fields */
  const sanitizeContent = (content: Record<string, any>): Record<string, any> => {
    const cleaned: Record<string, any> = {}
    for (const [key, val] of Object.entries(content)) {
      if (val === '' || val === null || val === undefined) continue
      if (Array.isArray(val) && val.length === 0) continue
      if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) continue
      cleaned[key] = val
    }
    return cleaned
  }

  const handleSave = async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    const latest = dataRef.current
    if (!latest) { isSavingRef.current = false; return }
    const errors = validate(latest)
    if (errors.length > 0) {
      const errorMap: Record<string, string> = {}
      errors.forEach(e => {
        const key = `${e.sectionId}:${e.fieldName}`
        errorMap[key] = e.message
      })
      setStoreFieldErrors(errorMap)
      toast.error(`${errors.length} validation error(s) found. Please fix the errors before saving.`)
      isSavingRef.current = false
      return
    }
    setStoreFieldErrors({})
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    editorSetSaving(true)
    let savedVersion: number | undefined
    try {
      const pStatus = publishStatusRef.current
      // Extract pageTitle/pageDescription from sections back to root fields for backward compat
      const pageTitleSection = (latest.sections || []).find((s: any) => s.blockType === 'pageTitle')
      const pageDescSection = (latest.sections || []).find((s: any) => s.blockType === 'pageDescription')
      const payload = {
        ...latest,
        title: pageTitleSection?.content?.title ?? latest.title,
        heroDescription: pageDescSection?.content?.description ?? latest.heroDescription,
        sections: (latest.sections || []).map((s: any) => {
          const { id, content, ...rest } = s;
          return { ...rest, ...sanitizeContent(content || {}) };
        }) || [],
        _status: pStatus, workflowStatus: workflowStatusRef.current, reviewers: workflowReviewersRef.current, comments: workflowCommentsRef.current, scheduledAt: scheduledAtRef.current || undefined, publishedAt: pStatus === 'published' ? (latest.publishedAt || new Date().toISOString()) : null, i18n: translationsRef.current, _fieldSettings: fieldSettingsRef.current
      }
      let res;
      if (isGlobal) {
        res = await api.patch(`/globals/${id}`, payload)
      } else if (isNewDoc) {
        res = await api.post(`/${params.slug || 'pages'}`, payload)
      } else {
        res = await api.patch(`/${params.slug || 'pages'}/${id}`, payload)
      }
      savedVersion = res.data.data?._version
      const newId = res.data?.data?._id || res.data?.data?.id
      editorSetHasUnsavedChanges(false)
      useEditorStore.getState().setLastSavedAt(new Date().toISOString())
      toast.success(pStatus === 'published' ? '✨ Published!' : '📝 Saved as Draft', {})
      
      if (isNewDoc && newId) {
        navigate(`/collections/${params.slug || 'pages'}/${newId}`, { replace: true })
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const serverMsg = err?.response?.data?.error?.message || ''
        const serverVerMatch = serverMsg.match(/current\s+(\d+)/i)
        setConflictData({
          open: true,
          message: serverMsg,
          serverVersion: serverVerMatch ? parseInt(serverVerMatch[1]) : (err?.response?.data?.data?.currentVersion ?? undefined),
          localVersion: latest._version ?? undefined,
        })
        editorSetSaving(false)
        isSavingRef.current = false
        return
      }
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to save changes')
      editorSetSaving(false)
      isSavingRef.current = false
      return
    }
    editorSetSaving(false)
    isSavingRef.current = false
    if (savedVersion !== undefined) {
      editorUpdateData((draft) => { draft._version = savedVersion })
      const collectionName = isGlobal ? 'globals' : (params.slug || 'pages')
      api.get(`/versions/${collectionName}/${id}`)
        .then((res) => setHistory(res.data.data || []))
        .catch(() => {})
    }
  }

  const handleUndo = () => { undo(); toast.success('Undone', { icon: '↩️' }) }
  const handleRedo = () => { redo(); toast.success('Redone', { icon: '↪️' }) }
  const handleReload = async () => {
    toast.loading('Reloading server version...', { id: 'conflict' })
    try {
      const collectionSlug = params.slug || 'pages'
      const res = isGlobal
        ? await api.get(`/globals/${id}`)
        : await api.get(`/${collectionSlug}/${id}`)
      const serverData = res.data.data
      const normalized = {
        ...serverData,
        sections: (serverData.sections || []).map((s: any) => ({
          ...s,
          id: s.id || uid(),
          content: s.content || s.blockData || {},
        })),
      }
      editorSetData(normalized as PageData)
      editorSetHasUnsavedChanges(false)
      setConflictData({ open: false })
      toast.success('Reloaded server version', { id: 'conflict' })
    } catch {
      toast.error('Failed to reload', { id: 'conflict' })
    }
  }
  const handleForceSave = async () => {
    const latest = dataRef.current
    if (!latest) return
    toast.loading('Force-saving your version...', { id: 'conflict' })
    try {
      const forceTitleSection = (latest.sections || []).find((s: any) => s.blockType === 'pageTitle')
      const forceDescSection = (latest.sections || []).find((s: any) => s.blockType === 'pageDescription')
      const payload = {
        ...latest,
        title: forceTitleSection?.content?.title ?? latest.title,
        heroDescription: forceDescSection?.content?.description ?? latest.heroDescription,
        sections: (latest.sections || []).map((s: any) => {
          const { id, content, ...rest } = s;
          return { ...rest, ...sanitizeContent(content || {}) };
        }) || [],
        _version: conflictData.serverVersion !== undefined ? conflictData.serverVersion : latest._version,
        _status: publishStatusRef.current, workflowStatus: workflowStatusRef.current, reviewers: workflowReviewersRef.current, comments: workflowCommentsRef.current, scheduledAt: scheduledAtRef.current || undefined, publishedAt: publishStatusRef.current === 'published' ? (latest.publishedAt || new Date().toISOString()) : null, i18n: translationsRef.current, _fieldSettings: fieldSettingsRef.current
      }
      let res;
      if (isGlobal) {
        res = await api.patch(`/globals/${id}`, payload)
      } else if (isNewDoc) {
        res = await api.post(`/${params.slug || 'pages'}`, payload)
      } else {
        res = await api.patch(`/${params.slug || 'pages'}/${id}`, payload)
      }
      const newVersion = res.data.data?._version
      const newId = res.data?.data?._id || res.data?.data?.id
      if (newVersion !== undefined) editorSetData({ ...latest, _version: newVersion })
      editorSetHasUnsavedChanges(false)
      useEditorStore.getState().setLastSavedAt(new Date().toISOString())
      setConflictData({ open: false })
      toast.success('Force-saved your version', { id: 'conflict' })
      
      if (isNewDoc && newId) {
        navigate(`/collections/${params.slug || 'pages'}/${newId}`, { replace: true })
      }
    } catch (err: any) {
      const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Force-save failed'
      toast.error(serverMsg, { id: 'conflict' })
    }
  }

  const handlePublish = async () => { setPublishStatus('published'); await handleSave() }
  const handleUnpublish = async () => { setPublishStatus('draft'); setScheduledAt(''); useWorkflowStore.getState().setWorkflowStatus('draft'); toast.success('Unpublished - now visible only to editors') }

  // Section operations
  const addBlock = (blockType: string) => {
    const block = BLOCK_LIBRARY.find((b) => b.type === blockType)
    if (!block) return
    const newId = uid()
    const anchorId = `${block.type}-${newId.slice(0, 4)}`
    const newSection: Section = { 
      id: newId, 
      blockType: block.type, 
      title: block.title, 
      content: { ...block.defaultContent, anchorId } 
    }
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
    toast.success(`Section added: ${blockType.toUpperCase()}`, { icon: '✨' })
  }

  const duplicateSection = (sectionId: string) => {
    const latest = dataRef.current
    if (!latest) return
    const sectionToDuplicate = latest.sections.find((s) => s.id === sectionId)
    if (!sectionToDuplicate) return
    const newId = uid()
    const anchorId = `${sectionToDuplicate.blockType}-${newId.slice(0, 4)}`
    const duplicatedSection: Section = { 
      ...sectionToDuplicate, 
      id: newId, 
      title: `${sectionToDuplicate.title} (Copy)`, 
      content: { ...safeDeepClone(sectionToDuplicate.content), anchorId } 
    }
    editorUpdateData((prev) => { const idx = prev.sections.findIndex((s) => s.id === sectionId); const newSections = [...prev.sections]; newSections.splice(idx + 1, 0, duplicatedSection); return { ...prev, sections: newSections } })
    editorSetActiveSection(duplicatedSection.id)
    toast.success('Section duplicated', { icon: '📋' })
  }

  const removeSection = (id: string) => {
    const target = dataRef.current?.sections?.find((s) => s.id === id)
    if (!target) return
    setDeleteConfirm({ open: true, sectionId: id })
  }

  const confirmRemoveSection = () => {
    const id = deleteConfirm.sectionId
    if (!id) return
    const target = dataRef.current?.sections?.find((s) => s.id === id)
    setDeleteConfirm({ open: false, sectionId: null })
    editorUpdateData((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== id) }))
    if (editorActiveSection === id) editorSetActiveSection(null)
    if (selectedSections.has(id)) { const newSelected = new Set(selectedSections); newSelected.delete(id); setSelectedSections(newSelected) }
    toast.error(`Section "${target?.title || target?.blockType}" removed`)
  }

  const convertBlockType = (sectionId: string, newBlockType: string) => {
    const targetBlockDef = BLOCK_LIBRARY.find((b) => b.type === newBlockType)
    if (!targetBlockDef) return
    editorUpdateData((prev) => {
      if (!prev) return prev
      const newSections = [...(prev.sections || [])]
      const idx = newSections.findIndex((s) => s.id === sectionId)
      if (idx !== -1) {
        const oldSection = newSections[idx]
        const oldContent = oldSection.content || {}
        const newContent = { ...targetBlockDef.defaultContent }

        // Heuristic field mapping:
        const titleKeys = ['title', 'heading', 'headline', 'name']
        const bodyKeys = ['content', 'description', 'bio', 'body', 'subheadline']

        const oldTitleVal = Object.entries(oldContent).find(([k]) => titleKeys.some((tk) => k.toLowerCase().includes(tk)))?.[1]
        const oldBodyVal = Object.entries(oldContent).find(([k]) => bodyKeys.some((bk) => k.toLowerCase().includes(bk)))?.[1]

        Object.keys(newContent).forEach((key) => {
          const kLower = key.toLowerCase()
          if (titleKeys.some((tk) => kLower.includes(tk)) && oldTitleVal !== undefined) {
            newContent[key] = oldTitleVal
          } else if (bodyKeys.some((bk) => kLower.includes(bk)) && oldBodyVal !== undefined) {
            newContent[key] = oldBodyVal
          } else if (oldContent[key] !== undefined) {
            newContent[key] = oldContent[key]
          }
        })

        newSections[idx] = {
          ...oldSection,
          blockType: newBlockType,
          title: targetBlockDef.title,
          content: newContent,
        }
      }
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
    toast.success(`Converted block layout to: ${targetBlockDef.title}`, { icon: '🔄' })
  }

  const toggleCollapse = (sectionId: string) => {
    editorUpdateData((prev) => {
      const newSections = [...prev.sections]
      const idx = newSections.findIndex((s) => s.id === sectionId)
      if (idx !== -1) {
        newSections[idx] = { ...newSections[idx], collapsed: !newSections[idx].collapsed }
      }
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
  }

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    editorUpdateData((prev) => {
      const newSections = [...prev.sections]
      const idx = newSections.findIndex((s) => s.id === sectionId)
      if (idx === -1) return prev
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      if (targetIdx < 0 || targetIdx >= newSections.length) return prev
      ;[newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]]
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
  }

  const copySection = (sectionId: string) => {
    const latest = dataRef.current
    if (!latest) return
    const section = latest.sections.find((s) => s.id === sectionId)
    if (!section) return
    try {
      navigator.clipboard.writeText(JSON.stringify({ type: 'zenith-section', section }))
    } catch {
      copiedSectionRef.current = section
    }
    toast.success('Section copied', { icon: '📋' })
  }

  const insertCopiedSection = (sourceSection: Section, afterSectionId?: string) => {
    const newSection: Section = {
      ...sourceSection,
      id: uid(),
      title: `${sourceSection.title} (Copied)`,
      content: safeDeepClone(sourceSection.content),
    }
    editorUpdateData((prev) => {
      const sections = [...prev.sections]
      if (afterSectionId) {
        const idx = sections.findIndex((s) => s.id === afterSectionId)
        sections.splice(idx + 1, 0, newSection)
      } else {
        sections.push(newSection)
      }
      return { ...prev, sections }
    })
    editorSetActiveSection(newSection.id)
    editorSetHasUnsavedChanges(true)
    toast.success('Section pasted', { icon: '📋' })
  }

  const pasteSection = (sectionId: string) => {
    navigator.clipboard.readText().then((text) => {
      try {
        const parsed = JSON.parse(text)
        if (parsed.type === 'zenith-section') {
          insertCopiedSection(parsed.section, sectionId)
          return
        }
      } catch {}
      if (copiedSectionRef.current) {
        insertCopiedSection(copiedSectionRef.current, sectionId)
      } else {
        toast.error('No copied section found', { icon: '⚠️' })
      }
    }).catch(() => {
      if (copiedSectionRef.current) {
        insertCopiedSection(copiedSectionRef.current, sectionId)
      } else {
        toast.error('No copied section found', { icon: '⚠️' })
      }
    })
  }

  const handleBlockNameChange = (sectionId: string, name: string) => {
    editorUpdateData((prev) => {
      const newSections = [...prev.sections]
      const idx = newSections.findIndex((s) => s.id === sectionId)
      if (idx !== -1) {
        newSections[idx] = { ...newSections[idx], blockName: name }
      }
      return { ...prev, sections: newSections }
    })
    editorSetHasUnsavedChanges(true)
  }

  const handleCollapseAll = () => {
    const latest = dataRef.current
    if (!latest) return
    const allCollapsed = latest.sections.every((s) => s.collapsed)
    editorUpdateData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => ({ ...s, collapsed: !allCollapsed })),
    }))
    editorSetHasUnsavedChanges(true)
    toast.success(allCollapsed ? 'All sections expanded' : 'All sections collapsed', { icon: '📐' })
  }

  const updateAlign = (sectionId: string, align: 'left' | 'center' | 'right') => {
    editorUpdateData((prev) => { const newSections = [...prev.sections]; const idx = newSections.findIndex((s) => s.id === sectionId); if (idx !== -1) newSections[idx].align = align; return { ...prev, sections: newSections } })
  }

  const handleReorder = (newIds: string[]) => {
    editorUpdateData((prev) => {
      const sectionsMap = new Map((prev?.sections || []).map((s) => [s.id, s]))
      const newSections = newIds.map((id) => sectionsMap.get(id)).filter(Boolean) as Section[]
      return { ...prev, sections: newSections }
    })
  }

  const handleDynamicZoneReorder = (sectionId: string, fieldKey: string, newItems: any[]) => {
    editorUpdateData((prev) => {
      const newSections = [...prev.sections]
      const sIdx = newSections.findIndex((s) => s.id === sectionId)
      if (sIdx !== -1) {
        newSections[sIdx].content[fieldKey] = newItems
      }
      return { ...prev, sections: newSections }
    })
  }

  const handleFieldChange = useCallback((sectionId: string, key: string, value: any) => {
    useEditorStore.getState().setField(sectionId, key, value)
    const errorKey = `${sectionId}:${key}`
    if (useEditorStore.getState().fieldErrors[errorKey]) {
      const next = { ...useEditorStore.getState().fieldErrors }
      delete next[errorKey]
      useEditorStore.getState().setFieldErrors(next)
    }
  }, [])

  // Template operations
  const saveAsTemplate = async (sectionIds: string[]) => {
    const templateSections = data?.sections.filter((s) => sectionIds.includes(s.id)) || []
    if (templateSections.length === 0) return
    try { await api.post('/templates', { name: `Template ${new Date().toLocaleTimeString()}`, content: { sections: templateSections } }); setTemplatesOpen(false); toast.success('Template saved to server!', { icon: '📦' }) } catch { toast.error('Failed to save template', { icon: '⚠️', duration: 5000 }) }
  }

  const applyTemplate = async (template: any) => {
    editorUpdateData((prev) => ({ ...prev, sections: [...(prev.sections || []), ...(template.sections || []).map((s: Section) => ({ ...s, id: uid() }))] }))
    setTemplatesOpen(false)
    toast.success(`${template.name} applied!`, { icon: '✨' })
  }

  const deleteTemplate = async (templateId: string) => {
    try { await api.delete(`/templates/${templateId}`); toast.success('Template deleted') } catch { toast.error('Failed to delete template', { icon: '⚠️', duration: 5000 }) }
  }

  // Version restore
  const handleRestore = async (versionId: string) => {
    const collection = isGlobal ? 'globals' : 'pages'
    const docId = id
    editorSetSaving(true)
    try { const res = await api.post(`/versions/${collection}/${docId}/${versionId}/restore`); editorUpdateData(() => res.data.data.document); toast.success('Version restored') } catch { toast.error('Restore failed') } finally { editorSetSaving(false) }
  }

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

  // Loading state
  if (loading)
    return (
      <div className={cn('h-screen w-full flex flex-col items-center justify-center gap-8', theme === 'dark' ? 'bg-[#0B0F19]' : 'bg-[#fafafa]')}>
        <Cpu size={48} className="text-emerald-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.8em] text-gray-500 animate-pulse italic">Initializing Canvas...</p>
      </div>
    )

  return (
    <div className={cn('h-screen flex flex-col overflow-hidden transition-colors duration-500', theme === 'dark' ? 'bg-[#0B0F19] text-white' : 'bg-white text-black')}>
      {/* ── Header ── */}
      {/* ── Editor Toolbar ── */}
      <EditorToolbar
        handleSave={handleSave}
        handlePublish={handlePublish}
        handleUnpublish={handleUnpublish}
        isGlobal={isGlobal}
        onClose={onClose}
        collab={collab}
      />

      {/* ── Screen reader live region ── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="editor-live-region" />

      <EditorErrorBoundary>
      {/* ── Main Layout ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel */}
        {hasBlocksField && (
          <LeftPanel
            isGlobal={isGlobal}
            resizingSide={resizingSide}
            startResizing={startResizing}
            addBlock={addBlock}
            removeSection={removeSection}
            setInjectionIndex={setInjectionIndex}
            setBlockPickerOpen={setBlockPickerOpen}
          />
        )}

        {/* Canvas */}
        <main className={cn('flex-1 relative flex flex-col overflow-hidden transition-colors', theme === 'dark' ? 'bg-[#030303]' : 'bg-gray-50')}>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pt-6 lg:pt-10 pb-20 no-scrollbar scroll-smooth relative z-10 custom-editor-scrollbar">
            <div className="max-w-[1400px] mx-auto min-h-screen flex flex-col">
              {viewMode === 'visual' ? (
                <div className="flex-1 space-y-12">
                  {/* Document Kernel (Root Fields) */}
                  <div id="document-kernel" className={cn('space-y-6 transition-all duration-500', data?.align === 'center' && 'text-center', data?.align === 'right' && 'text-right')}>
                    <div className="flex items-center justify-between">
                      <div className={cn('flex items-center gap-0.5 p-0.5 rounded-none border', theme === 'dark' ? 'bg-white/5 border-white/[0.08]' : 'bg-gray-100 border-gray-200')}>
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button key={align} onClick={() => data && editorSetData({ ...data, align })} className={cn('p-1 transition-all', data?.align === align || (!data?.align && align === 'left') ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-emerald-500')}>
                            {align === 'left' && <AlignLeft size={12} />} {align === 'center' && <AlignCenter size={12} />} {align === 'right' && <AlignRight size={12} />}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleCollapseAll}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 text-[8px] font-black uppercase italic rounded-none border transition-all',
                          theme === 'dark'
                            ? 'border-white/[0.08] text-gray-500 hover:text-emerald-400 hover:border-emerald-500/20'
                            : 'border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-200'
                        )}
                        title="Collapse / Expand All"
                      >
                        <ChevronsUpDown size={10} />
                        Collapse All
                      </button>
                    </div>

                  </div>

                  {hasBlocksField && (
                    <>
                      <Reorder.Group axis="y" values={sectionIdsMemo} onReorder={handleReorder} className="space-y-8">
                        {data?.sections?.map((section: Section, index: number) => (
                          <ReorderableSectionBlock
                            key={section.id}
                            section={section}
                            index={index}
                            totalSections={data?.sections?.length || 0}
                            theme={theme}
                            showFieldIndicators={showFieldIndicators || false}
                            editorSelectedField={editorSelectedField}
                            editorSchemaFields={editorSchemaFields}
                            editorFieldErrors={editorFieldErrors}
                            editorActiveSection={editorActiveSection}
                            editorSetActiveSection={editorSetActiveSection}
                            duplicateSection={duplicateSection}
                            removeSection={removeSection}
                            updateAlign={updateAlign}
                            handleFieldChange={handleFieldChange}
                            setSelectedField={setSelectedField}
                            i18nEnabled={i18nEnabled}
                            currentLocale={currentLocale}
                            getTranslatedValue={getTranslatedValue}
                            setTranslatedValue={setTranslatedValue}
                            setActiveDynamicZone={setActiveDynamicZone}
                            setDynamicZoneModalOpen={setDynamicZoneModalOpen}
                            setInjectionIndex={setInjectionIndex}
                            setBlockPickerOpen={setBlockPickerOpen}
                            onOpenContextMenu={handleOpenContextMenu}
                            collab={collab}
                            broadcastCursor={collab.broadcastCursor}
                            toggleCollapse={toggleCollapse}
                            moveSection={moveSection}
                            copySection={copySection}
                            pasteSection={pasteSection}
                            handleBlockNameChange={handleBlockNameChange}
                            selectedSections={selectedSections}
                            onMultiSelect={(id, multi) => {
                              if (multi) {
                                setSelectedSections((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(id)) next.delete(id); else next.add(id)
                                  return next
                                })
                              } else {
                                editorSetActiveSection(id)
                                setSelectedSections(new Set([id]))
                              }
                            }}
                          />
                        ))}
                      </Reorder.Group>

                      {/* Add Section Button */}
                      <button onClick={() => { setInjectionIndex(null); setBlockPickerOpen(true) }} className={cn('w-full py-10 rounded-none border-2 border-dashed transition-all flex flex-col items-center gap-4 group', theme === 'dark' ? 'border-white/[0.08] hover:border-emerald-500/40 hover:bg-emerald-500/5' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50')}>
                        <div className={cn('w-12 h-12 rounded-none border-2 border-dashed flex items-center justify-center group-hover:scale-110 transition-all', theme === 'dark' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50/50')}><Plus size={22} className="text-emerald-500" /></div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] italic text-gray-500 group-hover:text-emerald-400 transition-colors">Append Section</p>
                      </button>
                    </>
                  )}

                  {topLevelFields.length > 0 && (
                      <div className={cn("border rounded-none p-10 shadow-sm relative overflow-hidden transition-colors", theme === 'dark' ? 'bg-[#0B0F19] border-white/[0.08]' : 'bg-white border-gray-100')}>
                        <div className="absolute top-0 right-0 p-10 opacity-[0.01] pointer-events-none">
                          <Terminal size={180} strokeWidth={0.5} />
                        </div>
                        <div className="relative z-10">
                          <FormBuilder
                            fields={topLevelFields}
                            initialData={data}
                            onValuesChange={(formValues) => {
                              editorUpdateData((prev) => {
                                const updates: any = {}
                                let hasChanges = false
                                topLevelFields.forEach((f: any) => {
                                  if (formValues[f.name] !== undefined) {
                                    if (JSON.stringify(prev[f.name]) !== JSON.stringify(formValues[f.name])) {
                                      updates[f.name] = formValues[f.name]
                                      hasChanges = true
                                    }
                                  }
                                })
                                if (!hasChanges) return prev // Break infinite react-hook-form loop
                                return { ...prev, ...updates }
                              })
                            }}
                            hideSubmitButton={true}
                          />
                        </div>
                      </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col pt-10">
                  <div className={cn('flex-1 p-10 font-mono text-sm overflow-auto rounded-none border', theme === 'dark' ? 'bg-[#0B0F19]/50 border-white/[0.08] text-emerald-300' : 'bg-gray-100 border-gray-200 text-emerald-900')}>
                    <pre className="no-scrollbar">{JSON.stringify(data, null, 3)}</pre>
                  </div>
                </div>
              )}

              <EditorStatusBar />
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
          onCompareDiff={(vId, vNum) => setDiffVersion({ id: vId, num: vNum })}
        />
      </div>
      </EditorErrorBoundary>

      {/* ── Modals ── */}
      <BlockPicker addBlock={addBlock} />
      <SeoModal onSave={handleSave} />
      <TemplatesModal selectedSections={selectedSections} setSelectedSections={setSelectedSections} applyTemplate={applyTemplate} deleteTemplate={deleteTemplate} saveAsTemplate={saveAsTemplate} />
      <RelationsModal />
      <MediaLibrary />
      <DynamicZoneEditor dynamicZoneModalOpen={dynamicZoneModalOpen} setDynamicZoneModalOpen={setDynamicZoneModalOpen} activeDynamicZone={activeDynamicZone} addToDynamicZone={addToDynamicZone} removeFromDynamicZone={removeFromDynamicZone} onReorder={handleDynamicZoneReorder} />
      {contextMenu && (
        <BlockContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          theme={theme}
          onClose={() => setContextMenu(null)}
          onDuplicate={() => duplicateSection(contextMenu.sectionId)}
          onDelete={() => removeSection(contextMenu.sectionId)}
          onAlign={(align) => updateAlign(contextMenu.sectionId, align)}
          onConvert={(blockType) => convertBlockType(contextMenu.sectionId, blockType)}
        />
      )}
      {diffVersion && (
        <DocumentDiffModal
          versionId={diffVersion.id}
          versionNumber={diffVersion.num}
          collection={isGlobal ? 'globals' : 'pages'}
          documentId={id || ''}
          onClose={() => setDiffVersion(null)}
          onRestoreSuccess={(restored) => {
            editorUpdateData(() => restored)
            const collectionName = isGlobal ? 'globals' : (params.slug || 'pages')
            const docIdVal = id || ''
            api.get(`/versions/${collectionName}/${docIdVal}`)
              .then((res) => setHistory(res.data.data || []))
              .catch(() => {})
          }}
        />
      )}
      <ConflictResolutionModal
        open={conflictData.open}
        onClose={() => setConflictData({ open: false })}
        onReload={handleReload}
        onForceSave={handleForceSave}
        conflictMessage={conflictData.message}
        serverVersion={conflictData.serverVersion}
        localVersion={conflictData.localVersion}
        theme={theme}
      />
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Section"
        message={`Are you sure you want to delete "${data?.sections?.find((s) => s.id === deleteConfirm.sectionId)?.title || 'this section'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmRemoveSection}
        onCancel={() => setDeleteConfirm({ open: false, sectionId: null })}
      />
    </div>
  )
}

export default SpatialEditor
