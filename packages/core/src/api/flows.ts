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

// ── POST /api/v1/flows/:id/test ──────────────────────────────────────────────
// Executes a flow with a synthetic test payload and streams back execution logs
router.post(
  '/:id/test',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter = (req as any).zenith?.adapter
      const flow = await adapter.findOne('flows', { _id: req.params.id })
      if (!flow) throw new NotFoundError('Flow', req.params.id)

      const testPayload = req.body?.payload || { test: true, timestamp: new Date().toISOString() }
      const logs: Array<{ level: string; msg: string }> = []

      logs.push({ level: 'info', msg: `Starting test run for "${flow.name}"` })
      logs.push({ level: 'info', msg: `Trigger type: ${flow.nodes?.find((n: any) => n.type === 'trigger')?.data?.triggerType || 'webhook'}` })
      logs.push({ level: 'info', msg: `Graph: ${flow.nodes?.length || 0} nodes, ${flow.edges?.length || 0} edges` })

      // Dry-run: trace the graph without actually calling external services
      const nodes: any[] = flow.nodes || []
      const edges: any[] = flow.edges || []
      const triggerNode = nodes.find((n: any) => n.type === 'trigger')
      
      if (!triggerNode) {
        logs.push({ level: 'error', msg: 'No trigger node found in flow' })
      } else {
        const visited = new Set<string>()
        const queue = [triggerNode]

        while (queue.length > 0) {
          const current = queue.shift()
          if (visited.has(current.id)) {
            logs.push({ level: 'error', msg: `Cycle detected at node ${current.id}` })
            break
          }
          visited.add(current.id)

          if (current.type === 'action') {
            const actionType = current.data?.actionType || 'unknown'
            logs.push({ level: 'info', msg: `[DRY RUN] Would execute "${current.data?.label || actionType}" (${actionType})` })

            // Validate required fields per action type
            if (actionType === 'http' && !current.data?.url) {
              logs.push({ level: 'error', msg: `  ⚠ HTTP node "${current.data?.label}" is missing endpoint URL` })
            } else if (actionType === 'slack' && !current.data?.webhookUrl) {
              logs.push({ level: 'error', msg: `  ⚠ Slack node "${current.data?.label}" is missing webhook URL` })
            } else if (actionType === 'email' && (!current.data?.to || !current.data?.subject)) {
              logs.push({ level: 'error', msg: `  ⚠ Email node "${current.data?.label}" is missing To or Subject` })
            } else if (actionType === 'update_content' && !current.data?.collection) {
              logs.push({ level: 'error', msg: `  ⚠ Database node "${current.data?.label}" is missing collection slug` })
            } else {
              logs.push({ level: 'success', msg: `  ✓ Node "${current.data?.label || actionType}" configuration looks valid` })
            }
          }

          const children = edges
            .filter((e: any) => e.source === current.id)
            .map((e: any) => nodes.find((n: any) => n.id === e.target))
            .filter(Boolean)
          queue.push(...children)
        }

        logs.push({ level: 'success', msg: `Test run complete — ${visited.size} nodes evaluated` })
      }

      res.json(createResponse({ logs, testPayload }))
    } catch (err) {
      next(err)
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

// ── POST /api/v1/hooks/:id ───────────────────────────────────────────────────
router.post('/hooks/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as any).zenith?.adapter
    const flow = await adapter.findOne('flows', { _id: req.params.id })
    if (!flow) throw new NotFoundError('Flow', req.params.id)

    // Trigger flow execution asynchronously
    // In a real system, this would queue a background job
    res.status(202).json(createResponse({ accepted: true }))
  } catch (err) {
    next(err)
  }
})

export default router
