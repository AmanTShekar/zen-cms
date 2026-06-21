import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { ValidationError, NotFoundError, ForbiddenError } from '../errors'
import { ContentService } from '../services/content'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from '../services/logger'
import { canTransition, roleFromString } from '../services/workflow-engine'

const router: import('express').Router = Router()

// All routes require authentication
router.use(requireAuth)

// ── Schemas ─────────────────────────────────────────────────────────────────

const CreateReleaseSchema = z.object({
  name: z.string().min(1, 'Release name is required').max(100),
  description: z.string().max(500).optional(),
  scheduledAt: z.string().datetime().optional(),
  siteId: z.string().optional(),
})

const AddDocumentSchema = z.object({
  collectionSlug: z.string().min(1),
  documentId: z.string().min(1),
  title: z.string(),
  siteId: z.string().optional(),
})

const UpdateReleaseSchema = CreateReleaseSchema.partial()
  .merge(
    z.object({
      status: z.enum(['pending', 'published', 'failed']).optional(),
    })
  )

// ── Helpers ────────────────────────────────────────────────────────────────────

export async function publishReleaseContent(
  release: any,
  adapter: any,
  config: any,
  user: any,
  siteId: string
): Promise<{ success: boolean; error?: string }> {
  const errors: string[] = []
  const userRole = roleFromString(user?.role)

  for (const doc of release.documents || []) {
    try {
      const col = (config.collections || []).find((c: any) => c.slug === doc.collectionSlug)
      if (!col) {
        errors.push(`Collection "${doc.collectionSlug}" not found`)
        continue
      }

      // Workflow: validate the transition before publishing
      const contentService = new ContentService(col, adapter)
      const current = await contentService.findById(doc.documentId, { siteId })
      const currentStatus = ((current as any)?._status as string) || 'draft'

      const transition = canTransition(
        currentStatus as any,
        'published',
        userRole
      )
      if (!transition.valid) {
        errors.push(`${doc.title}: ${transition.reason}`)
        continue
      }

      await contentService.update(doc.documentId, { _status: 'published' }, { user, siteId })
      logger.info(`[Release:${release.name}] Published document "${doc.title}" (${doc.documentId})`)
    } catch (err: any) {
      logger.error({ err }, `[Release:${release.name}] Failed to publish ${doc.collectionSlug}/${doc.documentId}`)
      errors.push(`${doc.title}: ${err.message}`)
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') }
  }
  return { success: true }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/v1/releases — list all releases
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20')))
    const skip = (page - 1) * pageSize
    const siteId = (req.headers['x-zenith-site-id'] as string) || undefined

    const filter: Record<string, unknown> = {}
    // ISOLATION FIX: always scope to siteId for tenant isolation
    if (siteId) filter.siteId = siteId
    if (req.query.status) filter.status = req.query.status

    const adapter = AdapterFactory.getActiveAdapter()
    const [releases, total] = await Promise.all([
      adapter.find('z_releases', filter, { sort: { createdAt: -1 }, limit: pageSize, skip }),
      adapter.count('z_releases', filter),
    ])

    res.json(
      createResponse(releases, {
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      })
    )
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/releases — create a release
router.post('/', async (req, res, next) => {
  try {
    const validation = CreateReleaseSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(
        Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
          field: f,
          message: (m as string[])[0],
        }))
      )
    }

    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    if (siteId) {
      validation.data.siteId = siteId // Override payload with verified header
    } else {
      delete validation.data.siteId // Prevent injection
    }

    const adapter = AdapterFactory.getActiveAdapter()
    const release = await adapter.create('z_releases', {
      ...validation.data,
      documents: [],
      status: 'pending',
      createdBy: (req as any).user?.email,
    })

    logger.info(`[Releases] Created release "${validation.data.name}"`)
    res.status(201).json(createResponse(release))
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/releases/:id — get a release with its documents
router.get('/:id', async (req, res, next) => {
  try {
    const siteId = (req.headers['x-zenith-site-id'] as string) || undefined
    const adapter = AdapterFactory.getActiveAdapter()
    // ISOLATION FIX: scope by siteId to prevent cross-tenant release access
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const release = await adapter.findOne('z_releases', filter)
    if (!release) throw new NotFoundError('Release', req.params.id)

    res.json(createResponse(release))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/releases/:id — update a release
router.patch('/:id', async (req, res, next) => {
  try {
    const validation = UpdateReleaseSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(
        Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
          field: f,
          message: (m as string[])[0],
        }))
      )
    }

    const siteId = (req.headers['x-zenith-site-id'] as string) || undefined
    const adapter = AdapterFactory.getActiveAdapter()
    // ISOLATION FIX: scope by siteId
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const existing = await adapter.findOne<Record<string, any>>('z_releases', filter)
    if (!existing) throw new NotFoundError('Release', req.params.id)

    const updated = await adapter.update('z_releases', req.params.id, {
      ...validation.data,
      siteId: siteId || existing.siteId // Prevent siteId hijacking
    })
    res.json(createResponse(updated))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/releases/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const siteId = (req.headers['x-zenith-site-id'] as string) || undefined
    const adapter = AdapterFactory.getActiveAdapter()
    // ISOLATION FIX: scope by siteId
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const release = await adapter.findOne('z_releases', filter)
    if (!release) throw new NotFoundError('Release', req.params.id)

    if ((release as any).status === 'published') {
      throw new ForbiddenError('Cannot delete a published release. Unpublish it first.')
    }

    await adapter.delete('z_releases', req.params.id)
    logger.info(`[Releases] Deleted release "${(release as any).name}"`)

    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/releases/:id/documents — add a document to a release
router.post('/:id/documents', async (req, res, next) => {
  try {
    const validation = AddDocumentSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(
        Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
          field: f,
          message: (m as string[])[0],
        }))
      )
    }

    const siteId = (req.headers['x-zenith-site-id'] as string) || undefined
    const adapter = AdapterFactory.getActiveAdapter()
    // ISOLATION FIX: scope by siteId
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const release = await adapter.findOne('z_releases', filter)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if ((release as any).status !== 'pending') {
      throw new ForbiddenError('Can only add documents to a pending release.')
    }

    // Prevent duplicate entries
    const existingDocs = (release as any).documents || []
    const alreadyAdded = existingDocs.some(
      (d: any) => d.collectionSlug === validation.data.collectionSlug && d.documentId === validation.data.documentId
    )
    if (alreadyAdded) {
      throw new ValidationError([{ field: 'document', message: 'This document is already in the release.' }])
    }

    const newDoc = {
      ...validation.data,
      addedAt: new Date(),
      addedBy: (req as any).user?.email,
    }

    const updated = await adapter.update('z_releases', req.params.id, {
      documents: [...existingDocs, newDoc],
    })

    res.json(createResponse(updated))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/releases/:id/documents/:documentId — remove a document from a release
router.delete('/:id/documents/:documentId', async (req, res, next) => {
  try {
    const siteId = (req.headers['x-zenith-site-id'] as string) || undefined
    const adapter = AdapterFactory.getActiveAdapter()
    // ISOLATION FIX: scope by siteId
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const release = await adapter.findOne('z_releases', filter)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if ((release as any).status !== 'pending') {
      throw new ForbiddenError('Can only remove documents from a pending release.')
    }

    const existingDocs = (release as any).documents || []
    const docIndex = existingDocs.findIndex(
      (d: any) => d.documentId === req.params.documentId
    )
    if (docIndex === -1) throw new NotFoundError('Release document', req.params.documentId)

    const updatedDocs = [...existingDocs]
    updatedDocs.splice(docIndex, 1)

    const updated = await adapter.update('z_releases', req.params.id, { documents: updatedDocs })

    res.json(createResponse(updated))
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/releases/:id/publish — publish all documents in a release
router.post('/:id/publish', async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = AdapterFactory.getActiveAdapter()
    // ISOLATION FIX: scope by siteId
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const release = await adapter.findOne('z_releases', filter)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if ((release as any).status === 'published') {
      throw new ForbiddenError('Release is already published.')
    }

    // Verify scheduled time if scheduled
    if ((release as any).scheduledAt && new Date((release as any).scheduledAt) > new Date()) {
      throw new ValidationError([
        { field: 'scheduledAt', message: 'Scheduled release time has not been reached yet.' },
      ])
    }

    const config = (req as any).zenith?.config || {}

    const result = await publishReleaseContent(
      release,
      adapter,
      config,
      (req as any).user,
      req.headers['x-zenith-site-id'] as string
    )

    if (result.success) {
      const updated = await adapter.update('z_releases', req.params.id, {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: (req as any).user?.email,
      })
      logger.info(`[Releases] Published release "${(release as any).name}" with ${((release as any).documents || []).length} documents`)
      res.json(createResponse(updated))
    } else {
      const updated = await adapter.update('z_releases', req.params.id, {
        status: 'failed',
        failureReason: result.error,
      })
      throw new ValidationError([{ field: 'publish', message: result.error || 'Release publish failed.' }])
    }
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/releases/:id/unpublish — unpublish (revert to draft)
router.post('/:id/unpublish', async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = AdapterFactory.getActiveAdapter()
    // ISOLATION FIX: scope by siteId
    const filter: Record<string, unknown> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const release = await adapter.findOne('z_releases', filter)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if ((release as any).status !== 'published') {
      throw new ForbiddenError('Only published releases can be unpublished.')
    }

    const config = (req as any).zenith?.config || {}

    for (const doc of (release as any).documents || []) {
      try {
        const col = (config.collections || []).find(
          (c: any) => c.slug === doc.collectionSlug
        )
        if (!col) continue

        const contentService = new ContentService(col, adapter)
        await contentService.update(doc.documentId, { _status: 'draft' }, {
          user: (req as any).user,
          siteId: req.headers['x-zenith-site-id'] as string,
        })
      } catch (err) {
        logger.error({ err }, `[Release:unpublish] Failed to unpublish ${doc.collectionSlug}/${doc.documentId}`)
      }
    }

    const updated = await adapter.update('z_releases', req.params.id, {
      status: 'pending',
      publishedAt: undefined,
      publishedBy: undefined,
      failureReason: undefined,
    })

    res.json(createResponse(updated))
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/releases/collections/:slug/pending — get pending items that can be added to a release
router.get('/collections/:slug/pending', async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter = AdapterFactory.getActiveAdapter()
    const config = (req as any).zenith?.config || {}
    const col = (config.collections || []).find(
      (c: any) => c.slug === req.params.slug
    )
    if (!col) throw new NotFoundError('Collection', req.params.slug)

    const contentService = new ContentService(col, adapter)

    // ISOLATION FIX: always pass siteId to scope results to the caller's tenant
    const docs = await contentService.find(
      {},
      {
        user: (req as any).user,
        siteId,
        limit: 50,
        select: ['_id', 'title', 'slug', 'status', 'updatedAt'],
      } as any
    )

    // Filter to only pending items (draft, in_review, etc.)
    const pending = docs.filter(
      (d: any) => d._status !== 'published' && d._status !== undefined
    )

    res.json(createResponse(pending))
  } catch (err) {
    next(err)
  }
})

export default router