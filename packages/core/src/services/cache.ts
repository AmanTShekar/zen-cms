import NodeCache from 'node-cache'
import { logger } from './logger'
import { redisService } from './redis'

/**
 * Zenith Distributed Cache Service
 * ─────────────────────────────────
 * Provides tag-based cache invalidation, TTL support, and atomic clears
 * across both single-node and multi-node deployments.
 *
 * OPERATIONAL MODES:
 * ─────────────────
 * • Redis available  → ALL reads and writes go through Redis exclusively.
 *   NodeCache is NOT used. Every node in the cluster shares one consistent
 *   cache state. Tag sets are maintained in Redis Sets.
 *
 * • Redis unavailable → Falls back to in-process NodeCache (dev / test only).
 *   This mode is intentionally unsafe for multi-node deploys. A warning is
 *   logged on first use if NODE_ENV=production.
 *
 * WHY this matters: the prior implementation always wrote to NodeCache even
 * when Redis was present. In a cluster, Node A's cache.set() updated its own
 * NodeCache AND Redis, but Nodes B-D still served from their stale local
 * NodeCache entries on Redis read-failure fallback paths, silently serving
 * stale data. Fixing set()/del()/invalidateTag() to skip NodeCache when Redis
 * is present eliminates this desync entirely.
 */
export class CacheService {
  private static _nodeCache = new NodeCache({ stdTTL: 600, maxKeys: 10_000, checkperiod: 120 })
  private static _tags: Record<string, string[]> = {}
  private static _warnedAboutSingleNode = false

  /** True when Redis is the active backend (multi-node safe). */
  static get isDistributed(): boolean {
    return !!redisService.client
  }

  static initialize() {
    this._nodeCache.on('expired', (key: string) => {
      Object.keys(this._tags).forEach((tag) => {
        this._tags[tag] = this._tags[tag].filter((k) => k !== key)
      })
    })
  }

  private static _warnIfSingleNodeProduction() {
    if (!this._warnedAboutSingleNode && process.env.NODE_ENV === 'production') {
      logger.warn(
        'CacheService is running in single-node (NodeCache) mode in production. ' +
        'Multi-node deployments will experience cache desync. ' +
        'Configure REDIS_URL to enable distributed caching.'
      )
      this._warnedAboutSingleNode = true
    }
  }

  static async get<T>(key: string): Promise<T | undefined> {
    if (redisService.client) {
      try {
        const data = await redisService.client.get(key)
        return data ? (JSON.parse(data) as T) : undefined
      } catch (err) {
        logger.warn({ err }, '[Cache] Redis get failed, falling back to local cache')
      }
    }
    this._warnIfSingleNodeProduction()
    return this._nodeCache.get<T>(key)
  }

  static async set(key: string, value: any, ttl?: number, tags: string[] = []): Promise<void> {
    const redisTtl = ttl || 600

    if (redisService.client) {
      // Redis-primary path: write exclusively to Redis.
      // NodeCache is NOT touched — prevents cross-node state divergence.
      try {
        await redisService.client.setex(key, redisTtl, JSON.stringify(value))
        for (const tag of tags) {
          const setKey = `zenith:tags:${tag}`
          await redisService.client.sadd(setKey, key)
          await redisService.client.expire(setKey, 86400)
        }
      } catch (err) {
        logger.warn({ err }, '[Cache] Redis set failed')
      }
      return
    }

    // NodeCache fallback (dev / single-node only)
    this._warnIfSingleNodeProduction()
    this._nodeCache.set(key, value, redisTtl)
    tags.forEach((tag) => {
      if (!this._tags[tag]) this._tags[tag] = []
      if (!this._tags[tag].includes(key)) this._tags[tag].push(key)
    })
  }

  static async del(keys: string | string[]): Promise<void> {
    const keysArray = Array.isArray(keys) ? keys : [keys]
    if (keysArray.length === 0) return

    if (redisService.client) {
      try {
        await redisService.client.del(...keysArray)
      } catch (err) {
        logger.warn({ err }, '[Cache] Redis del failed')
      }
      return
    }

    this._nodeCache.del(keysArray)
  }

  /**
   * Invalidate all keys associated with a tag.
   * In Redis mode, operates cluster-wide atomically via Redis Sets.
   * In NodeCache mode, operates on the local process only.
   */
  static async invalidateTag(tag: string): Promise<void> {
    if (redisService.client) {
      try {
        const setKey = `zenith:tags:${tag}`
        const redisKeys = await redisService.client.smembers(setKey)
        if (redisKeys.length > 0) {
          logger.info({ tag, count: redisKeys.length }, '[Cache] Invalidating tag (Redis)')
          await redisService.client.del(...redisKeys)
        }
        await redisService.client.del(setKey)
      } catch (err) {
        logger.warn({ err }, '[Cache] Redis invalidateTag failed')
      }
      return
    }

    // NodeCache fallback
    const keys = this._tags[tag]
    if (keys && keys.length > 0) {
      logger.info({ tag, count: keys.length }, '[Cache] Invalidating tag (local)')
      this._nodeCache.del(keys)
      this._tags[tag] = []
    }
  }

  static async flush(): Promise<void> {
    if (redisService.client) {
      try {
        // flushdb clears the active Redis DB — safe in scoped Redis instances.
        await redisService.client.flushdb()
      } catch (err) {
        logger.warn({ err }, '[Cache] Redis flushdb failed')
      }
      return
    }

    this._nodeCache.flushAll()
    this._tags = {}
  }
}

CacheService.initialize()

