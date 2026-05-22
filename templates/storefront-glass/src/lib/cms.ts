import { createClient, type ZenithClient as ZenithClientType } from '@zenithcms/sdk'

/**
 * Zenith CMS Client — Storefront Glass
 * ─────────────────────────────────────
 * Single instance initialized from environment variables.
 * Replace the workspace import with the npm package when deploying standalone:
 *   `npm install @zenithcms/sdk`
 *
 * Environment variables (set in .env):
 *   VITE_CMS_URL      — your Zenith core engine URL (e.g. https://api.yoursite.com)
 *   VITE_CMS_API_KEY — API key from Zenith Admin → Settings → API Keys
 *   VITE_CMS_SITE_ID — Site ID from Zenith Admin → Settings → Sites
 */

const CMS_URL = import.meta.env.VITE_CMS_URL as string || 'http://localhost:3000'
const CMS_API_KEY = import.meta.env.VITE_CMS_API_KEY as string || ''
const CMS_SITE_ID = import.meta.env.VITE_CMS_SITE_ID as string || ''

export const cms = createClient({
  url: CMS_URL,
  apiKey: CMS_API_KEY,
  siteId: CMS_SITE_ID,
})

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