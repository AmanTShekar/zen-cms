import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'

const WEBHOOK_COLLECTION = 'z_webhook_configs'

const getAdapter = (req: Request): DatabaseAdapter =>
  (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

const toWebhookDTO = (d: any) => ({
  id: String(d._id ?? d.id),
  url: d.url,
  secret: d.secret,
  events: d.events,
  enabled: d.enabled,
  createdAt: d.createdAt?.toISOString?.() || d.createdAt,
})

const syncEngineConfig = async (req: Request, adapter: DatabaseAdapter) => {
  const engine = req.app.get('zenith_engine')
  if (!engine) return
  const allDocs = await adapter.find<Record<string, any>>(WEBHOOK_COLLECTION, {})
  engine.config.webhooks = allDocs.map(toWebhookDTO)
}

const router: import('express').Router = Router()

// ── List all webhooks ─────────────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const filter = { siteId }
    const docs = await adapter.find<Record<string, any>>(WEBHOOK_COLLECTION, filter)
    res.json(createResponse(docs.map(toWebhookDTO)))
  } catch (err) {
    next(err)
  }
})

// ── Get all delivery logs for the system ───────────────────────────────────────
router.get('/deliveries', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
    const page = Math.max(parseInt(req.query.page as string) || 1, 1)
    const adapter = getAdapter(req)

    const filter: any = { siteId }
    if (req.query.status === 'success') filter.success = true
    if (req.query.status === 'failed') filter.success = false
    if (req.query.search) {
      filter.$or = [
        { event: { $regex: req.query.search, $options: 'i' } },
        { url: { $regex: req.query.search, $options: 'i' } }
      ]
    }

    const skip = (page - 1) * limit
    // Assuming z_webhook_deliveries stores webhook deliveries
    const deliveries = await adapter.find('z_webhook_deliveries', filter, { sort: '-createdAt', skip, limit })
    const total = await adapter.count('z_webhook_deliveries', filter)

    res.json({
      data: deliveries,
      meta: { total, page, limit }
    })
  } catch (err) {
    next(err)
  }
})


