import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'
import { logger } from '../services/logger'

const SCHEMAS_COLLECTION = 'z_schemas'

const getAdapter = (req: Request): DatabaseAdapter =>
  (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

const toSchemaDTO = (d: Record<string, any>) => ({
  id: String(d._id ?? d.id),
  slug: d.slug,
  name: d.title || d.name || d.slug,
  singular: d.singular,
  plural: d.plural,
  fields: d.fields,
  settings: d.settings,
  isGlobal: d.isGlobal || d.type === 'global',
  createdAt: d.createdAt?.toISOString?.() || d.createdAt,
  updatedAt: d.updatedAt?.toISOString?.() || d.updatedAt,
})

const router: import('express').Router = Router()

router.get('/', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = getAdapter(req)
    const docs = await adapter.find<Record<string, any>>(SCHEMAS_COLLECTION, {}, { siteId })
    // Ensure blocks do not leak into the collections list
    const filteredDocs = docs.filter((d: Record<string, any>) => d.type !== 'block')
    console.log(`[/schemas] Called with siteId: ${siteId}. Returning ${filteredDocs.length} schemas.`)
    res.json(createResponse(filteredDocs.map(toSchemaDTO)))
  } catch (err) {
    next(err)
  }
})

// ── Get schema by ID ─────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = getAdapter(req)
    const docs = await adapter.find<Record<string, any>>(SCHEMAS_COLLECTION, { id: req.params.id }, { siteId })
    const doc = docs[0]
    if (!doc) throw new NotFoundError(`Schema "${req.params.id}" not found`)
    res.json(createResponse(toSchemaDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Create schema ────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { slug, singular, plural, fields, settings } = req.body
    if (!slug) throw new InvalidPayloadError('Schema slug is required')
    if (!singular) throw new InvalidPayloadError('Schema singular name is required')
    if (!plural) throw new InvalidPayloadError('Schema plural name is required')

    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = getAdapter(req)
    
    // Check if slug already exists
    const existing = await adapter.find<Record<string, any>>(SCHEMAS_COLLECTION, { slug }, { siteId })
    if (existing && existing.length > 0) {
      throw new InvalidPayloadError(`Schema with slug "${slug}" already exists`)
    }

    const doc = await adapter.create<Record<string, any>>(SCHEMAS_COLLECTION, {
      slug,
      singular,
      plural,
      fields: fields || [],
      settings: settings || {}
    }, { siteId })

    // In a real implementation, we would need to trigger the CMS engine to merge this hybrid schema
    // and potentially create the table in PostgreSQL via Adapter's _ensureTable or similar method.
    logger.info(`New schema "${slug}" created. System restart may be required to register dynamic routes.`)

    res.status(201).json(createResponse(toSchemaDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Update schema ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const { singular, plural, fields, settings } = req.body
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = getAdapter(req)

    const update: Record<string, any> = { updatedAt: new Date() }
    if (singular !== undefined) update.singular = singular
    if (plural !== undefined) update.plural = plural
    if (fields !== undefined) update.fields = fields
    if (settings !== undefined) update.settings = settings

    const doc = await adapter.update<Record<string, any>>(SCHEMAS_COLLECTION, id, update, { siteId })
    if (!doc) throw new NotFoundError(`Schema "${id}" not found`)

    logger.info(`Schema "${doc.slug}" updated.`)

    res.json(createResponse(toSchemaDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── Delete schema ────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = getAdapter(req)

    const deleted = await adapter.delete(SCHEMAS_COLLECTION, id, { siteId })
    if (!deleted) throw new NotFoundError(`Schema "${id}" not found`)

    logger.info(`Schema "${id}" deleted. System restart may be required to unmount routes.`)

    res.json(createResponse({ message: 'Schema deleted' }))
  } catch (err) {
    next(err)
  }
})

export default router
