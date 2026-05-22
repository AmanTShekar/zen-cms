import { Router } from 'express'
import { Template } from '../database/template-model'
import { logger } from '../services/logger'
import { z } from 'zod'

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
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// GET /api/v1/templates?blockType=hero
router.get('/', async (req, res) => {
  try {
    const { blockType, page = '1', limit = '50' } = req.query
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing X-Zenith-Site-Id' })

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
  } catch (err: any) {
    logger.error({ err: err.message }, '[Templates] GET list failed')
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})

// GET /api/v1/templates/:id
router.get('/:id', async (req, res) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing X-Zenith-Site-Id' })

    const template = await Template.findOne({ _id: req.params.id, siteId }).lean()
    if (!template) return res.status(404).json({ error: 'Template not found' })

    res.json({ data: template })
  } catch (err: any) {
    logger.error({ err: err.message }, '[Templates] GET one failed')
    res.status(500).json({ error: 'Failed to fetch template' })
  }
})

// POST /api/v1/templates
router.post('/', requireAuth, async (req, res) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing X-Zenith-Site-Id' })

    const parsed = CreateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
    }

    const existing = await Template.findOne({ slug: parsed.data.slug, siteId })
    if (existing) return res.status(409).json({ error: 'Template with this slug already exists' })

    const template = await Template.create({
      ...parsed.data,
      siteId,
      createdBy: (req.user as any)?.id || (req.user as any)?._id || 'unknown',
    })

    logger.info(`[Templates] Created template "${parsed.data.name}" (${template._id})`)
    res.status(201).json({ data: template })
  } catch (err: any) {
    logger.error({ err: err.message }, '[Templates] POST failed')
    res.status(500).json({ error: 'Failed to create template' })
  }
})

// PUT /api/v1/templates/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing X-Zenith-Site-Id' })

    const parsed = UpdateTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
    }

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, siteId },
      { $set: { ...parsed.data, updatedAt: new Date() } },
      { new: true, lean: true }
    )

    if (!template) return res.status(404).json({ error: 'Template not found' })
    res.json({ data: template })
  } catch (err: any) {
    logger.error({ err: err.message }, '[Templates] PUT failed')
    res.status(500).json({ error: 'Failed to update template' })
  }
})

// DELETE /api/v1/templates/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing X-Zenith-Site-Id' })

    const result = await Template.deleteOne({ _id: req.params.id, siteId })
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Template not found' })

    logger.info({ templateId: req.params.id }, '[Templates] Deleted')
    res.json({ data: { deleted: true } })
  } catch (err: any) {
    logger.error({ err: err.message }, '[Templates] DELETE failed')
    res.status(500).json({ error: 'Failed to delete template' })
  }
})

// POST /api/v1/templates/:id/clone — duplicate a template
router.post('/:id/clone', requireAuth, async (req, res) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing X-Zenith-Site-Id' })

    const original = await Template.findOne({ _id: req.params.id, siteId }).lean()
    if (!original) return res.status(404).json({ error: 'Template not found' })

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
  } catch (err: any) {
    logger.error({ err: err.message }, '[Templates] Clone failed')
    res.status(500).json({ error: 'Failed to clone template' })
  }
})

// POST /api/v1/templates/:id/use — increment usage counter
router.post('/:id/use', async (req, res) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) return res.status(400).json({ error: 'Missing X-Zenith-Site-Id' })

    const template = await Template.findOneAndUpdate(
      { _id: req.params.id, siteId },
      { $inc: { usageCount: 1 } },
      { new: true, lean: true }
    )
    if (!template) return res.status(404).json({ error: 'Template not found' })

    res.json({ data: { usageCount: template.usageCount } })
  } catch (err: any) {
    logger.error({ err: err.message }, '[Templates] Use (increment) failed')
    res.status(500).json({ error: 'Failed to track template usage' })
  }
})

export default router