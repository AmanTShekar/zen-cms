import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility for merging Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

/**
 * Generate a stable unique ID. Uses crypto.randomUUID() with a safe fallback
 * for non-HTTPS contexts where the API throws a DOMException.
 */
export function uid(): string {
 if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
 try {
 return crypto.randomUUID()
 } catch {
 // Fallback for non-secure contexts (http, localhost without HTTPS)
 }
 }
 return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
