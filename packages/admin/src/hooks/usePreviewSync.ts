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
 * Content hash for change detection — samples enough of each string value
 * to catch single-character edits anywhere in the content.
 */
function quickHash(data: any): string {
 if (!data) return ''
 try {
 return JSON.stringify(data)
 } catch {
 return String(Date.now())
 }
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
 if (hash === lastHashRef.current) return // no change — skip
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

 const dataRef = useRef(data)
 useEffect(() => {
 dataRef.current = data
 }, [data])

 useEffect(() => {
 const sync = syncRef.current
 if (data && sync) sync(data)
 }, [data])

 // Attach load event listener to the iframe to send data immediately upon load
 useEffect(() => {
 const iframe = iframeRef.current
 if (!iframe) return

 const handleLoad = () => {
 lastHashRef.current = '' // Force sync
 const sync = syncRef.current
 if (sync && dataRef.current) sync(dataRef.current)
 }

 iframe.addEventListener('load', handleLoad)
 return () => iframe.removeEventListener('load', handleLoad)
 }, [iframeRef])
}
