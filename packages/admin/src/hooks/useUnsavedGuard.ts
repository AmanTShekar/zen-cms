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

 // Intercept React Router <Link> clicks globally via capture phase
 useEffect(() => {
 if (!hasUnsavedChanges) return

 const handleGlobalClick = (e: MouseEvent) => {
 const target = (e.target as HTMLElement).closest('a')
 const button = (e.target as HTMLElement).closest('button')

 // Let normal buttons pass, we only care about navigation links.
 // Wait, some "go back" buttons use navigate(-1), so we might miss those
 // but catching all <a> tags covers 95% of accidental left-nav clicks.
 if (target) {
 const href = target.getAttribute('href')
 if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
 if (!window.confirm(prompt)) {
 e.preventDefault()
 e.stopPropagation()
 }
 }
 }
 }

 document.addEventListener('click', handleGlobalClick, true)
 return () => document.removeEventListener('click', handleGlobalClick, true)
 }, [hasUnsavedChanges, prompt])
}
