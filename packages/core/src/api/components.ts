/**
 * /api/v1/system/components
 *
 * CRUD for user-defined reusable components — Zenith's equivalent of
 * Strapi's Component Builder. Stored in `z_components` collection.
 *
 * A component is a named, reusable group of fields that can be:
 *   - Added to dynamic zones (dz fields)
 *   - Used in blocks fields alongside inline block definitions
 *   - Nested inside other components via array fields
 *
 * Example component: Navbar
 *   { slug: 'navbar', displayName: 'Navbar', category: 'Navigation',
 *     fields: [
 *       { name: 'logo', type: 'media' },
 *       { name: 'links', type: 'array', fields: [
 *         { name: 'label', type: 'text' },
 *         { name: 'url',   type: 'text' },
 *         { name: 'icon',  type: 'text' },
 *       ]},
 *     ]
 *   }
 */
import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'

const COMPONENTS_COLLECTION = 'z_components'

const getAdapter = (req: Request): DatabaseAdapter =>
  (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

const toDTO = (d: Record<string, unknown>) => ({
  id: String(d._id ?? d.id),
  slug: d.slug,
  displayName: d.displayName,
  category: d.category || 'General',
  icon: d.icon || 'Box',
  description: d.description || '',
  fields: d.fields || [],
  createdAt: d.createdAt?.toISOString?.() ?? d.createdAt,
  updatedAt: d.updatedAt?.toISOString?.() ?? d.updatedAt,
})

const RESERVED_SLUGS = new Set([
  'media', 'users', 'members', 'roles', 'pages', 'globals',
])

const router: import('express').Router = Router()

// ── GET /  ─────────────────────────────────────────────────────────────────────
// Public read — frontends and admin need this without auth overhead
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    const filter: Record<string, unknown> = siteId ? { siteId } : {}
    const docs = await adapter.find<Record<string, unknown>>(COMPONENTS_COLLECTION, filter)
    res.json(createResponse(docs.map(toDTO)))
  } catch (err) {
    next(err)
  }
})

