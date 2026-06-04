import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError, ForbiddenError } from '../errors'
import { ContentService } from '../services/content'
import { CacheService } from '../services/cache'

const router: Router = Router()

/**
 * Bulk Operations API
 * ────────────────────
 * Enables efficient batch operations on collection documents.
 * Inspired by Directus's bulk update/delete endpoints.
 *
 * POST /api/v1/:collection/bulk/delete    — delete many by IDs
 * POST /api/v1/:collection/bulk/update    — update many by IDs
 * POST /api/v1/:collection/bulk/publish   — publish many by IDs
 * POST /api/v1/:collection/bulk/unpublish — unpublish many by IDs
 */

router.post('/:collection/bulk/delete', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { ids } = req.body
    const { collection } = req.params
    const config = (req as any).zenith?.config
    const user = (req as any).user
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = (req as any).zenith?.adapter

    if (!adapter) {
      throw new Error('Database adapter not initialized on request context')
    }

    if (!Array.isArray(ids) || ids.length === 0)
      throw new InvalidPayloadError('"ids" array is required')
    if (ids.length > 500)
      throw new InvalidPayloadError('Cannot delete more than 500 documents at once')

    if (user.role === 'viewer') throw new ForbiddenError('Viewer role is read-only')

    const colConfig = config?.collections?.find((c: any) => c.slug === collection)
    if (!colConfig) throw new NotFoundError('Collection', collection)

    const contentService = new ContentService(colConfig, adapter)
    
    // Execute all deletions via ContentService in batches of 20 to prevent connection pool exhaustion
    const BATCH_SIZE = 20
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map((id) => contentService.delete(id, { user, siteId })))
    }

    CacheService.invalidateTag(collection)

    res.json(createResponse({ deleted: ids.length }))
  } catch (err) {
    next(err)
  }
})

router.post('/:collection/bulk/update', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { ids, data } = req.body
    const { collection } = req.params
    const config = (req as any).zenith?.config
    const user = (req as any).user
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = (req as any).zenith?.adapter

    if (!adapter) {
      throw new Error('Database adapter not initialized on request context')
    }

    if (!Array.isArray(ids) || ids.length === 0)
      throw new InvalidPayloadError('"ids" array is required')
    if (!data || typeof data !== 'object')
      throw new InvalidPayloadError('"data" object is required')
    if (ids.length > 500)
      throw new InvalidPayloadError('Cannot update more than 500 documents at once')

    if (user.role === 'viewer') throw new ForbiddenError('Viewer role is read-only')

    const colConfig = config?.collections?.find((c: any) => c.slug === collection)
    if (!colConfig) throw new NotFoundError('Collection', collection)

    const contentService = new ContentService(colConfig, adapter)

    // Execute all updates via ContentService in batches of 20 to prevent connection pool exhaustion
    const BATCH_SIZE = 20
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map((id) => contentService.update(id, data, { user, siteId })))
    }

    CacheService.invalidateTag(collection)

    res.json(createResponse({ updated: ids.length }))
  } catch (err) {
    next(err)
  }
})

router.post('/:collection/bulk/publish', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { ids } = req.body
    const { collection } = req.params
    const config = (req as any).zenith?.config
    const user = (req as any).user
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = (req as any).zenith?.adapter

    if (!adapter) {
      throw new Error('Database adapter not initialized on request context')
    }

    if (!Array.isArray(ids) || ids.length === 0)
      throw new InvalidPayloadError('"ids" array is required')

    if (user.role === 'viewer') throw new ForbiddenError('Viewer role is read-only')

    const colConfig = config?.collections?.find((c: any) => c.slug === collection)
    if (!colConfig) throw new NotFoundError('Collection', collection)

    const contentService = new ContentService(colConfig, adapter)

    // Execute publish updates via ContentService in batches of 20 to prevent connection pool exhaustion
    const BATCH_SIZE = 20
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map((id) =>
          contentService.update(id, { _status: 'published', publishedAt: new Date() } as any, { user, siteId })
        )
      )
    }

    CacheService.invalidateTag(collection)

    res.json(createResponse({ published: ids.length }))
  } catch (err) {
    next(err)
  }
})

router.post('/:collection/bulk/unpublish', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { ids } = req.body
    const { collection } = req.params
    const config = (req as any).zenith?.config
    const user = (req as any).user
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = (req as any).zenith?.adapter

    if (!adapter) {
      throw new Error('Database adapter not initialized on request context')
    }

    if (!Array.isArray(ids) || ids.length === 0)
      throw new InvalidPayloadError('"ids" array is required')

    if (user.role === 'viewer') throw new ForbiddenError('Viewer role is read-only')

    const colConfig = config?.collections?.find((c: any) => c.slug === collection)
    if (!colConfig) throw new NotFoundError('Collection', collection)

    const contentService = new ContentService(colConfig, adapter)

    const BATCH_SIZE = 20
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map((id) =>
          contentService.update(id, { _status: 'draft' } as any, { user, siteId })
        )
      )
    }

    CacheService.invalidateTag(collection)

    res.json(createResponse({ unpublished: ids.length }))
  } catch (err) {
    next(err)
  }
})

export default router
