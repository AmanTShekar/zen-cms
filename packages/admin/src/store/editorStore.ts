import { create } from 'zustand'
import { produce } from 'immer'
import api from '../lib/api'

// ── Domain types ───────────────────────────────────────────────────────────────

export interface Section {
  id: string
  blockType: string
  title: string
  content: Record<string, unknown>
  align?: 'left' | 'center' | 'right'
}

export interface PageData {
  _status?: 'draft' | 'published'
  title?: string
  heroDescription?: string
  sections: Section[]
  align?: 'left' | 'center' | 'right'
  meta?: Record<string, unknown>
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface MediaAsset {
  _id: string
  url: string
  name: string
  alt?: string
  mimetype?: string
  size?: number
}

export interface RelationResult {
  _id: string
  title?: string
  name?: string
  [key: string]: unknown
}

export interface AvailableCollection {
  slug: string
  label: string
  singularName: string
}

export interface Version {
  id: string
  _id: string
  createdAt: string
  changeLog?: string
  document: PageData
}

// ── Store state interface ─────────────────────────────────────────────────────

interface EditorState {
  // Document Core State
  data: PageData | null
  loading: boolean
  saving: boolean
  hasUnsavedChanges: boolean
  undoStack: PageData[]
  redoStack: PageData[]

  // Active Selections
  activeSection: string
  selectedField: { blockId: string; fieldKey: string } | null

  // Schema and Configuration
  schemaFields: any[]
  fieldSettings: Record<string, any>
  fieldErrors: Record<string, string>
  history: Version[]
  templates: any[]

  // Relations Dialog State
  relationsField: { sectionId: string; fieldKey: string } | null
  relationsSearch: string
  relationResults: RelationResult[]
  selectedRelations: Set<string>
  availableCollections: AvailableCollection[]
  relationsModalOpen: boolean

  // Media Library State
  mediaAssets: MediaAsset[]
  mediaSearch: string
  mediaTypeFilter: string
  mediaLoading: boolean
  mediaLibraryOpen: boolean
  blockPickerOpen: boolean

  // Setters
  setData: (data: PageData | null) => void
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  setHasUnsavedChanges: (val: boolean) => void
  setActiveSection: (section: string) => void
  setSelectedField: (field: { blockId: string; fieldKey: string } | null) => void
  setSchemaFields: (fields: any[]) => void
  setFieldSettings: (settings: Record<string, any>) => void
  setFieldErrors: (errors: Record<string, string>) => void
  setHistory: (history: Version[]) => void
  setTemplates: (templates: any[]) => void

  setRelationsField: (field: { sectionId: string; fieldKey: string } | null) => void
  setRelationsSearch: (search: string) => void
  setRelationResults: (results: RelationResult[]) => void
  setSelectedRelations: (relations: Set<string>) => void
  setAvailableCollections: (collections: AvailableCollection[]) => void
  setRelationsModalOpen: (open: boolean) => void

  setMediaAssets: (assets: MediaAsset[]) => void
  setMediaSearch: (search: string) => void
  setMediaTypeFilter: (filter: string) => void
  setMediaLoading: (loading: boolean) => void
  setMediaLibraryOpen: (open: boolean) => void

