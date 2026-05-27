import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { ValidationError, NotFoundError, ForbiddenError } from '../errors'
import { ReleaseModel } from '../database/release-model'
import { ContentService } from '../services/content'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from '../services/logger'
import { canTransition, roleFromString } from '../services/workflow-engine'

const router = Router()

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

// ── Helpers ───────────────────────────────────────────────────────────────────

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

    const filter: any = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.siteId) filter.siteId = req.query.siteId

    const [releases, total] = await Promise.all([
      ReleaseModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      ReleaseModel.countDocuments(filter),
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

    const release = await ReleaseModel.create({
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
    const release = await ReleaseModel.findById(req.params.id).lean()
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

    const release = await ReleaseModel.findByIdAndUpdate(
      req.params.id,
      { $set: validation.data },
      { new: true, runValidators: true }
    ).lean()

    if (!release) throw new NotFoundError('Release', req.params.id)

    res.json(createResponse(release))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/releases/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const release = await ReleaseModel.findById(req.params.id)
    if (!release) throw new NotFoundError('Release', req.params.id)

    if (release.status === 'published') {
      throw new ForbiddenError('Cannot delete a published release. Unpublish it first.')
    }

    await ReleaseModel.findByIdAndDelete(req.params.id)
    logger.info(`[Releases] Deleted release "${release.name}"`)

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

    const release = await ReleaseModel.findById(req.params.id)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if (release.status !== 'pending') {
      throw new ForbiddenError('Can only add documents to a pending release.')
    }

    // Prevent duplicate entries
    const alreadyAdded = release.documents.some(
      (d) => d.collectionSlug === validation.data.collectionSlug && d.documentId === validation.data.documentId
    )
    if (alreadyAdded) {
      throw new ValidationError([{ field: 'document', message: 'This document is already in the release.' }])
    }

    release.documents.push({
      ...validation.data,
      addedAt: new Date(),
      addedBy: (req as any).user?.email,
    })
    await release.save()

    res.json(createResponse(release))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/releases/:id/documents/:documentId — remove a document from a release
router.delete('/:id/documents/:documentId', async (req, res, next) => {
  try {
    const release = await ReleaseModel.findById(req.params.id)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if (release.status !== 'pending') {
      throw new ForbiddenError('Can only remove documents from a pending release.')
    }

    const docIndex = release.documents.findIndex(
      (d) => d.documentId === req.params.documentId
    )
    if (docIndex === -1) throw new NotFoundError('Release document', req.params.documentId)

    release.documents.splice(docIndex, 1)
    await release.save()

    res.json(createResponse(release))
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/releases/:id/publish — publish all documents in a release
router.post('/:id/publish', async (req, res, next) => {
  try {
    const release = await ReleaseModel.findById(req.params.id)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if (release.status === 'published') {
      throw new ForbiddenError('Release is already published.')
    }

    // Verify scheduled time if scheduled
    if (release.scheduledAt && new Date(release.scheduledAt) > new Date()) {
      throw new ValidationError([
        { field: 'scheduledAt', message: 'Scheduled release time has not been reached yet.' },
      ])
    }

    const adapter = AdapterFactory.getActiveAdapter()
    const config = (req as any).zenith?.config || {}

    const result = await publishReleaseContent(
      release,
      adapter,
      config,
      (req as any).user,
      req.headers['x-zenith-site-id'] as string
    )

    if (result.success) {
      release.status = 'published'
      release.publishedAt = new Date()
      release.publishedBy = (req as any).user?.email
      await release.save()

      logger.info(`[Releases] Published release "${release.name}" with ${release.documents.length} documents`)
      res.json(createResponse(release))
    } else {
      release.status = 'failed'
      release.failureReason = result.error
      await release.save()

      throw new ValidationError([{ field: 'publish', message: result.error || 'Release publish failed.' }])
    }
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/releases/:id/unpublish — unpublish (revert to draft)
router.post('/:id/unpublish', async (req, res, next) => {
  try {
    const release = await ReleaseModel.findById(req.params.id)
    if (!release) throw new NotFoundError('Release', req.params.id)
    if (release.status !== 'published') {
      throw new ForbiddenError('Only published releases can be unpublished.')
    }

    const adapter = AdapterFactory.getActiveAdapter()
    const config = (req as any).zenith?.config || {}

    for (const doc of release.documents || []) {
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

    release.status = 'pending'
    release.publishedAt = undefined
    release.publishedBy = undefined
    release.failureReason = undefined
    await release.save()

    res.json(createResponse(release))
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/releases/collections/:slug/pending — get pending items that can be added to a release
router.get('/collections/:slug/pending', async (req, res, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const config = (req as any).zenith?.config || {}
    const col = (config.collections || []).find(
      (c: any) => c.slug === req.params.slug
    )
    if (!col) throw new NotFoundError('Collection', req.params.slug)

    const contentService = new ContentService(col, adapter)

    // Return all non-published documents for the collection
    const docs = await contentService.find(
      {},
      {
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