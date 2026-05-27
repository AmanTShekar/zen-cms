import { create } from 'zustand'

interface ModalState {
  templatesOpen: boolean
  mediaLibraryOpen: boolean
  seoOpen: boolean
  showLocaleDropdown: boolean
  showFieldIndicators: boolean
  relationsModalOpen: boolean
  blockPickerOpen: boolean
  /** Global component picker — can be opened from any context with a callback */
  componentPickerOpen: boolean
  componentPickerCallback: ((blockType: string) => void) | null
  componentPickerBlocks: any[] | null

  setTemplatesOpen: (open: boolean) => void
  setMediaLibraryOpen: (open: boolean) => void
  setSeoOpen: (open: boolean) => void
  setShowLocaleDropdown: (open: boolean) => void
  setShowFieldIndicators: (show: boolean) => void
  setRelationsModalOpen: (open: boolean) => void
  setBlockPickerOpen: (open: boolean) => void
  /** Open the global component picker with a callback invoked on selection */
  openComponentPicker: (callback: (blockType: string) => void, blocksOverride?: any[]) => void
  closeComponentPicker: () => void
}

const EXCLUSIVE_MODALS = [
  'templatesOpen',
  'mediaLibraryOpen',
  'seoOpen',
  'relationsModalOpen',
  'blockPickerOpen',
  'componentPickerOpen',
  'showLocaleDropdown',
] as const

function exclusiveSetter<K extends string>(key: K) {
  return (open: boolean) =>
    open
      ? {
          [key]: true,
          ...Object.fromEntries(
            EXCLUSIVE_MODALS.filter((m) => m !== key).map((m) => [m, false])
          ),
        }
      : { [key]: false }
}

export const useModalStore = create<ModalState>((set) => ({
  templatesOpen: false,
  mediaLibraryOpen: false,
  seoOpen: false,
  showLocaleDropdown: false,
  showFieldIndicators: true,
  relationsModalOpen: false,
  blockPickerOpen: false,
  componentPickerOpen: false,
  componentPickerCallback: null,
  componentPickerBlocks: null,
  setTemplatesOpen: (open) => set(exclusiveSetter('templatesOpen')(open)),
  setMediaLibraryOpen: (open) => set(exclusiveSetter('mediaLibraryOpen')(open)),
  setSeoOpen: (open) => set(exclusiveSetter('seoOpen')(open)),
  setShowLocaleDropdown: (open) => set(exclusiveSetter('showLocaleDropdown')(open)),
  setShowFieldIndicators: (showFieldIndicators) => set({ showFieldIndicators }),
  setRelationsModalOpen: (open) => set(exclusiveSetter('relationsModalOpen')(open)),
  setBlockPickerOpen: (open) => set(exclusiveSetter('blockPickerOpen')(open)),
  openComponentPicker: (callback, blocksOverride = null) =>
    set({
      componentPickerOpen: true,
      componentPickerCallback: callback,
      componentPickerBlocks: blocksOverride,
      // close exclusive modals
      templatesOpen: false,
      mediaLibraryOpen: false,
      seoOpen: false,
      relationsModalOpen: false,
      blockPickerOpen: false,
      showLocaleDropdown: false,
    }),
  closeComponentPicker: () =>
    set({ componentPickerOpen: false, componentPickerCallback: null, componentPickerBlocks: null }),
}))
