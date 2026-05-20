/**
 * Zenith CMS — Shared Utility Library
 * ─────────────────────────────────────
 * A unified utils module inspired by Payload's utilities directory.
 * All utilities are pure functions — no side effects, fully testable.
 */

// ── String Utilities ────────────────────────────────────────────────────────
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function truncate(str: string, length = 100): string {
  return str.length > length ? `${str.substring(0, length)}...` : str
}

// ── Object Utilities ─────────────────────────────────────────────────────────
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result: any = { ...target }
  const src: any = source
  for (const key in src) {
    if (src[key] instanceof Object && !Array.isArray(src[key])) {
      result[key] = deepMerge(result[key] || {}, src[key])
    } else {
      result[key] = src[key]
    }
  }
  return result as T
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  keys.forEach((k) => delete result[k])
  return result
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {} as Pick<T, K>)
}

export function removeUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

// ── Array Utilities ──────────────────────────────────────────────────────────
export function uniqueBy<T>(arr: T[], key: keyof T): T[] {
  const seen = new Set()
  return arr.filter((item) => {
    const val = item[key]
    if (seen.has(val)) return false
    seen.add(val)
    return true
  })
}

export function mapAsync<T, R>(arr: T[], fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  return Promise.all(arr.map(fn))
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// ── Validation Utilities ─────────────────────────────────────────────────────
export function isEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidMongoId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

// ── Date Utilities ───────────────────────────────────────────────────────────
export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

export function isPast(date: Date): boolean {
  return date < new Date()
}

// ── Wait ─────────────────────────────────────────────────────────────────────
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ── HTML Sanitizer ───────────────────────────────────────────────────────────
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') return html

  let clean = html

  // 1. Remove dangerous tags completely
  const tagsToBlock = ['script', 'iframe', 'object', 'embed', 'link', 'style', 'meta', 'base']
  tagsToBlock.forEach((tag) => {
    const tagRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>|<${tag}[^>]*\\/?>`, 'gi')
    clean = clean.replace(tagRegex, '')
  })

  // 2. Strip event handlers (onxyz=...)
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '')

  // 3. Strip javascript: URIs
  clean = clean.replace(
    /href\s*=\s*(["']\s*javascript:[^"']*["']|\s*javascript:[^\s>]*)/gi,
    'href="#"'
  )
  clean = clean.replace(
    /src\s*=\s*(["']\s*javascript:[^"']*["']|\s*javascript:[^\s>]*)/gi,
    'src=""'
  )

  return clean
}
