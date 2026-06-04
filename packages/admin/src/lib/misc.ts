/**
 * Shared utilities for the Admin UI
 */

/**
 * Format a date string to locale-aware display format.
 */
export function formatDate(date: string | Date, locale = 'en-US'): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Format a relative time string ("2 hours ago", etc.).
 */
export function timeAgo(date: string | Date): string {
  if (!date) return '—'
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  }
  for (const [unit, secs] of Object.entries(intervals)) {
    const delta = Math.floor(seconds / secs)
    if (delta >= 1) return `${delta} ${unit}${delta === 1 ? '' : 's'} ago`
  }
  return 'just now'
}

/**
 * Convert a string to a URL-safe slug.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
  if (!str || str.length <= maxLen) return str
  return str.slice(0, maxLen) + '…'
}

/**
 * Format file size in human-readable form.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Deeply clone a value using JSON serialization (safe for plain objects).
 */
export function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val))
}

/**
 * Check if we are running in the browser.
 */
export const isBrowser = typeof window !== 'undefined'

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

/**
 * Sleep for a given number of milliseconds.
 */
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Clamp a number between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/**
 * Group an array of objects by a key getter function.
 */
export function groupBy<T>(arr: T[], getKey: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})
}
