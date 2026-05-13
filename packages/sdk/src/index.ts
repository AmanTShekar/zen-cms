import axios, { AxiosInstance } from 'axios';

interface ZenithConfig {
  baseURL: string;
  token?: string;
  cacheTTL?: number; // ms
}

/**
 * Zenith SDK — Universal Client
 * ─────────────────────────────
 * A high-performance, type-safe client for consuming Zenith CMS content.
 * Features built-in caching and automated error handling.
 */
export class ZenithClient {
  private api: AxiosInstance;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private ttl: number;

  constructor(config: ZenithConfig) {
    this.ttl = config.cacheTTL || 60000; // Default 1 min
    const rawBase = config.baseURL || 'http://localhost:3000';
    const cleanBase = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`;
    
    this.api = axios.create({
      baseURL: cleanBase,
      headers: config.token ? { Authorization: `Bearer ${config.token}` } : {},
    });
  }

  /**
   * Fetch a list of entries from a collection
   */
  async find<T = any>(slug: string, params: Record<string, any> = {}): Promise<{ data: T[]; meta: any }> {
    const cacheKey = `${slug}:list:${JSON.stringify(params)}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.api.get(`/${slug}`, { params });
      this.setCache(cacheKey, res.data);
      return res.data;
    } catch (err: any) {
      this.handleError(err);
    }
  }

  /**
   * Fetch a single entry by ID
   */
  async findOne<T = any>(slug: string, id: string): Promise<{ data: T }> {
    const cacheKey = `${slug}:${id}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const res = await this.api.get(`/${slug}/${id}`);
      this.setCache(cacheKey, res.data);
      return res.data;
    } catch (err: any) {
      this.handleError(err);
    }
  }

  /**
   * Fetch a global singleton section
   */
  async getGlobal<T = any>(slug: string): Promise<{ data: T }> {
    const cacheKey = `global:${slug}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Use the semantic /singleton ID for globals
      const res = await this.api.get(`/globals/${slug}/singleton`);
      this.setCache(cacheKey, res.data);
      return res.data;
    } catch (err: any) {
      this.handleError(err);
    }
  }

  /**
   * Legacy alias for getGlobal
   */
  async getSingleton<T = any>(slug: string): Promise<{ data: T }> {
    return this.getGlobal<T>(slug);
  }

  // --- Cache Helpers ---
  private getCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) return cached.data;
    if (cached) this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, expiry: Date.now() + this.ttl });
  }

  private handleError(err: any): never {
    const message = err.response?.data?.error?.message || err.message || 'Unknown Zenith SDK Error';
    throw new Error(`[Zenith SDK] ${message}`);
  }
}
