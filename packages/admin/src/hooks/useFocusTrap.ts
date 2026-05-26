import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  onEscape?: () => void
  containerRef?: React.RefObject<HTMLElement | null>
}

/**
 * Traps keyboard focus within a container element while active.
 * - Restores focus to the element that had focus before activation.
 * - Cycles Tab/Shift+Tab within the container.
 * - Calls onEscape when Escape is pressed.
 *
 * @param isActive - When true, focus trap is enabled.
 * @param options - Optional callbacks and container ref.
 */
export const useFocusTrap = (isActive: boolean, options: UseFocusTrapOptions = {}) => {
  const { onEscape, containerRef } = options
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the currently focused element before we move focus
    previousFocusRef.current = document.activeElement as HTMLElement

    const container = containerRef?.current || document.body

    // Selectors for all focusable elements
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    const getFocusableElements = () => {
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
        (el) => {
          // Ensure element is visible and not disabled/inert
          const style = window.getComputedStyle(el)
          const isVisible = style.visibility !== 'hidden' && style.display !== 'none' && el.offsetParent !== null
          return isVisible && !el.hasAttribute('disabled') && !el.hasAttribute('inert')
        }
      )
    }

    const focusableElements = getFocusableElements()

    // If there are focusable elements, focus the first one
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape()
        return
      }

      if (e.key === 'Tab') {
        if (focusableElements.length === 0) return

        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus to the element that was focused before activation
      if (previousFocusRef.current) {
        previousFocusRef.current.focus()
      }
    }
  }, [isActive, onEscape, containerRef])
}