// ── GET /:slug  ────────────────────────────────────────────────────────────────
router.get('/:slug', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    const filter: Record<string, unknown> = { slug: req.params.slug }
    if (siteId) filter.siteId = siteId
    const docs = await adapter.find<Record<string, unknown>>(COMPONENTS_COLLECTION, filter)
    const doc = docs[0]
    if (!doc) throw new NotFoundError(`Component "${req.params.slug}" not found`)
    res.json(createResponse(toDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── POST /  ────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { slug, displayName, category, icon, description, fields } = req.body

    if (!slug || typeof slug !== 'string')
      throw new InvalidPayloadError('Component slug is required')
    if (!displayName || typeof displayName !== 'string')
      throw new InvalidPayloadError('Component displayName is required')

    // Sanitize slug — lowercase, hyphens, no spaces
    const cleanSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (RESERVED_SLUGS.has(cleanSlug))
      throw new InvalidPayloadError(`Slug "${cleanSlug}" is reserved`)

    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    const filter: Record<string, unknown> = { slug: cleanSlug }
    if (siteId) filter.siteId = siteId
    const existing = await adapter.find<Record<string, unknown>>(COMPONENTS_COLLECTION, filter)
    if (existing.length > 0)
      throw new InvalidPayloadError(`Component with slug "${cleanSlug}" already exists`)

    const payload: Record<string, unknown> = {
      slug: cleanSlug,
      displayName,
      category: category || 'General',
      icon: icon || 'Box',
      description: description || '',
      fields: fields || [],
    }
    if (siteId) payload.siteId = siteId

    const doc = await adapter.create<Record<string, unknown>>(COMPONENTS_COLLECTION, payload)

    res.status(201).json(createResponse(toDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── PUT /:id  ──────────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const { displayName, category, icon, description, fields } = req.body
    const adapter = getAdapter(req)

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (displayName !== undefined) update.displayName = displayName
    if (category !== undefined)    update.category = category
    if (icon !== undefined)        update.icon = icon
    if (description !== undefined) update.description = description
    if (fields !== undefined)      update.fields = fields

    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')

    // Find first to check isolation
    const existing = await adapter.find<Record<string, unknown>>(COMPONENTS_COLLECTION, { _id: id, siteId })
    if (existing.length === 0) throw new NotFoundError(`Component "${id}" not found`)

    const doc = await adapter.update<Record<string, unknown>>(COMPONENTS_COLLECTION, id, update, { siteId })
    if (!doc) throw new NotFoundError(`Component "${id}" not found`)

    res.json(createResponse(toDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /:id  ───────────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')

    const existing = await adapter.find<Record<string, unknown>>(COMPONENTS_COLLECTION, { _id: id, siteId })
    if (existing.length === 0) throw new NotFoundError(`Component "${id}" not found`)

    const deleted = await adapter.delete(COMPONENTS_COLLECTION, id, { siteId })
    if (!deleted) throw new NotFoundError(`Component "${id}" not found`)
    res.json(createResponse({ message: 'Component deleted' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /:id/duplicate  ───────────────────────────────────────────────────────
router.post('/:id/duplicate', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')

    const docs = await adapter.find<Record<string, unknown>>(COMPONENTS_COLLECTION, { _id: id, siteId })
    const original = docs[0]
    if (!original) throw new NotFoundError(`Component "${id}" not found`)

    const newSlug = `${original.slug}-copy-${Date.now()}`
    const doc = await adapter.create<Record<string, unknown>>(COMPONENTS_COLLECTION, {
      slug: newSlug,
      displayName: `${original.displayName} (Copy)`,
      category: original.category,
      icon: original.icon,
      description: original.description,
      fields: original.fields,
      siteId
    })
    res.status(201).json(createResponse(toDTO(doc)))
  } catch (err) {
    next(err)
  }
})

// ── POST /register-code  ───────────────────────────────────────────────────────
// Allows developers and AI to register a component from a full JSON definition.
// Accepts the same shape as POST / but with looser validation to support
// code-generation and AI-assisted workflows.
router.post('/register-code', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { slug, displayName, name, category, icon, description, fields } = req.body

    const resolvedName = displayName || name
    if (!slug || typeof slug !== 'string')
      throw new InvalidPayloadError('Component slug is required')
    if (!resolvedName || typeof resolvedName !== 'string')
      throw new InvalidPayloadError('Component displayName (or name) is required')

    const cleanSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
    if (RESERVED_SLUGS.has(cleanSlug))
      throw new InvalidPayloadError(`Slug "${cleanSlug}" is reserved`)

    const adapter = getAdapter(req)

    // Upsert: if component already exists, update it (idempotent registration)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')

    const existing = await adapter.find<Record<string, unknown>>(COMPONENTS_COLLECTION, { slug: cleanSlug, siteId })
    let doc: Record<string, unknown>
    if (existing.length > 0) {
      doc = await adapter.update<Record<string, unknown>>(COMPONENTS_COLLECTION, String(existing[0]._id ?? existing[0].id), {
        displayName: resolvedName,
        category: category || existing[0].category,
        icon: icon || existing[0].icon,
        description: description || existing[0].description,
        fields: fields || existing[0].fields,
        updatedAt: new Date(),
      }, { siteId })
      return res.json(createResponse({ ...toDTO(doc), registered: 'updated' }))
    }

    doc = await adapter.create<Record<string, unknown>>(COMPONENTS_COLLECTION, {
      slug: cleanSlug,
      displayName: resolvedName,
      category: category || 'General',
      icon: icon || 'Box',
      description: description || '',
      fields: fields || [],
      siteId
    })

    res.status(201).json(createResponse({ ...toDTO(doc), registered: 'created' }))
  } catch (err) {
    next(err)
  }
})

export default router

