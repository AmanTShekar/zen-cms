import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenithcms/types'

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
  const allDocs = await adapter.find<any>(WEBHOOK_COLLECTION, {})
  engine.config.webhooks = allDocs.map(toWebhookDTO)
}

const router = Router()

// ── List all webhooks ─────────────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const docs = await adapter.find<any>(WEBHOOK_COLLECTION, {})
    res.json(createResponse(docs.map(toWebhookDTO)))
  } catch (err) {
    next(err)
  }
})

// ── Create webhook ─────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { url, secret, events } = req.body
    if (!url) throw new InvalidPayloadError('Webhook URL is required')
    if (!events || !Array.isArray(events) || events.length === 0) throw new InvalidPayloadError('At least one event is required')

    const adapter = getAdapter(req)
    const doc = await adapter.create<any>(WEBHOOK_COLLECTION, { url, secret: secret || '', events, enabled: true })
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

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (url !== undefined) update.url = url
    if (secret !== undefined) update.secret = secret
    if (events !== undefined) update.events = events
    if (enabled !== undefined) update.enabled = enabled

    const doc = await adapter.update<any>(WEBHOOK_COLLECTION, id, update)
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
    const adapter = getAdapter(req)

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
    const adapter = getAdapter(req)

    const doc = await adapter.findOne<any>(WEBHOOK_COLLECTION, { _id: id })
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
	    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
	    const adapter = getAdapter(req)

	    const doc = await adapter.findOne<any>(WEBHOOK_COLLECTION, { _id: id })
	    if (!doc) throw new InvalidPayloadError(`Webhook "${id}" not found`)

	    const deliveries = await adapter.getWebhookDeliveries(String(doc._id ?? doc.id), limit)
	    res.json(createResponse(deliveries))
	  } catch (err) {
	    next(err)
	  }
	})

export default router
