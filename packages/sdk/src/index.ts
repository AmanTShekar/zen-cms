export interface ZenithClientOptions {
  url: string
  apiKey?: string
  siteId?: string
}

export interface FetchOptions extends RequestInit {
  locale?: string
  depth?: number
  drafts?: boolean
}

export interface FindOptions extends FetchOptions {
  where?: Record<string, any>
  sort?: string
  limit?: number
  page?: number
}

/**
 * Lightweight JavaScript client for Zenith CMS, optimized for Edge environments.
 */
export class ZenithClient {
  private url: string
  private apiKey?: string
  private siteId?: string

  constructor(options: ZenithClientOptions) {
    this.url = options.url.replace(/\/$/, '')
    this.apiKey = options.apiKey
    this.siteId = options.siteId
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

  private async fetchAPI(path: string, options: FetchOptions = {}): Promise<any> {
    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    
    if (this.apiKey) {
      headers.set('Authorization', `Bearer ${this.apiKey}`)
    }
    if (this.siteId) {
      headers.set('X-Zenith-Site-Id', this.siteId)
    }

    const response = await fetch(`${this.url}${path}`, {
      ...options,
      headers,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.message || `Zenith API error: ${response.status} ${response.statusText}`)
    }

    return data
  }

  /**
   * Find multiple documents in a collection.
   */
  async find<T = any>(collection: string, options: FindOptions = {}): Promise<{ docs: T[]; totalDocs: number; totalPages: number; page: number }> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}${qs}`, { method: 'GET', ...options })
    return data.data || data // Handles different API response envelopes
  }

  /**
   * Find a single document by its ID.
   */
  async findById<T = any>(collection: string, id: string, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}/${id}${qs}`, { method: 'GET', ...options })
    return data.data?.document || data.data || data
  }

  /**
   * Fetch a singleton configuration.
   */
  async findGlobal<T = any>(slug: string, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/globals/${slug}${qs}`, { method: 'GET', ...options })
    return data.data?.document || data.data || data
  }

  /**
   * Create a new document in a collection.
   */
  async create<T = any>(collection: string, payload: any, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    })
    return data.data || data
  }

  /**
   * Update an existing document.
   */
  async update<T = any>(collection: string, id: string, payload: any, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}/${id}${qs}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      ...options,
    })
    return data.data?.document || data.data || data
  }

  /**
   * Delete a document.
   */
  async delete<T = any>(collection: string, id: string, options: FetchOptions = {}): Promise<T> {
    const qs = this.buildQueryString(options)
    const data = await this.fetchAPI(`/api/v1/${collection}/${id}${qs}`, {
      method: 'DELETE',
      ...options,
    })
    return data.data?.document || data.data || data
  }
}

export function createClient(options: ZenithClientOptions): ZenithClient {
  return new ZenithClient(options)
}
