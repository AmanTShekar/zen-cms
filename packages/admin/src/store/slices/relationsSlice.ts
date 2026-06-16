import type { EditorSliceCreator, RelationsSlice } from './types'

export const createRelationsSlice: EditorSliceCreator<RelationsSlice> = (set) => ({
  relationsField: null,
  relationsSearch: '',
  relationResults: [],
  selectedRelations: new Set<string>(),
  availableCollections: [],

  setRelationsField: (relationsField) => set({ relationsField }),
  setRelationsSearch: (relationsSearch) => set({ relationsSearch }),
  setRelationResults: (relationResults) => set({ relationResults }),
  setSelectedRelations: (selectedRelations) => set({ selectedRelations }),
  setAvailableCollections: (availableCollections) => set({ availableCollections }),
})
