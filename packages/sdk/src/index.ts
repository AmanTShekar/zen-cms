/**
 * Zenith SDK — Universal Client
 * ─────────────────────────────
 * Zero-dependency. Uses native fetch() only.
 * Type-safe responses, structured error handling, stale-while-revalidate caching.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ZenithConfig {
  baseURL?: string
  baseUrl?: string // legacy support
  token?: string
  apiKey?: string // legacy support
  siteId?: string // legacy support
  siteID?: string // legacy support
  version?: string // legacy support
  cacheTTL?: number // ms — default 60000 (1 min)
  localInstance?: any // ZenithEngine instance for direct local API bypass
}

/**
 * Paginated response metadata — fully typed, no more `any`.
 */
export interface PaginationMeta {
  total: number
  page: number
  pageSize: number
  totalPages: number
  pagination?: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

/**
 * Typed error thrown by the SDK.
 * Includes HTTP status, collection context, and field-level details when available.
 */
export class ZenithError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly collection?: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ZenithError'
  }
}

/**
 * Structured `where` clause for typed query building.
 * Matches the query-parser operators supported by the Zenith API.
 */
export type WhereOperator<T> =
  | { eq: T }
  | { ne: T }
  | { gt: T }
  | { lt: T }
  | { gte: T }
  | { lte: T }
  | { in: T[] }
  | { like: string }

export type Where<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? WhereOperator<U>
    : WhereOperator<T[K]>
}

export interface FindParams<T = any> {
  where?: Where<T>
  page?: number
  pageSize?: number
  sort?: string
  order?: 'asc' | 'desc'
  locale?: string
  [key: string]: any
}

// ── Internal cache entry ──────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T
  expiry: number
  stale: boolean
}

// ── Client ────────────────────────────────────────────────────────────────────

export class ZenithClient {
  private baseURL: string
  private headers: Record<string, string>
  private cache: Map<string, CacheEntry<any>> = new Map()
  private ttl: number
  private localInstance: any

  constructor(config: ZenithConfig) {
    this.ttl = config.cacheTTL ?? 60_000
    this.localInstance = config.localInstance

    const rawBase = config.baseURL || config.baseUrl || 'http://localhost:3000'
    const version = config.version || 'v1'
    this.baseURL = rawBase.endsWith(`/api/${version}`)
      ? rawBase
      : `${rawBase.replace(/\/$/, '')}/api/${version}`

    this.headers = {
      'Content-Type': 'application/json',
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
    }

    if (config.apiKey) {
      this.headers['X-API-KEY'] = config.apiKey
    }

    const siteId = config.siteId || config.siteID
    if (siteId) {
      this.headers['X-Zenith-Site-Id'] = siteId
    }
  }

