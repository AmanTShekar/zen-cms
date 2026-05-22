import { create } from 'zustand';


interface SiteState {
  activeSiteId: string | null;
  setActiveSiteId: (id: string | null) => void;
}

export const useSiteStore = create<SiteState>((set) => ({
  activeSiteId: null,
  setActiveSiteId: (id) => set({ activeSiteId: id }),
}));
