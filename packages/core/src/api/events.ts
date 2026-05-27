import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { eventHub } from '../services/event-hub'

const router = Router()
router.use(requireAuth)

/**
 * GET /api/v1/events
 *
 * Server-Sent Events (SSE) endpoint for frontends to subscribe to real-time
 * content updates. Useful for triggering Next.js ISR revalidation or updating
 * live React state without full WebSockets.
 */
router.get('/', (req: Request, res: Response) => {
  // Set headers for SSE — tie CORS to configured origins or restrict to same-origin
  const origin = req.headers.origin || ''
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || []
  const corsOrigin = allowedOrigins.includes(origin) ? origin : req.headers.host || 'same-origin'
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': allowedOrigins.length > 0 ? corsOrigin : 'same-origin',
  })

  // Send initial connection success message
  res.write('data: {"type": "connected"}\n\n')

  // Keep connection alive with heartbeats every 30s
  const heartbeat = setInterval(() => {
    res.write(':\n\n')
  }, 30000)

  // Handlers for different content events
  const onCreated = (payload: any) => {
    res.write(`event: content.created\ndata: ${JSON.stringify(payload)}\n\n`)
  }
  
  const onUpdated = (payload: any) => {
    res.write(`event: content.updated\ndata: ${JSON.stringify(payload)}\n\n`)
  }
  
  const onDeleted = (payload: any) => {
    res.write(`event: content.deleted\ndata: ${JSON.stringify(payload)}\n\n`)
  }

  // Subscribe
  eventHub.on('content.created', onCreated)
  eventHub.on('content.updated', onUpdated)
  eventHub.on('content.deleted', onDeleted)

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat)
    eventHub.off('content.created', onCreated)
    eventHub.off('content.updated', onUpdated)
    eventHub.off('content.deleted', onDeleted)
  })
})

export default router
