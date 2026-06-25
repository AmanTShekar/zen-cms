import rateLimit, { Store, ClientRateLimitInfo, Options } from 'express-rate-limit'
import { logger } from '../services/logger'
import { redisService } from '../services/redis'
import { env } from '../config/env';


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
} else {
  if (env.NODE_ENV === 'production' && process.env.ALLOW_IN_MEMORY_PRODUCTION !== 'true') {
    throw new Error('FATAL: Redis is required in production for rate limiting. Set the REDIS_URL environment variable. Running without Redis in production allows clients to bypass rate limits across instances. Set ALLOW_IN_MEMORY_PRODUCTION=true to bypass this safety check.')
  }
  logger.warn('Rate limiter: Redis unavailable — using in-memory store (not safe for horizontally scaled deployments)')
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

function getRateLimitKey(req: any): string {
  const userId = req.user?.id
  const ip = req.ip || req.socket.remoteAddress || 'any'
  const apiKey = req.headers['x-api-key']
  if (userId) return `user:${userId}:${ip}`
  if (apiKey) return `apikey:${apiKey.slice(0, 8)}`
  return `ip:${ip}`
}

// General API: 100 requests per minute (configurable via env)
export const rateLimitMiddleware = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  keyGenerator: getRateLimitKey,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: true,
  store: rateLimitStore,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

// Alias for clarity
export const apiRateLimiter = rateLimitMiddleware

// Auth Routes: 10 requests per 15 minutes (configurable via env)
export const authRateLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  keyGenerator: getRateLimitKey,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: true,
  store: rateLimitStore,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

// Mutation Routes (POST/PUT/PATCH/DELETE): 50 requests per minute
export const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  keyGenerator: getRateLimitKey,
  message: { error: 'Too many data mutations, please try again later.' },
  standardHeaders: true,
  legacyHeaders: true,
  store: rateLimitStore,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

// Tenant Export Routes: 1 request per 30 minutes
export const exportLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 1,
  keyGenerator: getRateLimitKey,
  message: { error: 'Too many exports, please wait 30 minutes.' },
  standardHeaders: true,
  legacyHeaders: true,
  store: rateLimitStore,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

// WebSocket connection establishments: 10 per minute
export const websocketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: getRateLimitKey,
  message: { error: 'Too many WebSocket connection attempts.' },
  standardHeaders: true,
  legacyHeaders: true,
  store: rateLimitStore,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})
