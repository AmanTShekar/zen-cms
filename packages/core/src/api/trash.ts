import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError } from '../errors'

const router: Router = Router()
router.use(requireAuth)

/**
 * Global Trash Management API
 * ─────────────────────────────
 * Lists and manages soft-deleted documents across all collections.
 * Only collections with `softDelete: true` are included.
 *
 * GET    /api/v1/trash            — List all trashed items (paginated)
 * POST   /api/v1/trash/restore    — Restore a trashed document
 * POST   /api/v1/trash/purge      — Permanently delete a trashed document
 * DELETE /api/v1/trash             — Empty trash for a collection or all
 */

function getSoftDeleteCollections(config: any): any[] {
  return (config.collections || []).filter((c: any) => c.softDelete)
}

function getDocTitle(doc: any): string {
  return doc.title || doc.name || doc.heading || doc.label || doc.slug || String(doc._id || doc.id)
}

// ── GET /api/v1/trash ──────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const config = (req as any).zenith?.config
    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit
    const search = req.query.search as string | undefined

    const softDeleteCollections = getSoftDeleteCollections(config)
    if (softDeleteCollections.length === 0) {
      return res.json(
        createResponse([], {
          pagination: { page, pageSize: limit, totalPages: 0, total: 0 },
          collections: [],
        })
      )
    }

    // Count totals and fetch items per collection in parallel
    const perColLimit = skip + limit // max items needed from any single collection
    const results = await Promise.allSettled(
      softDeleteCollections.map(async (col: any) => {
        const filter: Record<string, any> = { deletedAt: { $ne: null } }
        if (siteId) filter.siteId = siteId
        if (search) {
          filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
            { heading: { $regex: search, $options: 'i' } },
            { label: { $regex: search, $options: 'i' } },
            { slug: { $regex: search, $options: 'i' } },
          ]
        }

        const [total, docs] = await Promise.all([
          adapter.count(col.slug, filter),
          adapter.find(col.slug, filter, {
            sort: { deletedAt: -1 },
            limit: perColLimit,
          }),
        ])

        return {
          slug: col.slug,
          total,
          items: docs.map((doc: any) => ({
            _id: doc._id,
            collectionSlug: col.slug,
            collectionName: col.name || col.slug,
            title: getDocTitle(doc),
            deletedAt: doc.deletedAt,
            siteId: doc.siteId,
          })),
        }
      })
    )

    // Flatten, filter fulfilled, sort by deletedAt desc
    let items: any[] = []
    let grandTotal = 0
    for (const r of results) {
      if (r.status === 'fulfilled') {
        grandTotal += r.value.total
        if (r.value.items.length > 0) {
          items.push(...r.value.items)
        }
      }
    }
    items.sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    )

    const total = grandTotal
    items = items.slice(skip, skip + limit)

    res.json(
      createResponse(items, {
        pagination: {
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
          total,
        },
        collections: softDeleteCollections.map((c: any) => ({
          slug: c.slug,
          name: c.name || c.slug,
        })),
      })
    )
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/trash/restore ─────────────────────────────────────────────────
router.post('/restore', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const config = (req as any).zenith?.config
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { collection, id } = req.body

    if (!collection || !id) {
      throw new InvalidPayloadError('"collection" and "id" are required')
    }

    // Verify the collection supports soft delete
    const softDeleteCollections = getSoftDeleteCollections(config)
    const col = softDeleteCollections.find((c: any) => c.slug === collection)
    if (!col) {
      throw new NotFoundError('collection', collection)
    }

    // Verify site scoping
    const query: Record<string, any> = { _id: id }
    if (siteId) query.siteId = siteId

    const doc = await adapter.findOne(collection, query)
    if (!doc) throw new NotFoundError(collection, id)

    await adapter.update(collection, id, { deletedAt: null })
    res.json(createResponse({ restored: true, collection, id }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/trash/purge ───────────────────────────────────────────────────
router.post('/purge', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const config = (req as any).zenith?.config
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { collection, id } = req.body

    if (!collection || !id) {
      throw new InvalidPayloadError('"collection" and "id" are required')
    }

    // Verify the collection supports soft delete
    const softDeleteCollections = getSoftDeleteCollections(config)
    const col = softDeleteCollections.find((c: any) => c.slug === collection)
    if (!col) {
      throw new NotFoundError('collection', collection)
    }

    // Verify site scoping
    const query: Record<string, any> = { _id: id, deletedAt: { $ne: null } }
    if (siteId) query.siteId = siteId

    const doc = await adapter.findOne(collection, query)
    if (!doc) throw new NotFoundError(collection, id)

    await adapter.delete(collection, id)
    res.json(createResponse({ purged: true, collection, id }))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/trash ───────────────────────────────────────────────────────
router.delete('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const config = (req as any).zenith?.config
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const targetCollection = req.query.collection as string | undefined
    const confirm = req.query.confirm as string | undefined

    if (confirm !== 'true') {
      throw new InvalidPayloadError('Confirmation required: set ?confirm=true')
    }

    const softDeleteCollections = getSoftDeleteCollections(config)
    const collections = targetCollection
      ? softDeleteCollections.filter((c: any) => c.slug === targetCollection)
      : softDeleteCollections

    if (targetCollection && collections.length === 0) {
      throw new NotFoundError('collection', targetCollection)
    }

    const results = await Promise.allSettled(
      collections.map(async (col: any) => {
        const filter: Record<string, any> = { deletedAt: { $ne: null } }
        if (siteId) filter.siteId = siteId
        const count = await adapter.deleteMany(col.slug, filter)
        return { slug: col.slug, deleted: count }
      })
    )

    const summary: any[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') summary.push(r.value)
    }

    res.json(createResponse({ emptied: summary }))
  } catch (err) {
    next(err)
  }
})

export default router
