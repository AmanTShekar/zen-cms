import { useCallback, useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editorStore'

/** Default debounce window for auto-save triggers */
const DEFAULT_DEBOUNCE_MS = 500

/**
 * useDebouncedSave
 *
 * Wraps `editorStore.save()` with:
 * 1. A configurable debounce so rapid field edits collapse into one PATCH.
 * 2. A `flush()` method for the toolbar's manual Save button (fires immediately,
 * cancels the pending debounced timer).
 *
 * Usage:
 * const { trigger, flush, isPending } = useDebouncedSave(id, isGlobal, getPayload)
 *
 * // Auto-save on data change — call `trigger()` inside an effect watching `data`.
 * // Manual save — call `flush()` from the Save button onClick.
 */
export function useDebouncedSave(
 slug: string,
 id: string,
 isGlobal: boolean,
 getPayload: (data: import('../store/editorStore').PageData) => any,
 debounceMs = DEFAULT_DEBOUNCE_MS
) {
 const save = useEditorStore((s) => s.save)
 const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges)

 const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
 const isPendingRef = useRef(false)

 /** Cancel any scheduled save */
 const cancel = useCallback(() => {
 if (timerRef.current !== null) {
 clearTimeout(timerRef.current)
 timerRef.current = null
 isPendingRef.current = false
 }
 }, [])

 /** Fire the save immediately and cancel any pending timer */
 const flush = useCallback(async () => {
 cancel()
 await save(slug, id, isGlobal, getPayload)
 }, [cancel, save, slug, id, isGlobal, getPayload])

 /**
 * Schedule a debounced save.
 * Calling this multiple times within `debounceMs` resets the timer.
 */
 const trigger = useCallback(() => {
 if (!hasUnsavedChanges) return
 cancel()
 isPendingRef.current = true
 timerRef.current = setTimeout(async () => {
 isPendingRef.current = false
 await save(slug, id, isGlobal, getPayload)
 }, debounceMs)
 }, [hasUnsavedChanges, cancel, save, slug, id, isGlobal, getPayload, debounceMs])

 /** Flush on unmount to avoid losing changes when navigating away */
 useEffect(() => {
 return () => {
 if (isPendingRef.current) {
 cancel()
 // Fire synchronously on unmount — best-effort
 save(slug, id, isGlobal, getPayload).catch(() => { /* ignore unmount-flush errors */ })
 }
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [id, isGlobal])

 return { trigger, flush, cancel, get isPending() { return isPendingRef.current } }
}