  // ── Internal fetch wrapper ─────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    collection?: string
  ): Promise<T> {
    const url = `${this.baseURL}${path}`
    const res = await fetch(url, {
      method,
      headers: this.headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      let message = `HTTP ${res.status}`
      let field: string | undefined
      try {
        const json = await res.json() as any
        message = json?.error?.message || json?.message || message
        field = json?.error?.field
      } catch { /* response body not JSON */ }
      throw new ZenithError(message, res.status, collection, field)
    }

    return res.json() as Promise<T>
  }

  // ── Serialise where clause → query params ──────────────────────────────────

  private buildParams(params: FindParams): URLSearchParams {
    const sp = new URLSearchParams()
    const { where, page, pageSize, sort, order, locale, ...rest } = params

    if (page !== undefined) sp.set('page', String(page))
    if (pageSize !== undefined) sp.set('pageSize', String(pageSize))
    if (sort) sp.set('sort', sort)
    if (order) sp.set('order', order)
    if (locale) sp.set('locale', locale)

    // Serialize where clause → filter[field][op]=value
    if (where) {
      for (const [field, condition] of Object.entries(where)) {
        if (!condition) continue
        const [op, val] = Object.entries(condition)[0]
        if (Array.isArray(val)) {
          sp.set(`filter[${field}][${op}]`, val.join(','))
        } else {
          sp.set(`filter[${field}][${op}]`, String(val))
        }
      }
    }

    // Pass through any extra raw params
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) sp.set(k, String(v))
    }

    return sp
  }

  // ── Cache helpers (stale-while-revalidate) ─────────────────────────────────

  private getCache<T>(key: string): { fresh: T | null; stale: T | null } {
    const entry = this.cache.get(key)
    if (!entry) return { fresh: null, stale: null }
    if (entry.expiry > Date.now()) return { fresh: entry.data as T, stale: null }
    return { fresh: null, stale: entry.data as T }
  }

  private setCache<T>(key: string, data: T) {
    this.cache.set(key, { data, expiry: Date.now() + this.ttl, stale: false })
  }

  /** Invalidate all cache keys that match a collection slug prefix */
  invalidateCollection(slug: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${slug}:`)) this.cache.delete(key)
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fetch a list of entries from a collection.
   * Uses stale-while-revalidate: returns stale data immediately then refreshes.
   */
  async find<T = any>(
    slug: string,
    params: FindParams<T> = {}
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    if (this.localInstance) {
      const localData = await this.localInstance.local.find(slug, params)
      return {
        data: localData,
        meta: { total: localData.length, page: 1, pageSize: localData.length, totalPages: 1 },
      }
    }

    const sp = this.buildParams(params)
    const path = `/${slug}${sp.toString() ? `?${sp}` : ''}`
    const cacheKey = `${slug}:list:${path}`

    const { fresh, stale } = this.getCache<{ data: T[]; meta: PaginationMeta }>(cacheKey)
    if (fresh) return fresh

    const fetchFresh = this.request<any>('GET', path, undefined, slug)
      .then((res) => {
        const pagination = res.meta?.pagination || res.meta || {}
        const meta: PaginationMeta = {
          total: pagination.total ?? 0,
          page: pagination.page ?? 1,
          pageSize: pagination.pageSize ?? 10,
          totalPages: pagination.totalPages ?? 1,
          pagination: pagination
        }
        const mappedRes = { data: res.data || [], meta }
        this.setCache(cacheKey, mappedRes)
        return mappedRes
      })
      .catch((err) => { throw err })

    if (stale) {
      // Revalidate in background, return stale immediately
      fetchFresh.catch(() => { /* silently swallow background refresh errors */ })
      return stale
    }

    return fetchFresh
  }

  /**
   * Fetch a single entry by ID.
   */
  async findOne<T = any>(
    slug: string,
    id: string,
    params: Pick<FindParams, 'locale'> = {}
  ): Promise<{ data: T }> {
    if (this.localInstance) {
      const localData = await this.localInstance.local.findById(slug, id)
      return { data: localData }
    }

    const sp = params.locale ? new URLSearchParams({ locale: params.locale }) : null
    const path = `/${slug}/${id}${sp ? `?${sp}` : ''}`
    const cacheKey = `${slug}:${id}${params.locale ? `:${params.locale}` : ''}`

    const { fresh, stale } = this.getCache<{ data: T }>(cacheKey)
    if (fresh) return fresh

    const res = await this.request<{ data: T }>('GET', path, undefined, slug)
    this.setCache(cacheKey, res)
    return res
  }

  /**
   * Fetch a global singleton.
   */
  async getGlobal<T = any>(
    slug: string,
    params: Pick<FindParams, 'locale'> = {}
  ): Promise<{ data: T }> {
    if (this.localInstance) {
      const localData = await this.localInstance.local.findById(slug, 'singleton')
      return { data: localData }
    }

    const sp = params.locale ? new URLSearchParams({ locale: params.locale }) : null
    const path = `/globals/${slug}/singleton${sp ? `?${sp}` : ''}`
    const cacheKey = `global:${slug}${params.locale ? `:${params.locale}` : ''}`

    const { fresh, stale } = this.getCache<{ data: T }>(cacheKey)
    if (fresh) return fresh

    const res = await this.request<{ data: T }>('GET', path, undefined, slug)
    this.setCache(cacheKey, res)
    return res
  }

  /** @deprecated Use getGlobal() */
  async getSingleton<T = any>(slug: string): Promise<{ data: T }> {
    return this.getGlobal<T>(slug)
  }

  /**
   * Fetch entries from a collection (Alias for find)
   */
  async getCollection<T = any>(
    slug: string,
    params: FindParams<T> = {}
  ): Promise<{ data: T[]; meta: PaginationMeta }> {
    return this.find<T>(slug, params)
  }

  /**
   * Fetch a single entry by ID (Alias for findOne)
   */
  async getEntry<T = any>(
    slug: string,
    id: string,
    params: Pick<FindParams, 'locale'> = {}
  ): Promise<{ data: T }> {
    return this.findOne<T>(slug, id, params)
  }

  /**
   * Create a new document in a collection.
   * Requires an authenticated token in ZenithConfig.
   */
  async create<T = any>(slug: string, data: Partial<T>): Promise<{ data: T }> {
    const res = await this.request<{ data: T }>('POST', `/${slug}`, data, slug)
    this.invalidateCollection(slug)
    return res
  }

  /**
   * Update an existing document.
   * Requires an authenticated token in ZenithConfig.
   */
  async update<T = any>(slug: string, id: string, data: Partial<T>): Promise<{ data: T }> {
    const res = await this.request<{ data: T }>('PATCH', `/${slug}/${id}`, data, slug)
    this.cache.delete(`${slug}:${id}`)
    this.invalidateCollection(slug)
    return res
  }

  /**
   * Delete a document.
   * Requires an authenticated token in ZenithConfig.
   */
  async delete(slug: string, id: string): Promise<{ success: boolean }> {
    const res = await this.request<{ success: boolean }>('DELETE', `/${slug}/${id}`, undefined, slug)
    this.cache.delete(`${slug}:${id}`)
    this.invalidateCollection(slug)
    return res
  }
}
