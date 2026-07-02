import { useEffect, useRef, useCallback, useState } from 'react'
import { usePanelStore } from '../../../store/panelStore'

export function useSpatialSync({
  iframeRef,
  theme,
  editorActiveSection,
  editorSetActiveSection,
  setSelectedSections,
  setBlockPickerOpen,
  setSeoOpen,
  setTemplatesOpen,
  handleSave,
  handleUndo,
  handleRedo,
  duplicateSection,
  removeSection,
  selectedSections,
}: any) {
  // --- Resize handlers ---
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null)
  
  const startResizing = useCallback((side: 'left' | 'right') => () => setResizingSide(side), [])
  const stopResizing = useCallback(() => setResizingSide(null), [])
  const resize = useCallback((e: MouseEvent) => {
    if (resizingSide === 'left') { 
      const w = e.clientX; 
      if (w >= 200 && w <= 500) usePanelStore.getState().setLeftWidth(w) 
    } else if (resizingSide === 'right') { 
      const w = window.innerWidth - e.clientX; 
      if (w >= 200 && w <= 700) usePanelStore.getState().setRightWidth(w) 
    }
  }, [resizingSide])

  useEffect(() => {
    if (resizingSide) { 
      window.addEventListener('mousemove', resize); 
      window.addEventListener('mouseup', stopResizing) 
    }
    return () => { 
      window.removeEventListener('mousemove', resize); 
      window.removeEventListener('mouseup', stopResizing) 
    }
  }, [resizingSide, resize, stopResizing])

  // --- Preview sync effects ---
  useEffect(() => { 
    if (iframeRef.current?.contentWindow) {
      // Intentionally removed SET_THEME sync so the preview maintains its own theme.
    }
  }, [theme, iframeRef])

  useEffect(() => { 
    if (iframeRef.current?.contentWindow && editorActiveSection) {
      iframeRef.current.contentWindow.postMessage({ type: 'ZENITH_PARENT_SELECT', sectionId: editorActiveSection, id: editorActiveSection }, '*') 
    }
  }, [editorActiveSection, iframeRef])
  
  // Auto-scroll to top-level fields when focused
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      // Rich text editors might use data-field or data-name, inputs use name
      const name = target.getAttribute('name') || target.getAttribute('data-field') || target.closest('[data-field]')?.getAttribute('data-field')
      if (name && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'ZENITH_PARENT_SELECT', id: name }, '*')
      }
    }
    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [iframeRef])

  // iframe message handler — versioned protocol with type guard + cleanup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our storefront origin (or '*' in dev)
      const expectedOrigin = import.meta.env.VITE_STOREFRONT_URL || window.location.origin
      if (expectedOrigin !== '*' && event.origin !== expectedOrigin && event.origin !== window.location.origin) return
      // Versioned protocol guard
      switch (event.data?.type) {
        case 'ZENITH_IFRAME_READY':
          if (editorActiveSection) {
            iframeRef.current?.contentWindow?.postMessage({ type: 'ZENITH_PARENT_SELECT', sectionId: editorActiveSection, id: editorActiveSection }, '*')
          }
          break
        case 'ZENITH_SECTION_SELECT': {
          const sectionId = event.data.sectionId || event.data.id
          if (sectionId) { 
            editorSetActiveSection(sectionId); 
            setSelectedSections(new Set([sectionId])) 
          }
          break
        }
        default:
          break
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [editorSetActiveSection, setSelectedSections, iframeRef, editorActiveSection])

  // --- Keyboard shortcuts ---
  const keyboardStateRef = useRef({ editorActiveSection, selectedSections })
  useEffect(() => {
    keyboardStateRef.current = { editorActiveSection, selectedSections }
  }, [editorActiveSection, selectedSections])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when typing in inputs
      const tagName = (e.target as any)?.tagName
      const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || (e.target as any)?.isContentEditable

      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.key === 's') { e.preventDefault(); handleSave(); return }
      if (isMeta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return }
      if (isMeta && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) { e.preventDefault(); handleRedo(); return }
      if (isMeta && e.key === '\\') { e.preventDefault(); const p = usePanelStore.getState(); p.setLeftOpen(!p.leftOpen); return }
      if (isMeta && e.key === 'p') { e.preventDefault(); const p = usePanelStore.getState(); p.setRightOpen(!p.rightOpen); return }

      if (isInput) return

      const { editorActiveSection: activeSec, selectedSections: selSecs } = keyboardStateRef.current
      if (isMeta && e.key === 'd' && activeSec && activeSec !== 'root') { e.preventDefault(); duplicateSection(activeSec); return }
      if ((e.key === 'Backspace' || e.key === 'Delete') && selSecs.size > 0) { 
        e.preventDefault(); 
        selSecs.forEach((sectionId) => removeSection(sectionId)); 
        setSelectedSections(new Set()); 
        return 
      }
      if (e.key === 'Escape') { 
        setSelectedSections(new Set()); 
        editorSetActiveSection(null); 
        setBlockPickerOpen(false); 
        setSeoOpen(false); 
        setTemplatesOpen(false); 
        return 
      }
      if (e.key === '/') { setBlockPickerOpen(true) }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleUndo, handleRedo, duplicateSection, removeSection, setSelectedSections, editorSetActiveSection, setBlockPickerOpen, setSeoOpen, setTemplatesOpen])

  return {
    resizingSide,
    startResizing
  }
}
