import NodeCache from 'node-cache'
import Redis from 'ioredis'
import pino from 'pino'

const logger = pino()

/**
 * Shared CacheLayer abstraction used by both MongooseAdapter and PostgresDrizzleAdapter.
 * 
 * Two implementations:
 *   - LocalCacheLayer  → in-process NodeCache (dev / single-node only)
 *   - RedisCacheLayer  → Redis (production / horizontally-scaled deployments)
 * 
 * The adapter constructor selects the correct layer based on whether
 * REDIS_URL is set in the environment.
 */
export interface CacheLayer {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, collection: string): Promise<void>
  invalidate(collection: string): Promise<void>
}

export class LocalCacheLayer implements CacheLayer {
  private cache: NodeCache

  constructor() {
    this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 })
    logger.warn(
      'LocalCacheLayer: Initialized (Warning: Cache desync risk under horizontal scaling). ' +
      'Set REDIS_URL to enable distributed caching.'
    )
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key)
  }

  async set<T>(key: string, value: T, _collection: string): Promise<void> {
    this.cache.set(key, value)
  }

  async invalidate(collection: string): Promise<void> {
    const keys = this.cache.keys()
    const targets = keys.filter((k) => k.startsWith(`${collection}:`) || k.startsWith(`find:${collection}:`) || k.startsWith(`findOne:${collection}:`))
    console.log(`[DEBUG CACHE] invalidate(${collection}) - all keys:`, keys, 'targets:', targets)
    this.cache.del(targets)
  }
}

export class RedisCacheLayer implements CacheLayer {
  private redis: Redis

  constructor(redisUrl: string, adapterName = 'Adapter') {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    })
    logger.info(`${adapterName}: Redis_Cache_Layer Initialized`)
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const data = await this.redis.get(key)
      return data ? (JSON.parse(data) as T) : undefined
    } catch (error: any) {
      logger.warn({ error: error.message }, 'RedisCacheLayer: Get failed')
      return undefined
    }
  }

  async set<T>(key: string, value: T, collection: string): Promise<void> {
    try {
      const setKey = `zenith:cache:collection:${collection}`
      await this.redis.setex(key, 60, JSON.stringify(value))
      await this.redis.sadd(setKey, key)
      await this.redis.expire(setKey, 120)
    } catch (error: any) {
      logger.warn({ error: error.message }, 'RedisCacheLayer: Set failed')
    }
  }

  async invalidate(collection: string): Promise<void> {
    try {
      const setKey = `zenith:cache:collection:${collection}`
      const keys = await this.redis.smembers(setKey)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
      await this.redis.del(setKey)
    } catch (error: any) {
      logger.warn({ error: error.message }, 'RedisCacheLayer: Invalidate failed')
    }
  }
}

/**
 * Factory: returns the appropriate CacheLayer based on environment.
 */
export function createCacheLayer(adapterName: string): CacheLayer {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    return new RedisCacheLayer(redisUrl, adapterName)
  }
  return new LocalCacheLayer()
}
