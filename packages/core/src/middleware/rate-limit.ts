import rateLimit, { Store, ClientRateLimitInfo, Options } from 'express-rate-limit'
import { logger } from '../services/logger'
import { redisService } from '../services/redis'

/**
 * Custom Redis Rate Limit Store
 * ─────────────────────────────
 * Custom implementation to manage rate limits across horizontally scaled clusters.
 */
class RedisRateLimitStore implements Store {
  options!: Options
  private client: any

  constructor() {
    this.client = redisService.client
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
if (redisService.client) {
  try {
    rateLimitStore = new RedisRateLimitStore()
  } catch {
    logger.warn('Redis unavailable for rate limiting — falling back to in-memory store')
  }
}

/**
 * Zenith API Rate Limiter
 * ───────────────────────
 * Protects the CMS from brute-force and DoS attacks.
 * Uses a tiered approach: stricter for Auth, more relaxed for general API.
 */

// Read rate limit config from env vars with sensible defaults
function readRateLimitConfig(): { apiMax: number; apiWindowMs: number; authMax: number; authWindowMs: number } {
  return {
    apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10),
    apiWindowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || `${60 * 1000}`, 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || `${15 * 60 * 1000}`, 10),
  }
}

const { apiMax, apiWindowMs, authMax, authWindowMs } = readRateLimitConfig()

// General API: 100 requests per minute (configurable via env)
export const rateLimitMiddleware = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  skip: () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
})

// Alias for clarity
export const apiRateLimiter = rateLimitMiddleware

// Auth Routes: 10 requests per 15 minutes (configurable via env)
export const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  store: rateLimitStore,
  skip: () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
})
