import type { PageData } from './types'

export const STORAGE_KEY = 'zenith_editor_state'
export const MAX_UNDO_STACK = 200
export const UNDO_DEBOUNCE_MS = 1200

export const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const d = parsed.data || parsed
      const undoStack = Array.isArray(parsed.undoStack) ? parsed.undoStack : []
      const redoStack = Array.isArray(parsed.redoStack) ? parsed.redoStack : []
      return { data: d as PageData, undoStack: undoStack as PageData[], redoStack: redoStack as PageData[] }
    }
  } catch { /* ignore corrupt storage */ }
  return null
}

export const deepClone = <T,>(obj: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj))
