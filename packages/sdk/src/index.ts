export interface ZenithClientOptions {
  url: string
  apiKey?: string
  siteId?: string
  /** SWR cache TTL in ms. default 30_000 (30s). set 0 to disable. */
  cacheTtl?: number
}

export interface FetchOptions extends RequestInit {
  locale?: string
  depth?: number
  drafts?: boolean
  /** Override the global cache TTL for this request. 0 = bypass cache. */
  cacheTtl?: number
  /** Tag-based cache invalidation key for this request */
  cacheTag?: string
}

export interface FindOptions extends FetchOptions {
  where?: Record<string, any>
  sort?: string
  limit?: number
  page?: number
}

// ── SWR Cache ────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T
  timestamp: number
  etag?: string
}

interface PendingRequest {
  promise: Promise<unknown>
  controllers: AbortController[]
}

/**
 * Stale-While-Revalidate cache.
 * Returns stale data immediately, then revalidates in the background.
 * Thread-safe for concurrent requests to the same key.
 */
class SWRCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private pending = new Map<string, PendingRequest>()
  private defaultTtl: number

  constructor(defaultTtl = 30_000) {
    this.defaultTtl = defaultTtl
  }

  get<T>(key: string): { data: T; stale: boolean } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    const age = Date.now() - entry.timestamp
    if (age > this.defaultTtl) {
      return { data: entry.data, stale: true }
    }
    return { data: entry.data, stale: false }
  }

  set<T>(key: string, data: T, etag?: string): void {
    this.store.set(key, { data, timestamp: Date.now(), etag })
  }

  getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const entry = this.get<T>(key)
    if (entry) {
      // Return stale immediately, revalidate in background (if not pending)
      if (!this.pending.has(key)) {
        const ctrl = new AbortController()
        const fetchPromise = fetchFn().then((fresh) => {
          this.set(key, fresh)
          this.pending.delete(key)
          return fresh
        }).catch((err) => {
          this.pending.delete(key)
          throw err
        }) as Promise<unknown>
        this.pending.set(key, { promise: fetchPromise, controllers: [ctrl] })
      }
      return Promise.resolve(entry.data)
    }

    // No cache entry — use pending request to avoid duplicate fetches
    if (this.pending.has(key)) {
      return this.pending.get(key)!.promise as Promise<T>
    }

    const ctrl = new AbortController()
    const fetchPromise = fetchFn().then((data) => {
      this.set(key, data)
      this.pending.delete(key)
      return data
    }).catch((err) => {
      this.pending.delete(key)
      throw err
    }) as Promise<unknown>
    this.pending.set(key, { promise: fetchPromise, controllers: [ctrl] })
    return fetchPromise as Promise<T>
  }

  invalidate(key: string): void {
    this.store.delete(key)
  }

  invalidateTag(tag: string): void {
    // Invalidate all cache entries whose key contains the tag
    for (const key of this.store.keys()) {
      if (key.includes(tag)) this.store.delete(key)
    }
  }

  flush(): void {
    this.store.clear()
    for (const { controllers } of this.pending.values()) {
      controllers.forEach((c) => c.abort())
    }
    this.pending.clear()
  }
}

// ── Batch Operation Request Descriptor ──────────────────────────────────────

interface BatchRequest {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
}

// ── Main Client ──────────────────────────────────────────────────────────────

/**
 * Lightweight JavaScript client for Zenith CMS, optimized for Edge environments.
 * Zero external dependencies — uses native browser fetch.
 */
export class ZenithClient {
  private url: string
  private apiKey?: string
  private siteId?: string
  private cache: SWRCache

  constructor(options: ZenithClientOptions) {
    this.url = options.url.replace(/\/$/, '')
    this.apiKey = options.apiKey
    this.siteId = options.siteId
    this.cache = new SWRCache(options.cacheTtl ?? 30_000)
  }

  // ── Cache control ───────────────────────────────────────────────────────────

  /** Flush all cached responses. */
  flushCache(): void {
    this.cache.flush()
  }

  /** Invalidate cache entries matching a tag. */
  invalidateCache(tag: string): void {
    this.cache.invalidateTag(tag)
  }

  private buildQueryString(options: FindOptions): string {
    const params = new URLSearchParams()

    if (options.locale) params.append('locale', options.locale)
    if (options.depth !== undefined) params.append('depth', String(options.depth))
    if (options.drafts) params.append('drafts', 'true')
    if (options.sort) params.append('sort', options.sort)
    if (options.limit !== undefined) params.append('limit', String(options.limit))
    if (options.page !== undefined) params.append('page', String(options.page))

    if (options.where) {
      this.flattenWhereParams(options.where, 'where').forEach((value, key) => {
        params.append(key, value)
      })
    }

    const str = params.toString()
    return str ? `?${str}` : ''
  }

