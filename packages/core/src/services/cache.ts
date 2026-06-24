import NodeCache from 'node-cache'
import { logger } from './logger'

/**
 * Zenith Advanced Cache Service
 * ─────────────────────────────
 * Features:
 * 1. Tag-based invalidation (e.g., invalidate all 'posts')
 * 2. TTL support
 * 3. Atomic clears
 */
export class CacheService {
  private static cache = new NodeCache({ stdTTL: 600, maxKeys: 10_000, checkperiod: 120 }) // 10 min default, max 10k keys
  private static tags: Record<string, string[]> = {}

  // Handle key expiration to prevent memory leaks in the tags array
  static initialize() {
    this.cache.on('expired', (key: string) => {
      Object.keys(this.tags).forEach((tag) => {
        this.tags[tag] = this.tags[tag].filter((k) => k !== key)
      })
    })
  }

  static get<T>(key: string): T | undefined {
    return this.cache.get<T>(key)
  }

  static set(key: string, value: any, ttl?: number, tags: string[] = []): void {
    this.cache.set(key, value, ttl || 600)

    // Track tags
    tags.forEach((tag) => {
      if (!this.tags[tag]) this.tags[tag] = []
      if (!this.tags[tag].includes(key)) {
        this.tags[tag].push(key)
      }
    })
  }

  static del(keys: string | string[]): void {
    this.cache.del(keys)
  }

  /**
   * Invalidate all keys associated with a tag
   */
  static invalidateTag(tag: string): void {
    const keys = this.tags[tag]
    if (keys && keys.length > 0) {
      logger.info({ tag, count: keys.length }, 'Invalidating cache tag')
      this.cache.del(keys)
      this.tags[tag] = []
    }
  }

  static flush(): void {
    this.cache.flushAll()
    this.tags = {}
  }
}

CacheService.initialize()
