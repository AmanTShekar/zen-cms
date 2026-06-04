import { create } from 'zustand'

export type RightTab = 'preview' | 'history' | 'comments'
export type ViewMode = 'visual' | 'code'
export type PreviewMode = 'desktop' | 'tablet' | 'mobile'

interface PanelState {
 leftOpen: boolean
 rightOpen: boolean
 leftWidth: number
 rightWidth: number
 activeRightTab: RightTab
 viewMode: ViewMode
 previewMode: PreviewMode

 setLeftOpen: (open: boolean) => void
 setRightOpen: (open: boolean) => void
 setLeftWidth: (width: number) => void
 setRightWidth: (width: number) => void
 setActiveRightTab: (tab: RightTab) => void
 setViewMode: (mode: ViewMode) => void
 setPreviewMode: (mode: PreviewMode) => void
}

export const usePanelStore = create<PanelState>((set) => ({
 leftOpen: true,
 rightOpen: true,
 leftWidth: 300,
 rightWidth: 420,
 activeRightTab: 'preview',
 viewMode: 'visual',
 previewMode: 'desktop',

 setLeftOpen: (leftOpen) => set({ leftOpen }),
 setRightOpen: (rightOpen) => set({ rightOpen }),
 setLeftWidth: (leftWidth) => set({ leftWidth }),
 setRightWidth: (rightWidth) => set({ rightWidth }),
 setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
 setViewMode: (viewMode) => set({ viewMode }),
 setPreviewMode: (previewMode) => set({ previewMode }),
}))
