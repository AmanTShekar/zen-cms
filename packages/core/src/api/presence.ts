import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { PresenceService } from '../services/presence'
import { InvalidPayloadError } from '../errors'

const router: Router = Router()
router.use(requireAuth)

/**
 * Zenith Presence / Content Locking API
 * ──────────────────────────────────────────────────────────────────
 * Tells editors who else is viewing or editing the same document.
 * Prevents conflicting edits ("Sarah is editing this").
 *
 * POST /api/v1/presence/heartbeat   — "I'm still editing this doc"
 * GET  /api/v1/presence/:collection/:id — Who else is here?
 * DELETE /api/v1/presence/:collection/:id — I'm done editing
 */

router.get('/', async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const users = await PresenceService.getAllActiveUsers(siteId)
    
    // Attach customized colors from the users table
    const { AdapterFactory } = await import('../database/adapters/AdapterFactory')
    const adapter = AdapterFactory.getActiveAdapter()
    
    const enrichedUsers = await Promise.all(users.map(async (u) => {
      try {
        const profile = await adapter.find<Record<string, unknown>>('users', { email: u.email })
        if (profile && profile.length > 0) {
          return { ...u, color: profile[0].color, role: profile[0].role }
        }
      } catch (e) {
        // ignore
      }
      return u
    }))
    
    res.json(createResponse(enrichedUsers))
  } catch (err) {
    next(err)
  }
})

router.post('/heartbeat', async (req: Request, res: Response, next) => {
  try {
    const { collection, documentId } = req.body
    if (!collection || !documentId) {
      throw new InvalidPayloadError('"collection" and "documentId" are required')
    }

    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    await PresenceService.heartbeat(user.id, user.email, collection, documentId, siteId)
    res.json(createResponse({ ok: true }))
  } catch (err) {
    next(err)
  }
})

router.get('/:collection/:id', async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const users = await PresenceService.getActiveUsers(req.params.collection, req.params.id, siteId)
    const currentUserId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id

    // Filter out the current user from the response (they know they're here)
    const others = users.filter((u) => u.id !== currentUserId)

    const { AdapterFactory } = await import('../database/adapters/AdapterFactory')
    const adapter = AdapterFactory.getActiveAdapter()

    const enrichedOthers = await Promise.all(others.map(async (u) => {
      try {
        const profile = await adapter.find<Record<string, unknown>>('users', { email: u.email })
        if (profile && profile.length > 0) {
          return { ...u, color: profile[0].color, role: profile[0].role }
        }
      } catch (e) {
        // ignore
      }
      return u
    }))

    res.json(
      createResponse({
        isLocked: enrichedOthers.length > 0,
        activeUsers: enrichedOthers,
        message:
          enrichedOthers.length > 0
            ? `${enrichedOthers.map((u) => u.email?.split('@')[0]).join(', ')} ${enrichedOthers.length === 1 ? 'is' : 'are'} also editing this document`
            : null,
      })
    )
  } catch (err) {
    next(err)
  }
})

router.delete('/:collection/:id', async (req: Request, res: Response, next) => {
  try {
    // The database TTL will expire the presence automatically,
    // but we can call leave immediately for a snappier UX
    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    await PresenceService.leave(user.id, req.params.collection, req.params.id, siteId)
    res.json(createResponse({ ok: true }))
  } catch (err) {
    next(err)
  }
})

export default router
