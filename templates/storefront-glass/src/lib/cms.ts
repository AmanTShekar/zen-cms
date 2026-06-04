import { createClient, type ZenithClient as ZenithClientType } from '@zenithcms/sdk'

/**
 * Zenith CMS Client — Storefront Glass
 * ─────────────────────────────────────
 * Environment variables (.env):
 *   VITE_CMS_URL      — full CMS URL for PRODUCTION (e.g. https://api.yoursite.com)
 *                       Leave blank in dev — Vite proxy forwards /api → localhost:3000
 *   VITE_CMS_API_KEY  — API key from Zenith Admin → Settings → API Keys
 *   VITE_CMS_SITE_ID  — Site ID from Zenith Admin → Sites → click your site → copy ID
 *
 * HOW TO GET YOUR SITE ID:
 *   1. Open Zenith Admin (localhost:5175)
 *   2. Log in and select or create a site
 *   3. Go to Settings → General — the Site ID is shown in the header
 *   OR: the URL ?siteId= param is set automatically when the admin previews this template
 */

// In dev mode, use relative URL ('') so Vite's proxy forwards /api/v1/... to localhost:3000.
// In production, use VITE_CMS_URL (the full backend URL).
const isDev = import.meta.env.DEV
const CMS_URL = isDev ? '' : ((import.meta.env.VITE_CMS_URL as string) || 'http://localhost:3000')
const CMS_API_KEY = import.meta.env.VITE_CMS_API_KEY as string || ''

// siteId priority: ?siteId= URL param → VITE_CMS_SITE_ID env → ''
function getActiveSiteId(): string {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('siteId') || (import.meta.env.VITE_CMS_SITE_ID as string) || ''
  } catch {
    return (import.meta.env.VITE_CMS_SITE_ID as string) || ''
  }
}

export const cms = createClient({
  url: CMS_URL,
  apiKey: CMS_API_KEY,
  siteId: getActiveSiteId(),
})

/** Call this when the admin sends a postMessage({ type: 'UPDATE_SITE_ID', siteId }) */
export function refreshSiteId(newSiteId: string) {
  if (newSiteId && newSiteId !== cms['siteId']) {
    cms.setSiteId(newSiteId)
  }
}


// ── Collection Slug Config ──────────────────────────────────────────────────
// Update these to match your Zenith CMS collection slugs.
// Find them in Zenith Admin → Collections → {Collection Name} → General → Slug

export const COLLECTION = {
  POSTS: 'posts',
  PAGES: 'pages',
  AUTHORS: 'authors',
  CATEGORIES: 'categories',
  TAGS: 'tags',
} as const

// ── Type-safe Content Fetchers ─────────────────────────────────────────────

export interface FetchOptions extends RequestInit {
  /** Request locale (optional) */
  locale?: string
  /** Depth of nested populates (optional) */
  depth?: number
  /** Include drafts (optional) — set to true for preview mode */
  drafts?: boolean
}

export interface FindOptions extends FetchOptions {
  /** Filter conditions as flat key-value pairs */
  where?: Record<string, unknown>
  /** Sort field — prefix with `-` for descending (e.g. `-publishedAt`) */
  sort?: string
  /** Max documents to return */
  limit?: number
  /** Page number for pagination */
  page?: number
}

export interface Post {
  _id?: string
  id?: string
  title: string
  slug?: string
  content?: string
  excerpt?: string
  excerptPlain?: string
  coverImage?: string | { url: string; alt?: string }
  tags?: string[]
  categories?: string[]
  author?: Author
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
  status?: 'draft' | 'published'
}

export interface Author {
  _id?: string
  id?: string
  name: string
  bio?: string
  avatar?: string
  role?: string
}

export interface GlobalConfig {
  siteName?: string
  tagline?: string
  description?: string
  logo?: string
  socialLinks?: Record<string, string>
  footerText?: string
  headerLinks?: { label: string; url: string }[]
  footerLinks?: { label: string; url: string }[]
}

/**
 * Fetch all published posts, sorted by newest first.
 */
export async function getPosts(options: FindOptions = {}) {
  const result = await cms.find<Post>(COLLECTION.POSTS, {
    where: { status: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 12,
    ...options,
  })
  return result.docs
}

/**
 * Fetch a single post by ID or slug.
 */
export async function getPost(idOrSlug: string, by: 'id' | 'slug' = 'id') {
  if (by === 'slug') {
    const results = await cms.find<Post>(COLLECTION.POSTS, {
      where: { slug: { equals: idOrSlug } },
      limit: 1,
    })
    return results.docs[0] || null
  }
  return cms.findById<Post>(COLLECTION.POSTS, idOrSlug)
}

/**
 * Fetch a single page by ID or slug.
 */
export async function getPage(idOrSlug: string, by: 'id' | 'slug' = 'id') {
  try {
    if (by === 'slug') {
      const results = await cms.find<any>(COLLECTION.PAGES, {
        where: { slug: { equals: idOrSlug } },
        limit: 1,
      })
      return results.docs[0] || null
    }
    return await cms.findById<any>(COLLECTION.PAGES, idOrSlug)
  } catch (err) {
    console.error('[cms] Failed to fetch page:', err)
    return null
  }
}

/**
 * Fetch site-wide globals/singletons.
 * Returns null by default — override to match your CMS's settings collection.
 */
export async function getGlobals(slug = 'site-config'): Promise<GlobalConfig | null> {
  try {
    return await cms.findGlobal<GlobalConfig>(slug)
  } catch (err) {
    console.error('Failed to fetch globals:', err)
    return null
  }
}

/**
 * Fetch a single author by ID.
 */
export async function getAuthor(id: string): Promise<Author | null> {
  try {
    return await cms.findById<Author>(COLLECTION.AUTHORS, id)
  } catch {
    return null
  }
}

/**
 * Strip HTML tags from a string — used for plain-text excerpts.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Format a date string into a readable long format.
 */
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export type { ZenithClientType as ZenithClient }
export function parseLexicalToHTML(jsonStr: string | object): string {
  try {
    const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
    if (!data.root) return typeof jsonStr === 'string' ? jsonStr : JSON.stringify(jsonStr)

    function renderNode(node: any): string {
      if (node.type === 'text') {
        let text = node.text || ''
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        if (node.format & 1) text = `<strong>${text}</strong>`
        if (node.format & 2) text = `<em>${text}</em>`
        if (node.format & 8) text = `<u>${text}</u>`
        return text
      }
      if (node.type === 'paragraph') {
        return `<p>${(node.children || []).map(renderNode).join('')}</p>`
      }
      if (node.type === 'heading') {
        const tag = node.tag || 'h2'
        return `<${tag}>${(node.children || []).map(renderNode).join('')}</${tag}>`
      }
      if (node.type === 'list') {
        const tag = node.listType === 'number' ? 'ol' : 'ul'
        return `<${tag}>${(node.children || []).map(renderNode).join('')}</${tag}>`
      }
      if (node.type === 'listitem') {
        return `<li>${(node.children || []).map(renderNode).join('')}</li>`
      }
      if (node.children) {
        return (node.children || []).map(renderNode).join('')
      }
      return ''
    }

    return renderNode(data.root)
  } catch (e) {
    return typeof jsonStr === 'string' ? jsonStr : JSON.stringify(jsonStr)
  }
}

