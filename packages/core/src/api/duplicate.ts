import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { NotFoundError } from '../errors'
import { ContentService } from '../services/content'
import { CacheService } from '../services/cache'

const router: Router = Router()
router.use(requireAuth)

/**
 * Duplicate Document API
 * ──────────────────────
 * Inspired by Payload's duplicateDocument feature.
 * POST /api/v1/:collection/:id/duplicate
 * Creates a deep copy of a document with a new "_id" and clears any unique fields.
 */
router.post('/:collection/:id/duplicate', async (req: Request, res: Response, next) => {
  try {
    const { collection, id } = req.params
    const config = (req as any).zenith?.config
    const user = (req as any).user
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = (req as any).zenith?.adapter

    if (!adapter) {
      throw new Error('Database adapter not initialized on request context')
    }

    const colConfig = config?.collections?.find((c: any) => c.slug === collection)
    if (!colConfig) throw new NotFoundError('Collection', collection)

    const contentService = new ContentService(colConfig, adapter)
    const original = await contentService.findById(id, { user, siteId })
    if (!original) throw new NotFoundError(collection, id)

    // Strip _id, unique fields, and system timestamps to create a clean copy
    const { _id, id: _pid, __v, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = original as any

    // Clear or modify fields marked as unique to avoid constraint violations based on type
    colConfig.fields.forEach((field: any) => {
      if (field.unique && data[field.name] !== undefined) {
        if (field.type === 'text' || field.type === 'textarea') {
          data[field.name] = `${data[field.name]} (Copy)`
        } else if (field.type === 'slug') {
          data[field.name] = `${data[field.name]}-copy`
        } else {
          // For numbers or other types, clear them so the user must fill them manually
          data[field.name] = undefined
        }
      }
    })

    // If drafts are enabled, start as draft
    if (colConfig.drafts) {
      data._status = 'draft'
    }

    const duplicate = await contentService.create(data, { user, siteId })
    CacheService.invalidateTag(collection)

    res.status(201).json(createResponse(duplicate))
  } catch (err) {
    next(err)
  }
})

export default router
