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
    const siteId = req.headers['x-zenith-site-id'] as string
    const query = siteId ? { siteId } : {}
    const flows = await adapter.find('flows', query, { sort: { createdAt: -1 } })
    res.json(createResponse(flows))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/flows/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    const query: any = { _id: req.params.id }
    if (siteId) query.siteId = siteId

    const flow = await adapter.findOne('flows', query)
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

    const siteId = req.headers['x-zenith-site-id'] as string
    const payload = { ...validation.data }
    if (siteId) payload.siteId = siteId

    const flow = await adapter.create('flows', payload)
    res.status(201).json(createResponse(flow))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/flows/:id/logs ──────────────────────────────────────────────────
router.get(
  '/:id/logs',
  requireAuth,
  async (req: Request, res: Response, next) => {
    try {
      const adapter = (req as any).zenith?.adapter
      const siteId = req.headers['x-zenith-site-id'] as string
      
      // ISOLATION FIX: verify the parent flow belongs to this tenant before fetching its logs
      const flowQuery: any = { _id: req.params.id }
      if (siteId) flowQuery.siteId = siteId
      const flow = await adapter.findOne('flows', flowQuery)
      if (!flow) throw new NotFoundError('Flow', req.params.id)

      // Fetch runs for this verified flow
      const runs = await adapter.find('z_flow_runs', { flowId: req.params.id }, { sort: { createdAt: -1 }, limit: 20 })
      
      // Fetch logs for these runs — avoid MongoDB-specific $in for adapter compat
      const runIds = runs.map((r: any) => String(r._id || r.id))
      const logs = runIds.length > 0
        ? (await Promise.all(
            runIds.map((rid: string) =>
              adapter.find('z_flow_logs', { runId: rid }, { sort: { timestamp: -1 }, limit: 20 })
            )
          )).flat().slice(0, 100)
        : []
      
      res.json(createResponse({ runs, logs }))
    } catch (err) {
      next(err)
    }
  }
)

// ── POST /api/v1/flows/:id/test ──────────────────────────────────────────────
router.post(
  '/:id/test',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter = (req as any).zenith?.adapter
      const siteId = req.headers['x-zenith-site-id'] as string
      const query: any = { _id: req.params.id }
      if (siteId) query.siteId = siteId

      const flow = await adapter.findOne('flows', query)
      if (!flow) throw new NotFoundError('Flow', req.params.id)

      const testPayload = req.body?.payload || { test: true, timestamp: new Date().toISOString() }
      
      // Import dynamically to avoid circular dependencies if any
      const { FlowEngine } = await import('../services/flow-engine')
      
      // Kick off a real test run
      const runId = await FlowEngine.createRun(flow, testPayload)
      // Process it completely in the background
      FlowEngine.processRun(runId).catch((err: any) => console.error(err))
      
      // Just return success and let the frontend poll logs
      res.json(createResponse({ runId, message: 'Test execution started. Check logs for details.' }))
    } catch (err: any) {
      // Send error back to frontend to debug
      res.status(500).json({ error: err.message, stack: err.stack, success: false })
    }
  }
)

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

      const siteId = req.headers['x-zenith-site-id'] as string
      const query: any = { _id: req.params.id }
      if (siteId) query.siteId = siteId

      // Check if it exists for this site first
      const existingFlow = await adapter.findOne('flows', query)
      if (!existingFlow) throw new NotFoundError('Flow', req.params.id)

      const flow = await adapter.update('flows', req.params.id, validation.data)
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
      const siteId = req.headers['x-zenith-site-id'] as string
      const query: any = { _id: req.params.id }
      if (siteId) query.siteId = siteId

      // Verify ownership before deleting
      const existingFlow = await adapter.findOne('flows', query)
      if (!existingFlow) throw new NotFoundError('Flow', req.params.id)

      const deleted = await adapter.delete('flows', req.params.id)
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  }
)

// ── POST /api/v1/hooks/:id ───────────────────────────────────────────────────
router.post('/hooks/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    const query: any = { _id: req.params.id }
    if (siteId) query.siteId = siteId

    const flow = await adapter.findOne('flows', query)
    if (!flow) throw new NotFoundError('Flow', req.params.id)
    if (!flow.active) return res.status(400).json({ success: false, message: 'Automation is disabled' })

    const { FlowEngine } = await import('../services/flow-engine')
    
    // Kick off real durable execution using the inbound payload
    const runId = await FlowEngine.createRun(flow, req.body || {})
    FlowEngine.processRun(runId).catch((err: any) => console.error(err))

    res.status(202).json(createResponse({ accepted: true, runId }))
  } catch (err) {
    next(err)
  }
})

export default router
