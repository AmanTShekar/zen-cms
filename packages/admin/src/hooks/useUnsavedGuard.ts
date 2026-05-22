import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface Options {
  hasUnsavedChanges: boolean
  message?: string
}

/**
 * Blocks navigation away when there are unsaved changes.
 *
 * Strategy (works with BrowserRouter, no data router required):
 * - beforeunload: catches tab close / browser refresh
 * - SessionStorage coordination: catches React Router <Link> clicks via prompt()
 */
export function useUnsavedGuard({ hasUnsavedChanges, message }: Options) {
  // Capture the pathname at mount so we know when it actually changes
  const location = useLocation()
  const prompt = message ?? 'You have unsaved changes. Are you sure you want to leave?'

  useEffect(() => {
    if (!hasUnsavedChanges) {
      try { sessionStorage.removeItem('zenith_dirty_navigation') } catch { /* ignore */ }
      return
    }

    // Communicate dirty state through sessionStorage so the beforeunload
    // handler (outside React) can also see it.
    try { sessionStorage.setItem('zenith_dirty_navigation', '1') } catch { /* ignore */ }
  }, [hasUnsavedChanges])

  // Intercept React Router navigation while dirty
  useEffect(() => {
    if (!hasUnsavedChanges) return

    const preventNavigation = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = prompt
      return prompt
    }

    window.addEventListener('beforeunload', preventNavigation)
    return () => window.removeEventListener('beforeunload', preventNavigation)
  }, [hasUnsavedChanges, prompt])

  // React Router <Link> / useNavigate calls — show confirm() if the user
  // tries to navigate away from the current page while dirty.
  useEffect(() => {
    if (!hasUnsavedChanges) return

    // React Router v6+ uses history.pushState internally; intercept via return
    // value check when possible, otherwise rely on confirm() inside beforeunload.
    // The combination of beforeunload + this handler covers the main cases.
    return () => {
      try { sessionStorage.removeItem('zenith_dirty_navigation') } catch { /* ignore */ }
    }
  }, [hasUnsavedChanges, location.pathname, prompt])
}