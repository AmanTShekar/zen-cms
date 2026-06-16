import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'
import { logger } from '../services/logger'

const CAMPAIGNS_COLLECTION = 'z_campaigns'

const getAdapter = (req: Request): DatabaseAdapter =>
  (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

const toCampaignDTO = (d: any) => ({
  id: String(d._id ?? d.id),
  subject: d.subject,
  body: d.body,
  status: d.status,
  audience: d.audience,
  sentAt: d.sentAt?.toISOString?.() || d.sent_at?.toISOString?.() || d.sentAt || d.sent_at,
  createdAt: d.createdAt?.toISOString?.() || d.created_at?.toISOString?.() || d.createdAt || d.created_at,
  updatedAt: d.updatedAt?.toISOString?.() || d.updated_at?.toISOString?.() || d.updatedAt || d.updated_at,
})

const router: import('express').Router = Router()

// ── List all campaigns ─────────────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const docs = await adapter.find<Record<string, any>>(CAMPAIGNS_COLLECTION, {})
    res.json(createResponse(docs.map(toCampaignDTO)))
  } catch (err) {
    next(err)
  }
})

// ── Get campaign by ID ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const docs = await adapter.find<Record<string, any>>(CAMPAIGNS_COLLECTION, { id: req.params.id })
    const doc = docs[0]
    if (!doc) throw new NotFoundError(`Campaign "${req.params.id}" not found`)
    res.json(createResponse(toCampaignDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Create campaign ────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { subject, body, audience } = req.body
    if (!subject) throw new InvalidPayloadError('Campaign subject is required')

    const adapter = getAdapter(req)
    
    const doc = await adapter.create<Record<string, any>>(CAMPAIGNS_COLLECTION, {
      subject,
      body: body || '',
      status: 'draft',
      audience: audience || 'all'
    })

    res.status(201).json(createResponse(toCampaignDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Update campaign ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const { subject, body, audience } = req.body
    const adapter = getAdapter(req)

    const update: Record<string, unknown> = { updated_at: new Date() }
    if (subject !== undefined) update.subject = subject
    if (body !== undefined) update.body = body
    if (audience !== undefined) update.audience = audience

    const doc = await adapter.update<Record<string, any>>(CAMPAIGNS_COLLECTION, id, update)
    if (!doc) throw new NotFoundError(`Campaign "${id}" not found`)

    res.json(createResponse(toCampaignDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Send campaign ──────────────────────────────────────────────────────────────
router.post('/:id/send', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const adapter = getAdapter(req)

    const doc = await adapter.update<Record<string, any>>(CAMPAIGNS_COLLECTION, id, { 
      status: 'sent', 
      sent_at: new Date(),
      updated_at: new Date()
    })
    
    if (!doc) throw new NotFoundError(`Campaign "${id}" not found`)

    // In a real implementation, this would trigger SES/SendGrid/SMTP integration to actually send emails.
    logger.info(`Campaign "${doc.subject}" queued for sending to audience: ${doc.audience}`)

    res.json(createResponse(toCampaignDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Delete campaign ────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const adapter = getAdapter(req)

    const deleted = await adapter.delete(CAMPAIGNS_COLLECTION, id)
    if (!deleted) throw new NotFoundError(`Campaign "${id}" not found`)

    res.json(createResponse({ message: 'Campaign deleted' }))
  } catch (err) {
    next(err)
  }
})

export default router
