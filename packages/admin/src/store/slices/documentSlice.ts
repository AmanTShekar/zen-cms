import { produce } from 'immer'
import api from '../../lib/api'
import type { EditorSliceCreator, DocumentSlice, PageData } from './types'
import { loadPersisted, deepClone, UNDO_DEBOUNCE_MS, MAX_UNDO_STACK } from './utils'

let lastUndoTime = 0
const restored = loadPersisted()

export const createDocumentSlice: EditorSliceCreator<DocumentSlice> = (set, get) => ({
  data: restored ? (restored.data as PageData) : null,
  loading: false,
  saving: false,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  undoStack: restored ? restored.undoStack : [],
  redoStack: restored ? restored.redoStack : [],
  dirtySections: new Set<string>(),

  schemaFields: [],
  fieldSettings: {},
  fieldErrors: {},
  history: [],
  templates: [],

  setData: (data) => set({ data }),
  setLoading: (loading) => set({ loading }),
  setSaving: (saving) => set({ saving }),
  setHasUnsavedChanges: (hasUnsavedChanges) => set({ hasUnsavedChanges }),
  setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
  setSchemaFields: (schemaFields) => set({ schemaFields }),
  setFieldSettings: (fieldSettings) => set({ fieldSettings }),
  setFieldErrors: (fieldErrors) => set({ fieldErrors }),
  setHistory: (history) => set({ history }),
  setTemplates: (templates) => set({ templates }),

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

    const newSections = current.sections.map((s) => {
      if (s.id !== sectionId) return s
      if (s.content[fieldKey] === value) return s
      return { ...s, content: { ...s.content, [fieldKey]: value } }
    })
    const newData = { ...current, sections: newSections }
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
    set({ data: null, loading: true, undoStack: [], redoStack: [], hasUnsavedChanges: false })
    try {
      const res = isGlobal
        ? await api.get(`/globals/${id}`)
        : await api.get(`/${slug}/${id}`)

      const normalizedSections = (res.data.data.sections || []).map(
        (s: any, idx: number) => ({
          ...s,
          id: (s.id as string) || `node_${idx + 1}`,
          content: (s.content || s.blockData) as any,
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
})
