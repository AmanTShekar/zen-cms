import crypto from 'crypto'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import { logger } from './logger'
import { eventHub } from './event-hub'
import { CMSConfig } from '@zenith-open/zenithcms-types'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import Redis from 'ioredis'
import { webhookCircuitBreaker } from './circuit-breaker'
import { withTrace } from '../telemetry/tracing'
import { redisService } from './redis'
import { env } from '../config/env';


export interface WebhookTarget {
  id?: string
  url: string
  secret?: string
  events: string[]
  siteId?: string
}

export interface WebhookPayload {
  event: string
  collection?: string
  data: any
  timestamp: string
}

// ── SSRF Protection ──────────────────────────────────────────────────────────
// Blocks requests to private/internal IP ranges (RFC1918) and localhost.
const BLOCKED_IP_PATTERNS = [
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^::1$/,
  /^fc00:/i,
  /^::ffff:(127|10|172\.(1[6-9]|2\d|3[01])|192\.168|169\.254)\./i,
]

async function validateWebhookUrl(urlStr: string): Promise<void> {
  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    throw new Error(`[Zenith Webhook] Invalid webhook URL format: ${urlStr}`)
  }

  if (env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error(
      `[Zenith Webhook] Only HTTPS webhook URLs are allowed in production. Got: ${urlStr}`
    )
  }

  const hostname = url.hostname

  let ip = hostname
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    try {
      const lookup = await dns.promises.lookup(hostname)
      ip = lookup.address
    } catch {
      return
    }
  }

  if (hostname === 'localhost') {
    throw new Error(`[Zenith Webhook] Blocked SSRF attempt to localhost`)
  }

  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(ip)) {
      throw new Error(
        `[Zenith Webhook] Blocked SSRF attempt: webhook URL resolves to internal/private IP: ${ip}`
      )
    }
  }
}

function secureRequest(
  urlStr: string,
  options: {
    method: string
    headers: Record<string, string>
    timeout: number
  },
  body: string
): Promise<{ ok: boolean; status: number }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const isHttps = url.protocol === 'https:'
    const lib = isHttps ? https : http

    const requestOptions: Record<string, any> = {
      method: options.method,
      headers: options.headers,
      timeout: options.timeout,
      lookup: (hostname: string, lookupOptions: Record<string, any>, callback: ((...args: any[]) => void)) => {
        dns.lookup(hostname, lookupOptions, (err, address, family) => {
          if (err) return callback(err)
          try {
            if (hostname === 'localhost') {
              throw new Error(`[Zenith Webhook] Blocked SSRF attempt to localhost`)
            }
            for (const pattern of BLOCKED_IP_PATTERNS) {
              if (pattern.test(address)) {
                throw new Error(`[Zenith Webhook] Blocked SSRF attempt: webhook URL resolves to internal/private IP: ${address}`)
              }
            }
            callback(null, address, family)
          } catch (validationErr: any) {
            callback(validationErr)
          }
        })
      }
    }

    const req = lib.request(url, requestOptions, (res) => {
      // Consume response body to prevent connection pool exhaustion
      res.on('data', () => {})
      res.on('end', () => {
        resolve({
          ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
          status: res.statusCode || 0
        })
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timed out'))
    })

    req.write(body)
    req.end()
  })
}

