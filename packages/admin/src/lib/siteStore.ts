import { create } from 'zustand';

interface SiteState {
  activeWorkspaceId: string | null;
  activeSiteId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveSiteId: (id: string | null) => void;
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // localStorage may be full or disabled
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const useSiteStore = create<SiteState>((set) => ({
  activeWorkspaceId: safeGetItem('activeWorkspaceId'),
  activeSiteId: safeGetItem('activeSiteId'),
  setActiveWorkspaceId: (id) => {
    if (id) {
      safeSetItem('activeWorkspaceId', id);
    } else {
      safeRemoveItem('activeWorkspaceId');
    }
    set({ activeWorkspaceId: id });
  },
  setActiveSiteId: (id) => {
    if (id) {
      safeSetItem('activeSiteId', id);
    } else {
      safeRemoveItem('activeSiteId');
    }
    set({ activeSiteId: id });
  },
}));
