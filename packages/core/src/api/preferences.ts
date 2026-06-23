import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { NotFoundError, InvalidPayloadError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

const router: Router = Router()
router.use(requireAuth)

/**
 * User Preferences API
 * ─────────────────────
 * Lets the admin UI persist per-user settings (column order, sort, theme, etc.)
 *
 * GET  /api/v1/preferences/:key      — get one preference
 * POST /api/v1/preferences/:key      — upsert a preference
 * DELETE /api/v1/preferences/:key    — delete a preference
 */

router.get('/:key', async (req: Request, res: Response, next) => {
  try {
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const pref = await adapter.findOne<Record<string, unknown>>('z_preferences', {
      user_id: (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id,
      key: req.params.key,
    })
    if (!pref) throw new NotFoundError('Preference', req.params.key)
    res.json(createResponse({ key: pref.key, value: pref.value }))
  } catch (err) {
    next(err)
  }
})

router.post('/:key', async (req: Request, res: Response, next) => {
  try {
    const { value } = req.body
    if (value === undefined) throw new InvalidPayloadError('"value" is required')

    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    let pref = await adapter.findOne<Record<string, unknown>>('z_preferences', {
      user_id: (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id,
      key: req.params.key,
    })

    if (pref) {
      pref = await adapter.update('z_preferences', (pref.id || pref._id).toString(), { value, updated_at: new Date() })
    } else {
      pref = await adapter.create('z_preferences', {
        user_id: (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id,
        key: req.params.key,
        value,
        updated_at: new Date()
      })
    }

    res.json(createResponse({ key: pref!.key, value: pref!.value }))
  } catch (err) {
    next(err)
  }
})

router.delete('/:key', async (req: Request, res: Response, next) => {
  try {
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    await adapter.deleteMany('z_preferences', {
      user_id: (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user.id,
      key: req.params.key,
    })
    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

export default router
