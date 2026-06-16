import type { EditorSliceCreator, UiSlice } from './types'

export const createUiSlice: EditorSliceCreator<UiSlice> = (set) => ({
  activeSection: 'root',
  selectedField: null,
  selectedFieldId: null,

  setActiveSection: (activeSection) => set({ activeSection }),
  setSelectedField: (selectedField) => set({ selectedField }),
  setSelectedFieldId: (selectedFieldId) => set({ selectedFieldId }),
})