  private flattenWhereParams(obj: Record<string, any>, prefix: string): Map<string, string> {
    const map = new Map<string, string>()
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = this.flattenWhereParams(value, `${prefix}[${key}]`)
        nested.forEach((v, k) => map.set(k, v))
      } else {
        map.set(`${prefix}[${key}]`, String(value))
      }
    }
    return map
  }

  private buildHeaders(extra?: Record<string, string>): Headers {
    const headers = new Headers(extra)
    headers.set('Content-Type', 'application/json')
    if (this.apiKey) headers.set('Authorization', `Bearer ${this.apiKey}`)
    if (this.siteId) headers.set('X-Zenith-Site-Id', this.siteId)
    return headers
  }

  private async fetchAPI(
    path: string,
    options: FetchOptions = {},
    cacheKey?: string
  ): Promise<any> {
    const headers = this.buildHeaders(options.headers as Record<string, string>)

    // ── SWR: serve stale data immediately, revalidate in background ──────────
    const useCache = options.cacheTtl !== 0 && cacheKey
    const entry = useCache ? this.cache.get<unknown>(cacheKey) : null

    if (entry && useCache) {
      // Bypass cache if explicitly requested with cacheTtl: 0
      const revalidate = entry.stale && options.cacheTtl !== 0

      if (revalidate) {
        // Do not await — fire and forget SWR revalidation
        const ctrl = new AbortController()
        fetch(`${this.url}${path}`, {
          ...options,
          headers,
          signal: ctrl.signal,
        })
          .then((res) => {
            if (res.ok) return res.json()
            throw new Error(`HTTP ${res.status}`)
          })
          .then((data) => {
            this.cache.set(cacheKey!, data)
          })
          .catch(() => {
            // SWR revalidation failures are silent — stale data is acceptable
          })
      }

      return entry.data as any
    }

    // No cache or cache disabled — fetch normally
    const response = await fetch(`${this.url}${path}`, {
      ...options,
      headers,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.message || `Zenith API error: ${response.status} ${response.statusText}`)
    }

    if (useCache) {
      this.cache.set(cacheKey!, data)
    }

    return data
  }

  private cacheKey(collection: string, path: string): string {
    return `${collection}:${path}`
  }

  // ── Content API ─────────────────────────────────────────────────────────────

  /**
   * Find multiple documents in a collection.
   * Uses SWR cache by default (30s TTL). Bypass with `cacheTtl: 0`.
   */
  async find<T = any>(
    collection: string,
    options: FindOptions = {}
  ): Promise<{ docs: T[]; totalDocs: number; totalPages: number; page: number }> {
    const qs = this.buildQueryString(options)
    const ck = options.cacheTag
      ? this.cacheKey(collection, `/api/v1/${collection}${qs}`)
      : undefined

    const data = await this.fetchAPI(
      `/api/v1/${collection}${qs}`,
      { method: 'GET', ...options },
      options.cacheTtl !== 0 ? `/api/v1/${collection}${qs}` : undefined
    )

    const docs = Array.isArray(data.docs)
      ? data.docs
      : Array.isArray(data.data)
      ? data.data
      : data.data?.docs || []

    const totalDocs = data.totalDocs ?? data.meta?.pagination?.total ?? docs.length
    const totalPages = data.totalPages ?? data.meta?.pagination?.totalPages ?? 1
    const page = data.page ?? data.meta?.pagination?.page ?? 1

    return { docs, totalDocs, totalPages, page, data: docs, ...data } as any
  }

  /**
   * Find a single document by ID.
   * Uses SWR cache by default.
   */
  async findById<T = any>(collection: string, id: string, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(
      `/api/v1/${collection}/${id}${qs}`,
      { method: 'GET', ...options },
      `/api/v1/${collection}/${id}${qs}`
    )
    return data.data?.document || data.data || data
  }

  /**
   * Fetch a singleton configuration.
   */
  async findGlobal<T = any>(slug: string, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(
      `/api/v1/globals/${slug}${qs}`,
      { method: 'GET', ...options },
      `/api/v1/globals/${slug}${qs}`
    )
    return data.data?.document || data.data || data
  }

  /**
   * Create a new document in a collection.
   * Invalidates cache for the target collection.
   */
  async create<T = any>(collection: string, payload: any, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
      cacheTtl: 0, // writes never use cache
    })
    this.cache.invalidateTag(collection) // optimistic invalidation
    return data.data || data
  }

  /**
   * Update an existing document.
   * Invalidates cache for the target collection.
   */
  async update<T = any>(
    collection: string,
    id: string,
    payload: any,
    options: FetchOptions = {}
  ): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}/${id}${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      ...options,
      cacheTtl: 0,
    })
    this.cache.invalidateTag(collection)
    return data.data?.document || data.data || data
  }

  /**
   * Delete a document.
   * Invalidates cache for the target collection.
   */
  async delete<T = any>(collection: string, id: string, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}/${id}${qs}`, {
      method: 'DELETE',
      ...options,
      cacheTtl: 0,
    })
    this.cache.invalidateTag(collection)
    return data.data?.document || data.data || data
  }

  // ── Aggregation & Counts ────────────────────────────────────────────────────

  /**
   * Count documents matching a filter.
   * Uses SWR cache.
   */
  async count(collection: string, filter?: Record<string, any>): Promise<number> {
    const params = new URLSearchParams()
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.append(`where[${k}]`, String(v))
      })
    }
    const paramStr = params.toString()
    const qs = paramStr ? `?${paramStr}` : ''
    const data = await this.fetchAPI(
      `/api/v1/${collection}/count${qs}`,
      { method: 'GET', cacheTtl: 0 }
    )
    return typeof data.data?.count === 'number' ? data.data.count : (data.count ?? 0)
  }

  /**
   * Run an aggregation pipeline on a collection.
   * Sends the pipeline to a dedicated endpoint.
   */
  async aggregate<T = any>(
    collection: string,
    pipeline: Record<string, unknown>[]
  ): Promise<T[]> {
    const data = await this.fetchAPI(`/api/v1/${collection}/aggregate`, {
      method: 'POST',
      body: JSON.stringify({ pipeline }),
      cacheTtl: 0,
    })
    return data.data?.results ?? data.results ?? data
  }

  // ── Batch Operations ────────────────────────────────────────────────────────

  /**
   * Execute multiple API calls in a single round-trip (parallel).
   * All requests fire concurrently; waits for all to settle.
   * Returns an array of results in the same order as the input requests.
   *
   * @example
   * const [posts, authors] = await client.batch([
   *   { method: 'GET', path: '/api/v1/posts?limit=10' },
   *   { method: 'GET', path: '/api/v1/authors?limit=5' },
   * ])
   */
  async batch(requests: BatchRequest[]): Promise<any[]> {
    const results = await Promise.all(
      requests.map(async (req) => {
        const headers = this.buildHeaders(req.headers)
        try {
          const response = await fetch(`${this.url}${req.path}`, {
            method: req.method || 'GET',
            headers,
            body: req.body ? JSON.stringify(req.body) : undefined,
          })
          const data = await response.json().catch(() => null)
          if (!response.ok) {
            throw new Error(data?.message || `Batch item failed: ${response.status}`)
          }
          return data.data ?? data
        } catch (err) {
          // Propagate errors so Promise.allSettled-like behavior is available via .catch
          throw err
        }
      })
    )
    return results
  }

  // ── File Upload ─────────────────────────────────────────────────────────────

  /**
   * Upload a file (image, video, PDF, etc.) to Zenith CMS media store.
   *
   * @param file - File or Blob from <input type="file"> or FileReader
   * @param metadata - Optional alt text, focal point, folder
   */
  async upload(
    file: File | Blob,
    metadata?: {
      alt?: string
      focalPoint?: { x: number; y: number }
      folder?: string
    }
  ): Promise<any> {
    const formData = new FormData()
    const fileName = 'name' in file ? (file as any).name : 'file'
    formData.append('file', file, fileName)

    // Attach focal point as JSON string (multer parses it server-side)
    if (metadata?.focalPoint) {
      formData.append('focalPoint', JSON.stringify(metadata.focalPoint))
    }
    if (metadata?.alt) {
      formData.append('alt', metadata.alt)
    }
    if (metadata?.folder) {
      formData.append('folder', metadata.folder)
    }

    const headers = this.buildHeaders()
    // Remove Content-Type so fetch sets the correct multipart boundary
    headers.delete('Content-Type')

    const response = await fetch(`${this.url}/api/v1/upload`, {
      method: 'POST',
      headers,
      body: formData,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.message || `Upload failed: ${response.status}`)
    }
    return data.data ?? data
  }

  /**
   * Upload multiple files in parallel.
   * Uses Promise.all for concurrent uploads.
   */
  async uploadMany(
    files: (File | Blob)[],
    metadata?: Parameters<typeof this.upload>[1]
  ): Promise<any[]> {
    return Promise.all(files.map((file) => this.upload(file, metadata)))
  }
}

export function createClient(options: ZenithClientOptions): ZenithClient {
  return new ZenithClient(options)
}