  setBlockPickerOpen: (open: boolean) => void
  updateData: (updater: (prev: PageData) => PageData) => void
  undo: () => void
  redo: () => void
  load: (id: string, isGlobal: boolean) => Promise<PageData>
  save: (id: string, isGlobal: boolean, getPayload: (data: PageData) => Record<string, unknown>) => Promise<void>
}

const MAX_UNDO_STACK = 50

const deepClone = <T>(obj: T): T => produce(obj, (draft: T) => { void draft })

export const useEditorStore = create<EditorState>((set, get) => ({
  data: null,
  loading: false,
  saving: false,
  hasUnsavedChanges: false,
  undoStack: [],
  redoStack: [],

  activeSection: 'root',
  selectedField: null,

  schemaFields: [],
  fieldSettings: {},
  fieldErrors: {},
  history: [],
  templates: [],

  relationsField: null,
  relationsSearch: '',
  relationResults: [],
  selectedRelations: new Set<string>(),
  availableCollections: [],

  mediaAssets: [],
  mediaSearch: '',
  mediaTypeFilter: 'all',
  mediaLoading: false,
  blockPickerOpen: false,
  relationsModalOpen: false,
  mediaLibraryOpen: false,

  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setSaving: (saving) => set({ saving }),
  setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
  setActiveSection: (activeSection) => set({ activeSection }),
  setSelectedField: (selectedField) => set({ selectedField }),
  setSchemaFields: (schemaFields) => set({ schemaFields }),
  setFieldSettings: (fieldSettings) => set({ fieldSettings }),
  setFieldErrors: (fieldErrors) => set({ fieldErrors }),
  setHistory: (history) => set({ history }),
  setTemplates: (templates) => set({ templates }),

  setRelationsField: (relationsField) => set({ relationsField }),
  setRelationsSearch: (relationsSearch) => set({ relationsSearch }),
  setRelationResults: (relationResults) => set({ relationResults }),
  setSelectedRelations: (selectedRelations) => set({ selectedRelations }),
  setAvailableCollections: (availableCollections) => set({ availableCollections }),
  setRelationsModalOpen: (open) => set({ relationsModalOpen: open }),

  setMediaAssets: (mediaAssets) => set({ mediaAssets }),
  setMediaSearch: (mediaSearch) => set({ mediaSearch }),
  setMediaTypeFilter: (mediaTypeFilter) => set({ mediaTypeFilter }),
  setMediaLoading: (mediaLoading) => set({ mediaLoading }),
  setMediaLibraryOpen: (open) => set({ mediaLibraryOpen: open }),
  setBlockPickerOpen: (open) => set({ blockPickerOpen: open }),

  updateData: (updater) => {
    const current = get().data
    if (!current) return
    const previousState = deepClone(current)
    const newData = produce(current, (draft) => {
      const updated = updater(draft as PageData)
      Object.assign(draft, updated)
    })
    set((state) => ({
      data: newData,
      hasUnsavedChanges: true,
      undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), previousState],
      redoStack: [],
    }))
  },

  undo: () => {
    const { data, undoStack, redoStack } = get()
    if (!data || undoStack.length === 0) return
    const previous = undoStack[undoStack.length - 1]
    const newUndoStack = undoStack.slice(0, -1)
    const redoState = deepClone(data)
    set({
      data: previous,
      undoStack: newUndoStack,
      redoStack: [...redoStack.slice(-MAX_UNDO_STACK + 1), redoState],
      hasUnsavedChanges: true,
    })
  },

  redo: () => {
    const { data, undoStack, redoStack } = get()
    if (!data || redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    const newRedoStack = redoStack.slice(0, -1)
    const currentState = deepClone(data)
    set({
      data: next,
      undoStack: [...undoStack.slice(-MAX_UNDO_STACK + 1), currentState],
      redoStack: newRedoStack,
      hasUnsavedChanges: true,
    })
  },

  load: async (id, isGlobal) => {
    set({ loading: true, undoStack: [], redoStack: [], hasUnsavedChanges: false })
    try {
      const res = isGlobal
        ? await api.get(`/globals/landing-page`)
        : await api.get(`/pages/${id}`)

      const normalizedSections = (res.data.data.sections || []).map(
        (s: Record<string, unknown>, idx: number) => ({
          ...s,
          id: (s.id as string) || `node_${idx + 1}`,
          content: (s.content || s.blockData) as Record<string, unknown>,
        })
      )

      const pageData: PageData = { ...res.data.data, sections: normalizedSections }
      set({ data: pageData, activeSection: 'root' })
      return pageData
    } finally {
      set({ loading: false })
    }
  },

  save: async (id, isGlobal, getPayload) => {
    const { data } = get()
    if (!data) return
    set({ saving: true })
    try {
      const payload = getPayload(data)
      if (isGlobal) {
        await api.patch(`/globals/landing-page`, payload)
      } else {
        await api.patch(`/pages/${id}`, payload)
      }
      set({ hasUnsavedChanges: false })
    } finally {
      set({ saving: false })
    }
  },
}))