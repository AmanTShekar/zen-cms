import { create } from 'zustand'
import { produce } from 'immer'
import api from '../lib/api'
import type { FieldDefinition } from '../pages/editor/constants'

// ── Domain types ───────────────────────────────────────────────────────────────

export interface Section {
 id: string
 blockType: string
 title: string
 content: Record<string, unknown>
 align?: 'left' | 'center' | 'right'
 blockName?: string
 collapsed?: boolean
}

export interface PageData {
 _status?: 'draft' | 'published'
 _version?: number
 title?: string
 heroDescription?: string
 sections: Section[]
 align?: 'left' | 'center' | 'right'
 meta?: Record<string, unknown>
 publishedAt?: string | null
 createdAt?: string
 updatedAt?: string
 siteId?: string
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
 lastSavedAt: string | null
 undoStack: PageData[]
 redoStack: PageData[]
 /** Set of section IDs that have been mutated since the last successful save */
 dirtySections: Set<string>

 // Active Selections
 activeSection: string | null
 selectedField: { blockId: string; fieldKey: string } | null
 selectedFieldId: string | null
 setSelectedFieldId: (id: string | null) => void

 // Schema and Configuration
 schemaFields: FieldDefinition[]
 fieldSettings: Record<string, FieldDefinition>
 fieldErrors: Record<string, string>
 history: Version[]
 templates: PageData[]

 // Relations Dialog Data
 relationsField: { sectionId: string; fieldKey: string } | null
 relationsSearch: string
 relationResults: RelationResult[]
 selectedRelations: Set<string>
 availableCollections: AvailableCollection[]

 // Media Library Data
 mediaAssets: MediaAsset[]
 mediaSearch: string
 mediaTypeFilter: string
 mediaLoading: boolean

 // Setters
 setData: (data: PageData | null) => void
 setLoading: (loading: boolean) => void
 setSaving: (saving: boolean) => void
 setHasUnsavedChanges: (val: boolean) => void
 setLastSavedAt: (val: string | null) => void
 setActiveSection: (section: string | null) => void
 setSelectedField: (field: { blockId: string; fieldKey: string } | null) => void
 setSchemaFields: (fields: FieldDefinition[]) => void
 setFieldSettings: (settings: Record<string, FieldDefinition>) => void
 setFieldErrors: (errors: Record<string, string>) => void
 setHistory: (history: Version[]) => void
 setTemplates: (templates: PageData[]) => void

 setRelationsField: (field: { sectionId: string; fieldKey: string } | null) => void
 setRelationsSearch: (search: string) => void
 setRelationResults: (results: RelationResult[]) => void
 setSelectedRelations: (relations: Set<string>) => void
 setAvailableCollections: (collections: AvailableCollection[]) => void

 setMediaAssets: (assets: MediaAsset[]) => void
 setMediaSearch: (search: string) => void
 setMediaTypeFilter: (filter: string) => void
 setMediaLoading: (loading: boolean) => void

 updateData: (updater: (prev: PageData) => PageData | void) => void
 /** Fast path: update a single field without immer/clone overhead. */
 setField: (sectionId: string, fieldKey: string, value: any) => void
 undo: () => void
 redo: () => void
 load: (slug: string, id: string, isGlobal: boolean) => Promise<PageData>
 save: (slug: string, id: string, isGlobal: boolean, getPayload: (data: PageData) => Record<string, unknown>) => Promise<void>
 /** Reset transient editor state when navigating between documents */
 reset: () => void
}

const STORAGE_KEY = 'zenith_editor_state'
const MAX_UNDO_STACK = 200
const UNDO_DEBOUNCE_MS = 1200

let lastUndoTime = 0

const loadPersisted = () => {
 try {
 const raw = localStorage.getItem(STORAGE_KEY)
 if (!raw) return null
 const parsed = JSON.parse(raw)
 if (parsed && typeof parsed === 'object') {
 const d = parsed.data || parsed
 const undoStack = Array.isArray(parsed.undoStack) ? parsed.undoStack : []
 const redoStack = Array.isArray(parsed.redoStack) ? parsed.redoStack : []
 return { data: d as PageData, undoStack: undoStack as PageData[], redoStack: redoStack as PageData[] }
 }
 } catch { /* ignore corrupt storage */ }
 return null
}

const deepClone = <T,>(obj: T): T =>
 typeof structuredClone === 'function'
 ? structuredClone(obj)
 : JSON.parse(JSON.stringify(obj))

const restored = loadPersisted()