// ── Create webhook ─────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { url, secret, events } = req.body
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    if (!url) throw new InvalidPayloadError('Webhook URL is required')
    if (!events || !Array.isArray(events) || events.length === 0) throw new InvalidPayloadError('At least one event is required')
    // CRITICAL FIX: validate secret minimum length to prevent empty-string HMAC forgery
    if (secret !== undefined && typeof secret === 'string' && secret.length > 0 && secret.length < 32) {
      throw new InvalidPayloadError('Webhook secret must be at least 32 characters, or omitted to auto-generate')
    }

    const adapter = getAdapter(req)
    // Auto-generate a secure secret if none provided
    const resolvedSecret = secret?.trim()?.length >= 32 ? secret.trim() : `wh_${crypto.randomBytes(24).toString('hex')}`
    const doc = await adapter.create<Record<string, any>>(WEBHOOK_COLLECTION, { url, secret: resolvedSecret, events, enabled: true, siteId })
    await syncEngineConfig(req, adapter)

    res.status(201).json(createResponse(toWebhookDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Update webhook ─────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const { url, secret, events, enabled } = req.body
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')

    // CRITICAL FIX: scope webhook lookup to siteId to prevent cross-tenant update
    const existing = await adapter.findOne<Record<string, any>>(WEBHOOK_COLLECTION, { _id: id, siteId })
    if (!existing) throw new InvalidPayloadError(`Webhook "${id}" not found`)

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (url !== undefined) update.url = url
    // CRITICAL FIX: validate secret length — reject short secrets to prevent empty-string HMAC
    if (secret !== undefined) {
      if (typeof secret === 'string' && secret.length > 0 && secret.length < 32) {
        throw new InvalidPayloadError('Webhook secret must be at least 32 characters')
      }
      update.secret = secret?.trim()?.length >= 32 ? secret.trim() : undefined
    }
    if (events !== undefined) update.events = events
    if (enabled !== undefined) update.enabled = enabled

    const doc = await adapter.update<Record<string, any>>(WEBHOOK_COLLECTION, id, update)
    if (!doc) throw new InvalidPayloadError(`Webhook "${id}" not found`)

    await syncEngineConfig(req, adapter)
    res.json(createResponse(toWebhookDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Delete webhook ─────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const adapter = getAdapter(req)
    // CRITICAL FIX: scope webhook lookup to siteId to prevent cross-tenant deletion
    const existing = await adapter.findOne<Record<string, any>>(WEBHOOK_COLLECTION, { _id: id, siteId })
    if (!existing) throw new InvalidPayloadError(`Webhook "${id}" not found`)

    const deleted = await adapter.delete(WEBHOOK_COLLECTION, id)
    if (!deleted) throw new InvalidPayloadError(`Webhook "${id}" not found`)

    await syncEngineConfig(req, adapter)
    res.json(createResponse({ message: 'Webhook deleted' }))
  } catch (err) {
    next(err)
  }
})

// ── Test webhook ───────────────────────────────────────────────────────────────
router.post('/:id/test', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const adapter = getAdapter(req)

    // CRITICAL FIX: scope webhook lookup to siteId to prevent cross-tenant webhook test
    const doc = await adapter.findOne<Record<string, any>>(WEBHOOK_COLLECTION, { _id: id, siteId })
    if (!doc) throw new InvalidPayloadError(`Webhook "${id}" not found`)

    const webhook = { id: String(doc._id ?? doc.id), url: doc.url, secret: doc.secret, events: doc.events, enabled: doc.enabled }

    const { WebhookService } = await import('../services/webhook')
    const result = await WebhookService.sendWebhook(webhook, 'webhook.test', { message: 'Test event from Zenith CMS' })
    res.json(createResponse({ success: result.success, status: result.status, error: result.error }))
  } catch (err) {
    next(err)
  }
})

	// ── Get delivery log for a webhook ────────────────────────────────────────────
	router.get('/:id/deliveries', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
	  try {
	    const { id } = req.params
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
	    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
	    const adapter = getAdapter(req)

    // CRITICAL FIX: scope webhook lookup to siteId to prevent cross-tenant delivery log access
	    const doc = await adapter.findOne<Record<string, any>>(WEBHOOK_COLLECTION, { _id: id, siteId })
	    if (!doc) throw new InvalidPayloadError(`Webhook "${id}" not found`)

	    const deliveries = await adapter.getWebhookDeliveries(String(doc._id ?? doc.id), limit)
	    res.json(createResponse(deliveries))
	  } catch (err) {
	    next(err)
	  }
	})

// ── Replay a specific webhook delivery ────────────────────────────────────────
router.post('/:id/deliveries/:deliveryId/replay', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id, deliveryId } = req.params
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const adapter = getAdapter(req)

    // CRITICAL FIX: scope webhook lookup to siteId to prevent cross-tenant replay
    const doc = await adapter.findOne<Record<string, any>>(WEBHOOK_COLLECTION, { _id: id, siteId })
    if (!doc) throw new InvalidPayloadError(`Webhook "${id}" not found`)

    // Webhook delivery table is z_webhook_deliveries
    const delivery = await adapter.findOne<Record<string, any>>('z_webhook_deliveries', { _id: deliveryId, webhookId: id })
    if (!delivery) throw new InvalidPayloadError(`Delivery "${deliveryId}" not found`)

    const webhook = { id: String(doc._id ?? doc.id), url: doc.url, secret: doc.secret, events: doc.events, enabled: doc.enabled }
    
    // Attempt replay
    const { WebhookService } = await import('../services/webhook')
    
    // delivery.payload might be wrapped under data, but if it's the raw payload sent out, WebhookService expects `data` which is the actual document.
    // Wait, sendWebhook expects (target, event, data, collection).
    // The delivery.payload we stored is the *entire* payload containing { event, collection, data, timestamp }.
    // So we just pass delivery.payload.data to sendWebhook.
    const payloadData = delivery.payload?.data || delivery.payload
    
    const result = await WebhookService.sendWebhook(
      webhook,
      delivery.event,
      payloadData,
      delivery.collectionSlug
    )
    
    res.json(createResponse({ success: result.success, status: result.status, error: result.error }))
  } catch (err) {
    next(err)
  }
})

export default router
