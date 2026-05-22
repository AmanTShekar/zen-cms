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


/** Debounced, diff-guarded postMessage sync to the storefront iframe. */
export function usePreviewSync<T>(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  data: T | null,
  delayMs = 300
) {
  const lastSentRef = useRef<string>('')
  const syncRef = useRef<ReturnType<typeof debounce> | null>(null)

  useEffect(() => {
    syncRef.current = debounce((payload: T) => {
      const serialized = JSON.stringify(payload)
      if (serialized === lastSentRef.current) return          // no change — skip
      lastSentRef.current = serialized

      const target = iframeRef.current?.contentWindow
      if (!target) return

      const origin = import.meta.env.VITE_STOREFRONT_URL || '*'
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