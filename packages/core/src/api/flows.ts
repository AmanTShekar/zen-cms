import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { NotFoundError, ValidationError } from '../errors'

const FlowSchema = z.object({
  name: z.string().min(1, 'Flow name is required'),
}).passthrough()

const router: Router = Router()

// ── GET /api/v1/flows ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const flows = await adapter.find('flows', {}, { sort: { createdAt: -1 } })
    res.json(createResponse(flows))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/flows/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const flow = await adapter.findOne('flows', { _id: req.params.id })
    if (!flow) throw new NotFoundError('Flow', req.params.id)
    res.json(createResponse(flow))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/flows ───────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    
    const validation = FlowSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(
        Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
          field: f,
          message: (m as string[])[0],
        }))
      )
    }

    const flow = await adapter.create('flows', validation.data)
    res.status(201).json(createResponse(flow))
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/v1/flows/:id ──────────────────────────────────────────────────
router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter = (req as any).zenith?.adapter
      
      const validation = FlowSchema.partial().safeParse(req.body)
      if (!validation.success) {
        throw new ValidationError(
          Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
            field: f,
            message: (m as string[])[0],
          }))
        )
      }

      const flow = await adapter.update('flows', req.params.id, validation.data)
      if (!flow) throw new NotFoundError('Flow', req.params.id)
      res.json(createResponse(flow))
    } catch (err) {
      next(err)
    }
  }
)

// ── DELETE /api/v1/flows/:id ─────────────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter = (req as any).zenith?.adapter
      const deleted = await adapter.delete('flows', req.params.id)
      if (!deleted) throw new NotFoundError('Flow', req.params.id)
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  }
)

export default router