export const useEditorStore = create<EditorState>((set, get) => ({
 data: restored ? (restored.data as PageData) : null,
 loading: false,
 saving: false,
 hasUnsavedChanges: false,
 lastSavedAt: null,
 undoStack: restored ? restored.undoStack : [],
 redoStack: restored ? restored.redoStack : [],
 dirtySections: new Set<string>(),

 activeSection: 'root',
 selectedField: null,
 selectedFieldId: null,

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

 setData: (data) => set({ data }),
 setLoading: (loading) => set({ loading }),
 setSaving: (saving) => set({ saving }),
 setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
 setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
 setActiveSection: (activeSection) => set({ activeSection }),
 setSelectedField: (selectedField) => set({ selectedField }),
 setSelectedFieldId: (selectedFieldId) => set({ selectedFieldId }),
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

 setMediaAssets: (mediaAssets) => set({ mediaAssets }),
 setMediaSearch: (mediaSearch) => set({ mediaSearch }),
 setMediaTypeFilter: (mediaTypeFilter) => set({ mediaTypeFilter }),
 setMediaLoading: (mediaLoading) => set({ mediaLoading }),

 updateData: (updater) => {
 const current = get().data
 if (!current) return
 const newData = produce(current, (draft) => {
 const result = updater(draft as PageData)
 if (result !== undefined) Object.assign(draft, result)
 })
 set((state) => {
 const now = Date.now()
 const shouldPushUndo = (now - lastUndoTime) > UNDO_DEBOUNCE_MS
 const nextUndoStack = shouldPushUndo
 ? [...state.undoStack.slice(-MAX_UNDO_STACK + 1), current]
 : state.undoStack
 if (shouldPushUndo) lastUndoTime = now
 // Mark all sections that exist in newData as potentially dirty
 const nextDirty = new Set(state.dirtySections)
 newData.sections.forEach((s) => nextDirty.add(s.id))
 return ({
 data: newData,
 hasUnsavedChanges: true,
 undoStack: nextUndoStack,
 redoStack: [],
 dirtySections: nextDirty,
 })
 })
 },

 setField: (sectionId, fieldKey, value) => {
 let current: PageData | null
 try {
 current = get().data
 } catch {
 return
 }
 if (!current) return
 const now = Date.now()
 const shouldPushUndo = (now - lastUndoTime) > UNDO_DEBOUNCE_MS
 const nextUndoStack = shouldPushUndo
 ? [...get().undoStack.slice(-MAX_UNDO_STACK + 1), deepClone(current)]
 : get().undoStack
 if (shouldPushUndo) lastUndoTime = now

 // Direct mutation-free update: shallow-copy only the changed section
 const newSections = current.sections.map((s) => {
 if (s.id !== sectionId) return s
 if (s.content[fieldKey] === value) return s
 return { ...s, content: { ...s.content, [fieldKey]: value } }
 })
 const newData = { ...current, sections: newSections }
 // Track the specific dirty section for future partial-diff payloads
 const nextDirty = new Set(get().dirtySections)
 nextDirty.add(sectionId)
 set({
 data: newData,
 hasUnsavedChanges: true,
 undoStack: nextUndoStack,
 redoStack: [],
 dirtySections: nextDirty,
 })
 },

 undo: () => {
 const { data, undoStack, redoStack } = get()
 if (!data || undoStack.length === 0) return
 const previous = undoStack[undoStack.length - 1]
 const newUndoStack = undoStack.slice(0, -1)
 const redoState = deepClone(data)
 const nextRedo = [...redoStack.slice(-MAX_UNDO_STACK + 1), redoState]
 set({
 data: previous,
 undoStack: newUndoStack,
 redoStack: nextRedo,
 hasUnsavedChanges: true,
 })
 },

 redo: () => {
 const { data, undoStack, redoStack } = get()
 if (!data || redoStack.length === 0) return
 const next = redoStack[redoStack.length - 1]
 const newRedoStack = redoStack.slice(0, -1)
 const currentState = deepClone(data)
 const nextUndo = [...undoStack.slice(-MAX_UNDO_STACK + 1), currentState]
 set({
 data: next,
 undoStack: nextUndo,
 redoStack: newRedoStack,
 hasUnsavedChanges: true,
 })
 },

 load: async (slug, id, isGlobal) => {
 set({ loading: true, undoStack: [], redoStack: [], hasUnsavedChanges: false })
 try {
 const res = isGlobal
 ? await api.get(`/globals/${id}`)
 : await api.get(`/${slug}/${id}`)

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

 save: async (slug, id, isGlobal, getPayload) => {
 const { data } = get()
 if (!data) return
 set({ saving: true })
 try {
 const payload = getPayload(data)
 const res = isGlobal
 ? await api.patch(`/globals/${id}`, payload)
 : await api.patch(`/${slug}/${id}`, payload)
 // Sync version from server response for optimistic locking
 const serverVersion = res.data?.data?._version
 if (serverVersion !== undefined) {
 set({ data: { ...data, _version: serverVersion }, hasUnsavedChanges: false, dirtySections: new Set<string>() })
 } else {
 set({ hasUnsavedChanges: false, dirtySections: new Set<string>() })
 }
 } finally {
 set({ saving: false })
 }
 },

 reset: () => {
 // Clear persisted state for previous document
 try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
 set({
 data: null,
 loading: false,
 saving: false,
 hasUnsavedChanges: false,
 lastSavedAt: null,
 undoStack: [],
 redoStack: [],
 dirtySections: new Set<string>(),
 activeSection: 'root',
 selectedField: null,
 fieldErrors: {},
 relationsField: null,
 relationsSearch: '',
 relationResults: [],
 selectedRelations: new Set<string>(),
 mediaAssets: [],
 mediaSearch: '',
 mediaTypeFilter: 'all',
 mediaLoading: false,
 })
 },
}))
