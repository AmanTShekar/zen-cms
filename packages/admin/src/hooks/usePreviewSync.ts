import { useEffect, useRef } from 'react'

const debounce = <T extends (...args: any[]) => void>(fn: T, ms: number) => {
  let timer: ReturnType<typeof setTimeout>
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => clearTimeout(timer)
  return debounced
}

/**
 * Fast content hash for change detection — O(sections) not O(entire document).
 * Avoids JSON.stringify which is O(n) on the full page data and blocks the main thread.
 */
function quickHash(data: any): string {
  const sections = data?.sections
  if (!sections || !Array.isArray(sections)) return ''
  // Rolling hash: combine section count + per-section content fingerprints
  let h = sections.length * 2654435761
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    // Hash section id length + content key count
    h ^= (s.id?.length || 0) + (s.content ? Object.keys(s.content).length : 0)
    h = Math.imul(h, 2654435761)
    // Sample string content lengths (cheap, no string copying)
    const content = s.content || {}
    for (const key of Object.keys(content)) {
      const v = content[key]
      if (typeof v === 'string') {
        h ^= v.length
        // Sample first 4 chars for collision resistance
        h ^= (v.charCodeAt(0) | 0) + (v.charCodeAt(1) << 8) + (v.charCodeAt(2) << 16)
      } else if (typeof v === 'number') {
        h ^= v | 0
      } else if (typeof v === 'boolean') {
        h ^= v ? 1 : 0
      }
      h = Math.imul(h, 2654435761)
    }
  }
  return String(h >>> 0)
}

/** Debounced, diff-guarded postMessage sync to the storefront iframe. */
export function usePreviewSync<T>(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  data: T | null,
  delayMs = 300
) {
  const lastHashRef = useRef<string>('')
  const syncRef = useRef<ReturnType<typeof debounce> | null>(null)

  useEffect(() => {
    syncRef.current = debounce((payload: T) => {
      const hash = quickHash(payload)
      if (hash === lastHashRef.current) return          // no change — skip
      lastHashRef.current = hash

      const target = iframeRef.current?.contentWindow
      if (!target) return

      const iframeUrl = iframeRef.current?.src
      let origin = '*'
      if (iframeUrl) {
        try {
          const urlObj = new URL(iframeUrl)
          origin = urlObj.origin
        } catch {
          // ignore
        }
      }
      target.postMessage({ type: 'ZENITH_DATA_UPDATE', data: payload }, origin)
    }, delayMs)

    return () => {
      if (syncRef.current) {
        syncRef.current.cancel()
      }
    }
  }, [delayMs, iframeRef])

  useEffect(() => {
    const sync = syncRef.current
    if (data && sync) sync(data)
  }, [data])
}