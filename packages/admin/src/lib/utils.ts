import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility for merging Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
}

/**
 * Extracts purely text strings from a nested JSON structure (e.g. Zenith blocks)
 * Ideal for passing document content to AI APIs.
 */
export function extractTextFromBlocks(content: any): string {
 if (!content) return ''
 if (typeof content === 'string') return content
 if (Array.isArray(content)) {
 return content.map(extractTextFromBlocks).filter(Boolean).join(' ')
 }
 if (typeof content === 'object') {
 return Object.values(content).map(extractTextFromBlocks).filter(Boolean).join(' ')
 }
 return String(content)
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
