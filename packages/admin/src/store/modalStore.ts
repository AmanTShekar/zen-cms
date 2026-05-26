import { create } from 'zustand'

interface ModalState {
  templatesOpen: boolean
  mediaLibraryOpen: boolean
  seoOpen: boolean
  showLocaleDropdown: boolean
  showFieldIndicators: boolean
  relationsModalOpen: boolean
  blockPickerOpen: boolean

  setTemplatesOpen: (open: boolean) => void
  setMediaLibraryOpen: (open: boolean) => void
  setSeoOpen: (open: boolean) => void
  setShowLocaleDropdown: (open: boolean) => void
  setShowFieldIndicators: (show: boolean) => void
  setRelationsModalOpen: (open: boolean) => void
  setBlockPickerOpen: (open: boolean) => void
}

const EXCLUSIVE_MODALS = [
  'templatesOpen',
  'mediaLibraryOpen',
  'seoOpen',
  'relationsModalOpen',
  'blockPickerOpen',
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
  setTemplatesOpen: (open) => set(exclusiveSetter('templatesOpen')(open)),
  setMediaLibraryOpen: (open) => set(exclusiveSetter('mediaLibraryOpen')(open)),
  setSeoOpen: (open) => set(exclusiveSetter('seoOpen')(open)),
  setShowLocaleDropdown: (open) => set(exclusiveSetter('showLocaleDropdown')(open)),
  setShowFieldIndicators: (showFieldIndicators) => set({ showFieldIndicators }),
  setRelationsModalOpen: (open) => set(exclusiveSetter('relationsModalOpen')(open)),
  setBlockPickerOpen: (open) => set(exclusiveSetter('blockPickerOpen')(open)),
}))