const MAX_RETRIES = env.WEBHOOK_MAX_RETRIES || 4
const RETRY_DELAYS_MS = env.WEBHOOK_RETRY_DELAYS ? env.WEBHOOK_RETRY_DELAYS.split(',').map(Number) : [180000, 300000, 900000, 3600000] // 3m, 5m, 15m, 60m
const WEBHOOK_TIMEOUT_MS = env.WEBHOOK_TIMEOUT_MS || 5000

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const WebhookService = {
  config: null as WebhookTarget[] | null,
  redisClient: null as Redis | null,
  destroyed: false,

  init(config: CMSConfig) {
    this.config = config.webhooks || []
    this.destroyed = false
    
    if (redisService.client) {
      try {
        this.redisClient = redisService.client
        this.startRedisWorker()
        this.startDelayedScheduler()
        logger.info('WebhookService: Redis-backed queue manager linked to unified client successfully.')
      } catch (err: any) {
        logger.error({ err: (err as Error).message }, 'WebhookService: Unified Redis attachment failed. Falling back to in-memory dispatch.')
        this.redisClient = null
      }
    } else {
      logger.info('WebhookService: No active Redis client found. Running in-memory webhook processor.')
    }

    eventHub.on('content.created', (args: Record<string, any>) => {
      this.dispatchEvent(this.config || [], `${args.collection}.created`, args.document, args.collection, args.document?.siteId)
    })

    eventHub.on('content.updated', (args: Record<string, any>) => {
      this.dispatchEvent(this.config || [], `${args.collection}.updated`, args.document, args.collection, args.document?.siteId)
    })

    eventHub.on('content.deleted', (args: Record<string, any>) => {
      this.dispatchEvent(this.config || [], `${args.collection}.deleted`, { id: args.documentId }, args.collection, args.siteId || args.document?.siteId)
    })
  },

  signPayload(payload: string, secret: string): string {
    return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`
  },

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.signPayload(payload, secret)
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
    } catch {
      return false
    }
  },

async sendWebhook(
    target: WebhookTarget,
    event: string,
    data: any,
    collection?: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; status?: number; error?: string }> {
    const signFn = this.signPayload.bind(this)
    return webhookCircuitBreaker.execute(async () => {
      if (idempotencyKey && this.redisClient) {
        const cached = await this.redisClient.get(`zenith:webhook:idem:${idempotencyKey}`).catch(() => null)
        if (cached) {
          logger.info({ idempotencyKey, url: target.url }, 'Webhook idempotency key hit — returning cached result')
          return JSON.parse(cached)
        }
      }

      const result = await this.doSendWebhookImpl(target, event, data, collection, signFn)

      if (idempotencyKey && this.redisClient) {
        await this.redisClient
          .set(`zenith:webhook:idem:${idempotencyKey}`, JSON.stringify(result), 'EX', 86400)
          .catch(() => {})
      }

      return result
    }, async () => ({ success: false, error: 'Circuit breaker open — webhook delivery skipped' }))
  },

  async doSendWebhookImpl(
    target: WebhookTarget,
    event: string,
    data: any,
    collection: string | undefined,
    signFn: (payload: string, secret: string) => string
  ): Promise<{ success: boolean; status?: number; error?: string }> {
    return withTrace('Webhook.deliver', async (span) => {
      span.setAttribute('webhook.targetUrl', target.url)
      span.setAttribute('webhook.event', event)
      span.setAttribute('webhook.collection', collection || 'none')
      span.setAttribute('webhook.siteId', target.siteId || 'none')

    try {
      await validateWebhookUrl(target.url)
    } catch (err: any) {
        logger.error({ url: target.url, error: (err as Error).message }, 'Webhook request failed')
        span.recordException(err)
        return { success: false, error: (err as Error).message }
    }

    try {
      const webhookPayload: WebhookPayload = {
        event,
        collection,
        data,
        timestamp: new Date().toISOString(),
      }

      const body = JSON.stringify(webhookPayload)
      const signature = signFn(body, target.secret || '')

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await secureRequest(target.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Zenith-Signature': signature,
              'X-Zenith-Event': event,
              'X-Zenith-Delivery': crypto.randomUUID(),
            },
            timeout: WEBHOOK_TIMEOUT_MS,
          }, body)

          if (response.ok) {
            logger.info({ url: target.url, event, attempt: attempt + 1 }, 'Webhook delivered')
            await AdapterFactory.getActiveAdapter().createWebhookDelivery({
              webhookId: target.id,
              collectionSlug: collection,
              event,
              url: target.url,
              success: true,
              responseStatus: response.status,
              timestamp: new Date(),
            }).catch(() => {})
            return { success: true, status: response.status }
          }

          logger.warn(
            { url: target.url, status: response.status, attempt: attempt + 1 },
            'Webhook delivery failed, retrying'
          )
        } catch (error: any) {
          logger.error(
            { url: target.url, error: (error as Error).message, attempt: attempt + 1 },
            'Webhook network error'
          )
        }

        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAYS_MS[attempt])
        }
      }

      await AdapterFactory.getActiveAdapter().createWebhookDelivery({
        webhookId: target.id,
        collectionSlug: collection,
        event,
        url: target.url,
        payload: data,
        success: false,
        timestamp: new Date(),
      }).catch(() => {})

      return { success: false, error: 'All retry attempts failed' }
    } catch (err: any) {
      logger.error({ err: (err as Error).message }, 'Webhook delivery unexpected error')
      return { success: false, error: (err as Error).message }
    }
  })
},

  async dispatchEvent(
    targets: WebhookTarget[],
    event: string,
    data: any,
    collection?: string,
    siteId?: string,
    idempotencyKey?: string
  ) {
    const eligible = targets.filter((t) => {
      if (t.siteId && siteId && t.siteId !== siteId) return false
      return t.events.includes(event) || t.events.includes('*')
    })
    const key = idempotencyKey || crypto.randomUUID()

    for (const target of eligible) {
      if (this.redisClient && this.redisClient.status === 'ready') {
        try {
          const job = {
            id: key,
            target,
            event,
            data,
            collection,
            attempt: 0,
          }
          await this.redisClient.lpush('zenith:webhooks:queue', JSON.stringify(job))
          logger.info({ url: target.url, event, idempotencyKey: key }, 'Webhook queued with idempotency key')
        } catch (err: any) {
          logger.error(
            { url: target.url, error: (err as Error).message },
            'Failed to queue webhook in Redis, falling back to in-memory dispatch'
          )
          this.sendWebhook(target, event, data, collection, key).catch((inMemoryErr) =>
            logger.error({ inMemoryErr }, 'Unhandled in-memory webhook error')
          )
        }
      } else {
        this.sendWebhook(target, event, data, collection, key).catch((err) =>
          logger.error({ err }, 'Unhandled in-memory webhook error')
        )
      }
    }
  },

  startRedisWorker() {
    const poll = async () => {
      if (this.destroyed) return
      try {
        if (this.redisClient && this.redisClient.status === 'ready') {
          const rawJob = await this.redisClient.rpop('zenith:webhooks:queue')
          if (rawJob) {
            const job = JSON.parse(rawJob)
            await this.processQueueJob(job)
          }
        }
      } catch (err: any) {
        logger.error({ err: (err as Error).message }, 'Webhook worker loop error')
      }
      setTimeout(poll, 200)
    }
    poll()
  },

  startDelayedScheduler() {
    const checkDelayed = async () => {
      if (this.destroyed) return
      try {
        if (this.redisClient && this.redisClient.status === 'ready') {
          const now = Date.now()
          const readyJobs = await this.redisClient.zrangebyscore('zenith:webhooks:delayed', 0, now)
          if (readyJobs.length > 0) {
            for (const rawJob of readyJobs) {
              const multi = this.redisClient.multi()
              multi.zrem('zenith:webhooks:delayed', rawJob)
              multi.lpush('zenith:webhooks:queue', rawJob)
              await multi.exec()
            }
            logger.debug({ count: readyJobs.length }, 'Moved delayed webhook jobs back to main queue')
          }
        }
      } catch (err: any) {
        logger.error({ err: (err as Error).message }, 'Webhook delayed scheduler error')
      }
      setTimeout(checkDelayed, 1000)
    }
    checkDelayed()
  },

  async processQueueJob(job: {
    id: string
    target: WebhookTarget
    event: string
    data: any
    collection?: string
    attempt: number
  }) {
    const { target, event, data, collection, attempt } = job

    try {
      await validateWebhookUrl(target.url)
    } catch (ssrfErr: any) {
      logger.error({ url: target.url, error: (ssrfErr as Error).message }, 'Webhook SSRF blocked in queue worker')
      try {
        await AdapterFactory.getActiveAdapter().createWebhookDelivery({
          webhookId: target.id,
          collectionSlug: collection,
          event,
          url: target.url,
          payload: data,
          success: false,
          responseStatus: 400,
          timestamp: new Date(),
        })
      } catch (_err) {
        logger.error('Failed to log webhook delivery')
      }
      return
    }

    const webhookPayload: WebhookPayload = {
      event,
      collection,
      data,
      timestamp: new Date().toISOString(),
    }

    const body = JSON.stringify(webhookPayload)
    const signature = this.signPayload(body, target.secret || '')

    try {
      const response = await secureRequest(target.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zenith-Signature': signature,
          'X-Zenith-Event': event,
          'X-Zenith-Delivery': job.id,
        },
        timeout: 5000,
      }, body)

      if (response.ok) {
        logger.info({ url: target.url, event, attempt: attempt + 1 }, 'Webhook delivered successfully via Redis queue')

        await AdapterFactory.getActiveAdapter().createWebhookDelivery({
          webhookId: target.id,
          collectionSlug: collection,
          event,
          url: target.url,
          success: true,
          responseStatus: response.status,
          timestamp: new Date(),
        }).catch(() => {})

        return
      }

      logger.warn(
        { url: target.url, status: response.status, attempt: attempt + 1 },
        'Webhook delivery failed status via Redis queue'
      )
      
      await this.handleJobRetry(job)
    } catch (error: any) {
      logger.error(
        { url: target.url, error: (error as Error).message, attempt: attempt + 1 },
        'Webhook network error via Redis queue'
      )
      
      await this.handleJobRetry(job)
    }
  },

  async handleJobRetry(job: {
    id: string
    target: WebhookTarget
    event: string
    data: any
    collection?: string
    attempt: number
  }) {
    const nextAttempt = job.attempt + 1
    if (nextAttempt < MAX_RETRIES) {
      job.attempt = nextAttempt
      const delay = RETRY_DELAYS_MS[nextAttempt - 1] || 1000
      const runAt = Date.now() + delay
      
      try {
        if (this.redisClient) {
          await this.redisClient.zadd('zenith:webhooks:delayed', runAt, JSON.stringify(job))
          logger.info({ url: job.target.url, attempt: nextAttempt, delayMs: delay }, 'Scheduled webhook retry in Redis')
          return
        }
      } catch (err: any) {
        logger.error({ err: (err as Error).message }, 'Failed to schedule job retry in Redis delayed queue')
      }
    }

    logger.error({ url: job.target.url, event: job.event }, 'Webhook failed after all queue retries')
    try {
      await AdapterFactory.getActiveAdapter().createWebhookDelivery({
        webhookId: job.target.id,
        collectionSlug: job.collection,
        event: job.event,
        url: job.target.url,
        payload: job.data,
        success: false,
        timestamp: new Date(),
      })
    } catch (_err) {
      logger.error('Failed to log webhook delivery')
    }
  },

  async shutdown() {
    this.destroyed = true
    if (this.redisClient) {
      await this.redisClient.quit().catch(() => {})
      this.redisClient = null
    }
  }
}
