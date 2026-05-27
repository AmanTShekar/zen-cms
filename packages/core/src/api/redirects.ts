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

// ── GET /api/v1/redirects ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const skip = (page - 1) * limit
    const search = req.query.search as string | undefined
    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    const filter: Record<string, any> = {}
    if (siteId) filter.siteId = siteId
    if (search) {
      filter.$or = [
        { from: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
      ]
    }

    const [docs, total] = await Promise.all([
      adapter.find('z_redirects', filter, { skip, limit, sort: { createdAt: -1 } }),
      adapter.count('z_redirects', filter),
    ])

    res.json(createResponse(docs, {
      pagination: { page, pageSize: limit, totalPages: Math.ceil(total / limit), total },
    }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/redirects ───────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
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
      createdBy: (req as any).user?.id,
    })

    res.status(201).json(createResponse(doc))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/redirects/:id ────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const filter: Record<string, any> = { _id: req.params.id }
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
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { from, to, type } = req.body

    const filter: Record<string, any> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const existing = await adapter.findOne('z_redirects', filter)
    if (!existing) throw new NotFoundError('redirect', req.params.id)

    // Check uniqueness if `from` is being changed
    if (from && from !== existing.from) {
      const normalizedFrom = from.startsWith('/') ? from : `/${from}`
      const dupFilter: Record<string, any> = { from: normalizedFrom, _id: { $ne: req.params.id } }
      if (siteId) dupFilter.siteId = siteId
      const dup = await adapter.findOne('z_redirects', dupFilter)
      if (dup) throw new DuplicateError('from')
    }

    const updates: Record<string, any> = {}
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
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const filter: Record<string, any> = { _id: req.params.id }
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
    const adapter = (req as any).zenith?.adapter
    const { path } = req.body
    if (!path) throw new InvalidPayloadError('"path" is required')

    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const filter: Record<string, any> = { from: normalizedPath }
    if (siteId) filter.siteId = siteId

    const doc = await adapter.findOne('z_redirects', filter)
    if (!doc) {
      return res.status(404).json(createResponse(null))
    }

    // Bump hit counter fire-and-forget
    try {
      await adapter.update('z_redirects', String(doc._id ?? doc.id), {
        $inc: { hits: 1 },
        lastHitAt: new Date().toISOString(),
      })
    } catch { /* non-critical */ }

    res.json(createResponse(doc))
  } catch (err) {
    next(err)
  }
})

export default router