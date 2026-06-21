import { Router, Request, Response } from 'express'
import { logger } from '../services/logger'
import { z } from 'zod'
import { InvalidPayloadError, NotFoundError, DuplicateError, AuthenticationError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'

const router: import('express').Router = Router()

const TEMPLATES_COLLECTION = 'templates'

const getAdapter = (req: Request): DatabaseAdapter =>
  (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

const CreateTemplateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  blockType: z.string().min(1),
  content: z.record(z.any()),
  thumbnail: z.string().optional(),
  isSystem: z.boolean().optional(),
})

const UpdateTemplateSchema = CreateTemplateSchema.partial()

const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) throw new AuthenticationError()
  next()
}

// GET /api/v1/templates?blockType=hero
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const { blockType, page = '1', limit = '50' } = req.query
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const filter: Record<string, any> = { siteId }
    if (blockType) filter.blockType = blockType

    const pageNum = parseInt(page as string)
    const limitNum = Math.min(parseInt(limit as string), 100)

    const templates = await adapter.find<Record<string, any>>(TEMPLATES_COLLECTION, filter, {
      sort: { usageCount: -1, createdAt: -1 },
      skip: (pageNum - 1) * limitNum,
      limit: limitNum
    })
    
    // In Drizzle this might be expensive to count, but following original contract:
    const allMatching = await adapter.find<Record<string, any>>(TEMPLATES_COLLECTION, filter)
    const total = allMatching.length

    res.json({
      data: templates,
      meta: { total, page: pageNum, pageSize: limitNum, pageCount: Math.ceil(total / limitNum) },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/templates/:id
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const template = await adapter.findOne<Record<string, any>>(TEMPLATES_COLLECTION, { _id: req.params.id, siteId })
    if (!template) throw new NotFoundError('Template', req.params.id)

    res.json({ data: template })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/templates
router.post('/', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const parsed = CreateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new InvalidPayloadError('Validation failed', parsed.error.flatten())
    }

    const existing = await adapter.findOne<Record<string, any>>(TEMPLATES_COLLECTION, { slug: parsed.data.slug, siteId })
    if (existing) throw new DuplicateError('slug')

    const templateData = {
      ...parsed.data,
      siteId,
      createdBy: (req.user as any)?.id || (req.user as any)?._id || 'unknown',
      usageCount: 0,
      isSystem: parsed.data.isSystem || false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const template = await adapter.create<Record<string, any>>(TEMPLATES_COLLECTION, templateData)

    logger.info(`[Templates] Created template "${parsed.data.name}" (${template._id || template.id})`)
    res.status(201).json({ data: template })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/templates/:id
router.put('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const parsed = UpdateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new InvalidPayloadError('Validation failed', parsed.error.flatten())
    }

    const existing = await adapter.findOne<Record<string, any>>(TEMPLATES_COLLECTION, { _id: req.params.id, siteId })
    if (!existing) throw new NotFoundError('Template', req.params.id)

    const updatedTemplate = await adapter.update(TEMPLATES_COLLECTION, req.params.id, {
      ...parsed.data,
      updatedAt: new Date()
    })

    res.json({ data: updatedTemplate })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/templates/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const existing = await adapter.findOne<Record<string, any>>(TEMPLATES_COLLECTION, { _id: req.params.id, siteId })
    if (!existing) throw new NotFoundError('Template', req.params.id)

    await adapter.delete(TEMPLATES_COLLECTION, req.params.id)

    logger.info({ templateId: req.params.id }, '[Templates] Deleted')
    res.json({ data: { deleted: true } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/templates/:id/clone — duplicate a template
router.post('/:id/clone', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const original = await adapter.findOne<Record<string, any>>(TEMPLATES_COLLECTION, { _id: req.params.id, siteId })
    if (!original) throw new NotFoundError('Template', req.params.id)

    const slugSuffix = Date.now()
    const cloneData = {
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy-${slugSuffix}`,
      description: original.description,
      blockType: original.blockType,
      content: original.content,
      thumbnail: original.thumbnail,
      isSystem: false,
      usageCount: 0,
      siteId,
      createdBy: (req.user as any)?.id || (req.user as any)?._id,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const clone = await adapter.create(TEMPLATES_COLLECTION, cloneData)

    res.status(201).json({ data: clone })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/templates/:id/use — increment usage counter
router.post('/:id/use', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const existing = await adapter.findOne<Record<string, any>>(TEMPLATES_COLLECTION, { _id: req.params.id, siteId })
    if (!existing) throw new NotFoundError('Template', req.params.id)

    const newUsageCount = (existing.usageCount || 0) + 1
    const updatedTemplate = await adapter.update(TEMPLATES_COLLECTION, req.params.id, { usageCount: newUsageCount })

    res.json({ data: { usageCount: newUsageCount } })
  } catch (err) {
    next(err)
  }
})

export default router
