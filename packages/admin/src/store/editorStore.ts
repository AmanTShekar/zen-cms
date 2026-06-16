import { create } from 'zustand'
import type { EditorState } from './slices/types'
import { createDocumentSlice } from './slices/documentSlice'
import { createUiSlice } from './slices/uiSlice'
import { createMediaSlice } from './slices/mediaSlice'
import { createRelationsSlice } from './slices/relationsSlice'
import { STORAGE_KEY } from './slices/utils'

// Re-export all domain types for compatibility
export * from './slices/types'

export const useEditorStore = create<EditorState>((set, get, api) => ({
  ...createDocumentSlice(set, get, api),
  ...createUiSlice(set, get, api),
  ...createMediaSlice(set, get, api),
  ...createRelationsSlice(set, get, api),

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
