import crypto from 'crypto'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import { logger } from './logger'
import { eventHub } from './event-hub'
import { CMSConfig } from '@zenithcms/types'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import Redis from 'ioredis'

export interface WebhookTarget {
  id?: string
  url: string
  secret?: string
  events: string[]
}

export interface WebhookPayload {
  event: string
  collection?: string
  data: unknown
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
]

async function validateWebhookUrl(urlStr: string): Promise<void> {
  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    throw new Error(`[Zenith Webhook] Invalid webhook URL format: ${urlStr}`)
  }

  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
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

    const requestOptions: any = {
      method: options.method,
      headers: options.headers,
      timeout: options.timeout,
      lookup: (hostname: string, lookupOptions: any, callback: any) => {
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
      resolve({
        ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
        status: res.statusCode || 0
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

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1000, 3000, 10000]

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

    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      try {
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
        })

        this.redisClient.on('error', (err) => {
          logger.error({ err: err.message }, 'Webhook Redis Client Error')
        })

        this.redisClient.on('connect', () => {
          logger.info('Webhook Redis queue client connected')
        })

        this.startRedisWorker()
        this.startDelayedScheduler()
        logger.info('WebhookService: Redis-backed queue manager initialized successfully.')
      } catch (err: any) {
        logger.error({ err: err.message }, 'WebhookService: Redis initialization failed. Falling back to in-memory dispatch.')
        this.redisClient = null
      }
    } else {
      logger.info('WebhookService: No REDIS_URL provided. Running in-memory webhook processor.')
    }

    eventHub.on('content.created', (args: any) => {
      this.dispatchEvent(this.config || [], `${args.collection}.created`, args.document, args.collection)
    })

    eventHub.on('content.updated', (args: any) => {
      this.dispatchEvent(this.config || [], `${args.collection}.updated`, args.document, args.collection)
    })

    eventHub.on('content.deleted', (args: any) => {
      this.dispatchEvent(this.config || [], `${args.collection}.deleted`, { id: args.documentId }, args.collection)
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
    data: unknown,
    collection?: string
  ): Promise<{ success: boolean; status?: number; error?: string }> {
    try {
      await validateWebhookUrl(target.url)
    } catch (ssrfErr: any) {
      logger.error({ url: target.url, error: ssrfErr.message }, 'Webhook SSRF blocked')
      return { success: false, error: ssrfErr.message }
    }

    const webhookPayload: WebhookPayload = {
      event,
      collection,
      data,
      timestamp: new Date().toISOString(),
    }

    const body = JSON.stringify(webhookPayload)
    const signature = this.signPayload(body, target.secret || '')

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
          timeout: 5000,
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
          { url: target.url, error: error.message, attempt: attempt + 1 },
          'Webhook network error'
        )
      }

      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAYS_MS[attempt])
      }
    }

    try {
      await AdapterFactory.getActiveAdapter().createWebhookDelivery({
        webhookId: target.id,
        collectionSlug: collection,
        event,
        url: target.url,
        payload: data,
        success: false,
        timestamp: new Date(),
      })
    } catch (_err) {
      logger.error('Failed to log webhook delivery')
    }

    logger.error({ url: target.url, event }, 'Webhook failed after all retries')
    return { success: false, error: 'Max retries exceeded' }
  },

  async dispatchEvent(targets: WebhookTarget[], event: string, data: unknown, collection?: string) {
    const eligible = targets.filter((t) => t.events.includes(event) || t.events.includes('*'))

    for (const target of eligible) {
      if (this.redisClient && this.redisClient.status === 'ready') {
        try {
          const job = {
            id: crypto.randomUUID(),
            target,
            event,
            data,
            collection,
            attempt: 0,
          }
          await this.redisClient.lpush('zenith:webhooks:queue', JSON.stringify(job))
          logger.info({ url: target.url, event }, 'Webhook successfully queued in Redis')
        } catch (err: any) {
          logger.error(
            { url: target.url, error: err.message },
            'Failed to queue webhook in Redis, falling back to in-memory dispatch'
          )
          this.sendWebhook(target, event, data, collection).catch((inMemoryErr) =>
            logger.error({ inMemoryErr }, 'Unhandled in-memory webhook error')
          )
        }
      } else {
        this.sendWebhook(target, event, data, collection).catch((err) =>
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
        logger.error({ err: err.message }, 'Webhook worker loop error')
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
        logger.error({ err: err.message }, 'Webhook delayed scheduler error')
      }
      setTimeout(checkDelayed, 1000)
    }
    checkDelayed()
  },

  async processQueueJob(job: {
    id: string
    target: WebhookTarget
    event: string
    data: unknown
    collection?: string
    attempt: number
  }) {
    const { target, event, data, collection, attempt } = job

    try {
      await validateWebhookUrl(target.url)
    } catch (ssrfErr: any) {
      logger.error({ url: target.url, error: ssrfErr.message }, 'Webhook SSRF blocked in queue worker')
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
        { url: target.url, error: error.message, attempt: attempt + 1 },
        'Webhook network error via Redis queue'
      )
      
      await this.handleJobRetry(job)
    }
  },

  async handleJobRetry(job: {
    id: string
    target: WebhookTarget
    event: string
    data: unknown
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
        logger.error({ err: err.message }, 'Failed to schedule job retry in Redis delayed queue')
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
