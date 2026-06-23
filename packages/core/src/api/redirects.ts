import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError, DuplicateError } from '../errors'

const router: Router = Router()
router.use(requireAuth)

/**
 * Redirects Management API
 * ─────────────────────────
 * Full CRUD for HTTP redirect rules. Redirects are stored in the
 * `z_redirects` system collection and evaluated at runtime by the
 * redirect-handler middleware (runs before the 404 handler).
 *
 * GET    /api/v1/redirects          — List all redirects (paginated)
 * POST   /api/v1/redirects          — Create a redirect
 * GET    /api/v1/redirects/:id      — Get single redirect
 * PATCH  /api/v1/redirects/:id      — Update a redirect
 * DELETE /api/v1/redirects/:id      — Delete a redirect
 * POST   /api/v1/redirects/lookup   — Resolve a path (public)
 */

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ── GET /api/v1/redirects ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit
    const search = req.query.search as string | undefined
    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    // Adapter-agnostic filter: avoid MongoDB-specific $regex/$or operators.
    // Free-text search is applied as a JS post-filter after fetching from DB.
    const filter: Record<string, unknown> = {}
    if (siteId) filter.siteId = siteId

    const docs = await adapter.find('z_redirects', filter, { sort: { createdAt: -1 } })

    // Apply search as a JS-level post-filter (adapter-agnostic)
    const lowerSearch = search ? search.toLowerCase() : null
    const filteredDocs = lowerSearch
      ? docs.filter((doc: Record<string, unknown>) =>
          (typeof doc.from === 'string' && doc.from.toLowerCase().includes(lowerSearch)) ||
          (typeof doc.to === 'string' && doc.to.toLowerCase().includes(lowerSearch))
        )
      : docs

    const total = filteredDocs.length
    const paged = filteredDocs.slice(skip, skip + limit)

    res.json(createResponse(paged, {
      pagination: { page, pageSize: limit, totalPages: Math.ceil(total / limit), total },
    }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/redirects ───────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    const { from, to, type } = req.body
    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    if (!from || !to) {
      throw new InvalidPayloadError('"from" and "to" are required')
    }

    const normalizedFrom = from.startsWith('/') ? from : `/${from}`

    // Check for duplicate `from` path within same site
    const existing = await adapter.findOne('z_redirects', {
      from: normalizedFrom,
      ...(siteId ? { siteId } : {}),
    })
    if (existing) {
      throw new DuplicateError('from')
    }

    const doc = await adapter.create('z_redirects', {
      from: normalizedFrom,
      to,
      type: type || '301',
      siteId,
      hits: 0,
      createdBy: (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user?.id,
    })

    res.status(201).json(createResponse(doc))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/redirects/:id ────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId

    const doc = await adapter.findOne('z_redirects', filter)
    if (!doc) throw new NotFoundError('redirect', req.params.id)

    res.json(createResponse(doc))
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/v1/redirects/:id ──────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { from, to, type } = req.body

    // Adapter-agnostic lookup by id or _id
    const allById = await adapter.find('z_redirects', { id: req.params.id })
    let existing: Record<string, unknown> = allById[0] || null
    if (!existing) {
      const allByMongoId = await adapter.find('z_redirects', { _id: req.params.id })
      existing = allByMongoId[0] || null
    }
    if (siteId && existing?.siteId !== siteId) existing = null
    if (!existing) throw new NotFoundError('redirect', req.params.id)

    // Check uniqueness if `from` is being changed
    if (from && from !== existing.from) {
      const normalizedFrom = from.startsWith('/') ? from : `/${from}`
      // Adapter-agnostic duplicate check: fetch all matching `from`, filter out self in JS
      const dups = await adapter.find('z_redirects',
        siteId ? { from: normalizedFrom, siteId } : { from: normalizedFrom }
      )
      const hasDup = dups.some((d: Record<string, unknown>) => String(d.id || d._id) !== req.params.id)
      if (hasDup) throw new DuplicateError('from')
    }

    const updates: Record<string, unknown> = {}
    if (from) updates.from = from.startsWith('/') ? from : `/${from}`
    if (to !== undefined) updates.to = to
    if (type !== undefined) updates.type = type

    const updated = await adapter.update('z_redirects', req.params.id, updates)
    res.json(createResponse(updated))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/redirects/:id ─────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId

    const existing = await adapter.findOne('z_redirects', filter)
    if (!existing) throw new NotFoundError('redirect', req.params.id)

    await adapter.delete('z_redirects', req.params.id)
    res.json(createResponse({ deleted: true }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/redirects/lookup ────────────────────────────────────────────
router.post('/lookup', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    const { path } = req.body
    if (!path) throw new InvalidPayloadError('"path" is required')

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const filter: Record<string, unknown> = { from: normalizedPath }
    if (siteId) filter.siteId = siteId

    const doc = await adapter.findOne('z_redirects', filter)
    if (!doc) {
      return res.status(404).json(createResponse(null))
    }

    // Bump hit counter fire-and-forget (direct value — works on both MongoDB and Postgres)
    try {
      await adapter.update('z_redirects', String(doc._id ?? doc.id), {
        hits: (doc.hits || 0) + 1,
        lastHitAt: new Date().toISOString(),
      })
    } catch { /* non-critical */ }

    res.json(createResponse(doc))
  } catch (err) {
    next(err)
  }
})

export default router