import { Router } from 'express'
import { Template } from '../database/template-model'
import { logger } from '../services/logger'
import { z } from 'zod'
import { InvalidPayloadError, NotFoundError, DuplicateError, AuthenticationError, isZenithError } from '../errors'

const router = Router()

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
router.get('/', async (req, res, next) => {
  try {
    const { blockType, page = '1', limit = '50' } = req.query
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const filter: Record<string, any> = { siteId }
    if (blockType) filter.blockType = blockType

    const pageNum = parseInt(page as string)
    const limitNum = Math.min(parseInt(limit as string), 100)

    const [templates, total] = await Promise.all([
      Template.find(filter)
        .sort({ usageCount: -1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Template.countDocuments(filter),
    ])

    res.json({
      data: templates,
      meta: { total, page: pageNum, pageSize: limitNum, pageCount: Math.ceil(total / limitNum) },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/templates/:id
router.get('/:id', async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const template = await Template.findOne({ _id: req.params.id, siteId }).lean()
    if (!template) throw new NotFoundError('Template', req.params.id)

    res.json({ data: template })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/templates
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const parsed = CreateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new InvalidPayloadError('Validation failed', parsed.error.flatten())
    }

    const existing = await Template.findOne({ slug: parsed.data.slug, siteId })
    if (existing) throw new DuplicateError('slug')

    const template = await Template.create({
      ...parsed.data,
      siteId,
      createdBy: (req.user as any)?.id || (req.user as any)?._id || 'unknown',
    })

    logger.info(`[Templates] Created template "${parsed.data.name}" (${template._id})`)
    res.status(201).json({ data: template })
  } catch (err) {
    next(err)
  }
})

// PUT /api/v1/templates/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const parsed = UpdateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new InvalidPayloadError('Validation failed', parsed.error.flatten())
    }

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, siteId },
      { $set: { ...parsed.data, updatedAt: new Date() } },
      { new: true, lean: true }
    )

    if (!template) throw new NotFoundError('Template', req.params.id)
    res.json({ data: template })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/templates/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const result = await Template.deleteOne({ _id: req.params.id, siteId })
    if (result.deletedCount === 0) throw new NotFoundError('Template', req.params.id)

    logger.info({ templateId: req.params.id }, '[Templates] Deleted')
    res.json({ data: { deleted: true } })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/templates/:id/clone — duplicate a template
router.post('/:id/clone', requireAuth, async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const original = await Template.findOne({ _id: req.params.id, siteId }).lean()
    if (!original) throw new NotFoundError('Template', req.params.id)

    const slugSuffix = Date.now()
    const clone = await Template.create({
      name: `${original.name} (Copy)`,
      slug: `${original.slug}-copy-${slugSuffix}`,
      description: original.description,
      blockType: original.blockType,
      content: original.content,
      thumbnail: original.thumbnail,
      isSystem: false,
      siteId,
      createdBy: (req.user as any)?.id || (req.user as any)?._id,
    })

    res.status(201).json({ data: clone })
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/templates/:id/use — increment usage counter
router.post('/:id/use', async (req, res, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('Missing X-Zenith-Site-Id')

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, siteId },
      { $inc: { usageCount: 1 } },
      { new: true, lean: true }
    )
    if (!template) throw new NotFoundError('Template', req.params.id)

    res.json({ data: { usageCount: template.usageCount } })
  } catch (err) {
    next(err)
  }
})

export default router
