import type { EditorSliceCreator, MediaSlice } from './types'

export const createMediaSlice: EditorSliceCreator<MediaSlice> = (set) => ({
  mediaAssets: [],
  mediaSearch: '',
  mediaTypeFilter: 'all',
  mediaLoading: false,

  setMediaAssets: (mediaAssets) => set({ mediaAssets }),
  setMediaSearch: (mediaSearch) => set({ mediaSearch }),
  setMediaTypeFilter: (mediaTypeFilter) => set({ mediaTypeFilter }),
  setMediaLoading: (mediaLoading) => set({ mediaLoading }),
})
