import { create } from 'zustand'

export type LeftTab = 'layers' | 'components' | 'schema' | 'api'
export type RightTab = 'preview' | 'history' | 'releases' | 'workflow'
export type ViewMode = 'visual' | 'code'
export type PreviewMode = 'desktop' | 'tablet' | 'mobile'

interface PanelState {
  // Panel dimensions and tab states
  leftOpen: boolean
  rightOpen: boolean
  leftWidth: number
  rightWidth: number
  activeLeftTab: LeftTab
  activeRightTab: RightTab
  viewMode: ViewMode
  previewMode: PreviewMode
  zoom: number

  // Modal and sidebar visibility states
  templatesOpen: boolean
  keyboardShortcutsOpen: boolean
  mediaLibraryOpen: boolean
  seoOpen: boolean
  schemaMode: boolean
  showLocaleDropdown: boolean
  showReleasesPanel: boolean
  showWorkflowPanel: boolean
  showFieldIndicators: boolean

  // Setters
  setLeftOpen: (open: boolean) => void
  setRightOpen: (open: boolean) => void
  setLeftWidth: (width: number) => void
  setRightWidth: (width: number) => void
  setActiveLeftTab: (tab: LeftTab) => void
  setActiveRightTab: (tab: RightTab) => void
  setViewMode: (mode: ViewMode) => void
  setPreviewMode: (mode: PreviewMode) => void
  setZoom: (zoom: number) => void

  setTemplatesOpen: (open: boolean) => void
  setKeyboardShortcutsOpen: (open: boolean) => void
  setMediaLibraryOpen: (open: boolean) => void
  setSeoOpen: (open: boolean) => void
  setSchemaMode: (open: boolean) => void
  setShowLocaleDropdown: (open: boolean) => void
  setShowReleasesPanel: (open: boolean) => void
  setShowWorkflowPanel: (open: boolean) => void
  setShowFieldIndicators: (show: boolean) => void
}

export const usePanelStore = create<PanelState>((set) => ({
  leftOpen: true,
  rightOpen: true,
  leftWidth: 300,
  rightWidth: 420,
  activeLeftTab: 'layers',
  activeRightTab: 'preview',
  viewMode: 'visual',
  previewMode: 'desktop',
  zoom: 100,

  templatesOpen: false,
  keyboardShortcutsOpen: false,
  mediaLibraryOpen: false,
  seoOpen: false,
  schemaMode: false,
  showLocaleDropdown: false,
  showReleasesPanel: false,
  showWorkflowPanel: false,
  showFieldIndicators: true,

  setLeftOpen: (leftOpen) => set({ leftOpen }),
  setRightOpen: (rightOpen) => set({ rightOpen }),
  setLeftWidth: (leftWidth) => set({ leftWidth }),
  setRightWidth: (rightWidth) => set({ rightWidth }),
  setActiveLeftTab: (activeLeftTab) => set({ activeLeftTab }),
  setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
  setViewMode: (viewMode) => set({ viewMode }),
  setPreviewMode: (previewMode) => set({ previewMode }),
  setZoom: (zoom) => set({ zoom }),

  setTemplatesOpen: (templatesOpen) => set({ templatesOpen }),
  setKeyboardShortcutsOpen: (keyboardShortcutsOpen) => set({ keyboardShortcutsOpen }),
  setMediaLibraryOpen: (mediaLibraryOpen) => set({ mediaLibraryOpen }),
  setSeoOpen: (seoOpen) => set({ seoOpen }),
  setSchemaMode: (schemaMode) => set({ schemaMode }),
  setShowLocaleDropdown: (showLocaleDropdown) => set({ showLocaleDropdown }),
  setShowReleasesPanel: (showReleasesPanel) => set({ showReleasesPanel }),
  setShowWorkflowPanel: (showWorkflowPanel) => set({ showWorkflowPanel }),
  setShowFieldIndicators: (showFieldIndicators) => set({ showFieldIndicators }),
}))
