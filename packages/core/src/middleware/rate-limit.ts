import rateLimit, { Store, ClientRateLimitInfo, Options } from 'express-rate-limit'

/**
 * Custom Redis Rate Limit Store
 * ─────────────────────────────
 * Custom implementation to manage rate limits across horizontally scaled clusters.
 * Avoids extra npm dependencies and integrates cleanly using ioredis.
 */
class RedisRateLimitStore implements Store {
  options!: Options
  private client: any

  constructor(redisUrl: string) {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const Redis = require('ioredis')
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    })
    this.client.on('error', () => {
      // Slurp connection errors silently to keep server operating in local fallback
    })
  }

  init(options: Options) {
    this.options = options
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = `rate_limit:${key}`
    const windowSecs = Math.ceil(this.options.windowMs / 1000)

    const results = await this.client
      .multi()
      .incr(redisKey)
      .ttl(redisKey)
      .exec()

    const hits = results[0][1] as number
    let ttl = results[1][1] as number

    if (ttl === -1 || ttl === null || ttl < 0) {
      await this.client.expire(redisKey, windowSecs).catch(() => {})
      ttl = windowSecs
    }

    const resetTime = new Date(Date.now() + ttl * 1000)

    return {
      totalHits: hits,
      resetTime,
    }
  }

  async decrement(key: string): Promise<void> {
    const redisKey = `rate_limit:${key}`
    await this.client.decr(redisKey).catch(() => {})
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = `rate_limit:${key}`
    await this.client.del(redisKey).catch(() => {})
  }
}

// Resolve the dynamic rate limit store based on environment configuration
let rateLimitStore: any = undefined
const redisUrl = process.env.REDIS_URL
if (redisUrl) {
  try {
    rateLimitStore = new RedisRateLimitStore(redisUrl)
  } catch {
    // Fall back to default in-memory store on connection failures
  }
}

/**
 * Zenith API Rate Limiter
 * ───────────────────────
 * Protects the CMS from brute-force and DoS attacks.
 * Uses a tiered approach: stricter for Auth, more relaxed for general API.
 */

// General API: 100 requests per minute
export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  skip: () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
})

// Alias for clarity
export const apiRateLimiter = rateLimitMiddleware

// Auth Routes: 10 requests per 15 minutes (tighter)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  skip: () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
})
