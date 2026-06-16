import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { NotFoundError } from '../errors'

const router: Router = Router()
router.use(requireAuth)

/**
 * Versions API
 * ─────────────
 * Exposes version history for any document, and allows rollback.
 * Inspired by Payload's versions system.
 *
 * GET    /api/v1/versions/:collection/:id        — list versions
 * GET    /api/v1/versions/:collection/:id/:versionId — get specific version
 * POST   /api/v1/versions/:collection/:id/:versionId/restore — restore a version
 */

// ── GET /api/v1/versions/:collection/:id ───────────────────────────────────────
router.get('/:collection/:id', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    let collection = req.params.collection
    let documentId = req.params.id

    // Resolve globals: /versions/globals/:globalSlug points to the global collection
    if (collection === 'globals') {
      collection = documentId // the global slug is the second segment
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string

    // Enforce read access checks (including RLS constraints + site scoping)
    await engine.local.findById(collection, documentId, { user, siteId })

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const versions = await adapter.find<Record<string, any>>('versions', {
      collectionName: collection,
      documentId: documentId,
    }, {
      sort: { timestamp: -1 },
      limit: 50
    })

    res.json(createResponse(versions))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/versions/:collection/:id/:versionId ───────────────────────────
router.get('/:collection/:id/:versionId', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    let collection = req.params.collection
    let documentId = req.params.id

    // Resolve globals: /versions/globals/:globalSlug points to the global collection
    if (collection === 'globals') {
      collection = documentId
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string

    // Enforce read access checks (including RLS constraints + site scoping)
    await engine.local.findById(collection, documentId, { user, siteId })

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const version = await adapter.findOne<Record<string, any>>('versions', { _id: req.params.versionId })
    if (!version) throw new NotFoundError('Version', req.params.versionId)
    res.json(createResponse(version))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/versions/:collection/:id/:versionId/diff ──────────────────────────────
router.get('/:collection/:id/:versionId/diff', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    let collection = req.params.collection
    let documentId = req.params.id

    // Resolve globals: /versions/globals/:globalSlug points to the global collection
    if (collection === 'globals') {
      collection = documentId
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string

    // Enforce read access checks (including RLS constraints + site scoping)
    await engine.local.findById(collection, documentId, { user, siteId })

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const version = await adapter.findOne<Record<string, any>>('versions', { _id: req.params.versionId })
    if (!version) throw new NotFoundError('Version', req.params.versionId)

    // delta is stored as { fieldName: { from, to } } by ContentService._calculateDelta()
    const delta = version.delta || {}
    const diffs = Object.entries(delta).map(([field, change]: [string, any]) => ({
      field,
      from: change.from,
      to: change.to,
    }))

    res.json(createResponse({ versionId: req.params.versionId, timestamp: version.timestamp, diffs }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/versions/:collection/:id/:versionId/restore ────────────────────────
router.post('/:collection/:id/:versionId/restore', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    let collection = req.params.collection
    let documentId = req.params.id

    // Resolve globals: /versions/globals/:globalSlug points to the global collection
    if (collection === 'globals') {
      collection = documentId
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const version = await adapter.findOne<Record<string, any>>('versions', { _id: req.params.versionId })
    if (!version) throw new NotFoundError('Version', req.params.versionId)

    const snapshot = version.snapshot

    // Strip system fields from snapshot before restoring to avoid conflicts
    const { _id, id, createdAt, updatedAt, ...restorable } = snapshot as any

    // Use local API to run update - this automatically validates RLS, runs hooks, site-scoping, and triggers webhooks
    const { doc: restored } = await engine.local.update(collection, documentId, restorable, { user, siteId })

    res.json(createResponse({ message: 'Version restored successfully', document: restored }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/versions/:collection/:id/:versionId/rollback-fields ────────────────
router.post('/:collection/:id/:versionId/rollback-fields', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const engine = req.app.get('zenith_engine')
    let collection = req.params.collection
    let documentId = req.params.id

    // Resolve globals: /versions/globals/:globalSlug points to the global collection
    if (collection === 'globals') {
      collection = documentId
      documentId = 'singleton'
    }

    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const version = await adapter.findOne<Record<string, any>>('versions', { _id: req.params.versionId })
    if (!version) throw new NotFoundError('Version', req.params.versionId)

    const snapshot = version.snapshot
    const { fields } = req.body

    if (!Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: { message: 'fields parameter must be a non-empty array of field names.' } })
    }

    const rollbackData: Record<string, any> = {}
    for (const field of fields) {
      if (snapshot && field in snapshot) {
        rollbackData[field] = snapshot[field]
      }
    }

    if (Object.keys(rollbackData).length === 0) {
      return res.status(400).json({ error: { message: 'None of the requested fields exist in the version snapshot.' } })
    }

    // Use local API to run update - this automatically validates RLS, runs hooks, site-scoping, and triggers webhooks
    const { doc: restored } = await engine.local.update(collection, documentId, rollbackData, { user, siteId })

    res.json(createResponse({ message: `Successfully rolled back fields: ${Object.keys(rollbackData).join(', ')}`, document: restored }))
  } catch (err) {
    next(err)
  }
})

export default router
