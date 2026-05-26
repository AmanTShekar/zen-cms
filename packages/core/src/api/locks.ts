import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { NotFoundError, ConflictError, ForbiddenError } from '../errors'

const router: Router = Router()
router.use(requireAuth)

/**
 * Document Locks API
 * ──────────────────
 * Provides explicit document locking with owned-by + TTL semantics.
 * Separate from PresenceService (soft TTL-based locking).
 *
 * GET    /api/v1/locks/:collection/:id          — get lock status
 * POST   /api/v1/locks/:collection/:id/lock     — acquire lock
 * POST   /api/v1/locks/:collection/:id/unlock   — release lock
 * POST   /api/v1/locks/:collection/:id/heartbeat — extend lock TTL
 */

const LOCK_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ── GET /api/v1/locks/:collection/:id ─────────────────────────────────────────
router.get('/:collection/:id', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    const { collection, id } = req.params

    let collectionName = collection
    let documentId = id
    if (collection === 'globals') {
      collectionName = id
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    // Verify user can read the document (enforces RLS)
    await engine.local.findById(collectionName, documentId, { user, siteId })

    const adapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const filter: Record<string, any> = { collectionName, documentId }
    if (siteId) filter.siteId = siteId

    // Expire stale locks
    await adapter.deleteMany('z_locks', {
      ...filter,
      lockExpiresAt: { $lt: new Date() }
    })

    const lock = await adapter.findOne('z_locks', filter) as any

    if (!lock) {
      return res.json(createResponse({ locked: false, lockedBy: null, lockedAt: null, lockExpiresAt: null }))
    }

    const isOwner = String(lock.lockedBy) === String(user.id || user._id)

    res.json(createResponse({
      locked: true,
      lockedBy: lock.lockedBy,
      lockedByEmail: lock.lockedByEmail,
      lockedAt: lock.lockedAt,
      lockExpiresAt: lock.lockedExpiresAt,
      isOwner,
    }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/locks/:collection/:id/lock ────────────────────────────────────
router.post('/:collection/:id/lock', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    const { collection, id } = req.params

    let collectionName = collection
    let documentId = id
    if (collection === 'globals') {
      collectionName = id
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    // Verify user can read the document (enforces RLS) — fatal for lock acquire
    await engine.local.findById(collectionName, documentId, { user, siteId })

    const adapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const baseFilter: Record<string, any> = { collectionName, documentId }
    if (siteId) baseFilter.siteId = siteId

    // Expire any stale locks first
    await adapter.deleteMany('z_locks', {
      ...baseFilter,
      lockExpiresAt: { $lt: new Date() }
    })

    const { force } = req.body || {}

    // Check for existing lock by someone else
    const existing = await adapter.findOne('z_locks', baseFilter) as any
    if (existing) {
      const isOwner = String(existing.lockedBy) === String(user.id || user._id)
      if (!isOwner) {
        if (!force) {
          throw new ConflictError(`Document is already locked by ${existing.lockedByEmail}`)
        }
        
        // Force acquire: override the lock
        const renewedExpiresAt = new Date(Date.now() + LOCK_TTL_MS)
        const lockedBy = user.id || user._id
        const lockedByEmail = user.email

        await adapter.updateMany('z_locks', { _id: existing._id }, {
          lockedBy,
          lockedByEmail,
          lockedAt: new Date(),
          lockExpiresAt: renewedExpiresAt,
        })
        return res.json(createResponse({
          locked: true,
          lockedBy,
          lockedByEmail,
          lockedAt: new Date(),
          lockExpiresAt: renewedExpiresAt,
          isOwner: true,
          message: 'Lock force acquired',
        }))
      }
      // Owner re-acquiring: update lock timestamp
      const renewedExpiresAt = new Date(Date.now() + LOCK_TTL_MS)
      await adapter.updateMany('z_locks', { _id: existing._id }, {
        lockedAt: new Date(),
        lockExpiresAt: renewedExpiresAt,
      })
      return res.json(createResponse({
        locked: true,
        lockedBy: existing.lockedBy,
        lockedByEmail: existing.lockedByEmail,
        lockedAt: new Date(),
        lockExpiresAt: renewedExpiresAt,
        isOwner: true,
        message: 'Lock renewed',
      }))
    }

    // Create new lock
    const lockData: Record<string, any> = {
      collectionName,
      documentId,
      lockedBy: user.id || user._id,
      lockedByEmail: user.email,
      lockedAt: new Date(),
      lockExpiresAt: new Date(Date.now() + LOCK_TTL_MS),
    }
    if (siteId) lockData.siteId = siteId

    const lock = (await adapter.create('z_locks', lockData)) as any
    res.json(createResponse({
      locked: true,
      lockedBy: lock.lockedBy,
      lockedByEmail: lock.lockedByEmail,
      lockedAt: lock.lockedAt,
      lockExpiresAt: lock.lockExpiresAt,
      isOwner: true,
      message: 'Lock acquired',
    }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/locks/:collection/:id/unlock ──────────────────────────────────
router.post('/:collection/:id/unlock', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    const { collection, id } = req.params

    let collectionName = collection
    let documentId = id
    if (collection === 'globals') {
      collectionName = id
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    // Verify user can read the document — non-fatal for unlock so the user
    // isn't stuck with a lock they can't release if RLS or doc lookup fails.
    try {
      await engine.local.findById(collectionName, documentId, { user, siteId })
    } catch {
      // ignore — lock record itself proves prior access
    }

    const adapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const baseFilter: Record<string, any> = { collectionName, documentId }
    if (siteId) baseFilter.siteId = siteId

    const existing = await adapter.findOne('z_locks', baseFilter) as any
    if (!existing) {
      return res.json(createResponse({ message: 'No active lock to release' }))
    }

    const isOwner = String(existing.lockedBy) === String(user.id || user._id)
    if (!isOwner) {
      throw new ForbiddenError('Only the lock holder can release the lock')
    }

    await adapter.deleteMany('z_locks', { _id: existing._id })
    res.json(createResponse({ message: 'Lock released' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/locks/:collection/:id/heartbeat ──────────────────────────────
router.post('/:collection/:id/heartbeat', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    const { collection, id } = req.params

    let collectionName = collection
    let documentId = id
    if (collection === 'globals') {
      collectionName = id
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    await engine.local.findById(collectionName, documentId, { user, siteId })

    const adapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const baseFilter: Record<string, any> = { collectionName, documentId }
    if (siteId) baseFilter.siteId = siteId

    const existing = await adapter.findOne('z_locks', baseFilter) as any
    if (!existing) {
      throw new NotFoundError('Lock', req.params.id)
    }

    const isOwner = String(existing.lockedBy) === String(user.id || user._id)
    if (!isOwner) {
      throw new ForbiddenError('You do not hold this lock')
    }

    await adapter.updateMany('z_locks', { _id: existing._id }, {
      lockExpiresAt: new Date(Date.now() + LOCK_TTL_MS),
    })
    res.json(createResponse({ message: 'Lock renewed' }))
  } catch (err) {
    next(err)
  }
})

export default router