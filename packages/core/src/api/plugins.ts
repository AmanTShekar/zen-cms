import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'

const PLUGINS_COLLECTION = 'z_plugins'

const getAdapter = (req: Request): DatabaseAdapter =>
  (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

const router: import('express').Router = Router()

// ── List all installed plugins ────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const adapter = getAdapter(req)
    const docs = await adapter.find<Record<string, any>>(PLUGINS_COLLECTION, { siteId })
    res.json(createResponse(docs))
  } catch (err) {
    next(err)
  }
})

// ── Register / install a plugin ───────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id, name, version, description, author, homepage, packageName, configSchema, config, enabled } = req.body

    if (!id) throw new InvalidPayloadError('Plugin id is required')
    if (!name) throw new InvalidPayloadError('Plugin name is required')

    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const adapter = getAdapter(req)

    // Check if plugin already exists
    const existing = await adapter.findOne<Record<string, any>>(PLUGINS_COLLECTION, { id, siteId })
    if (existing) throw new InvalidPayloadError(`Plugin "${id}" is already installed`)

    const doc = await adapter.create<Record<string, any>>(PLUGINS_COLLECTION, {
      id,
      name,
      version: version || '1.0.0',
      description: description || '',
      author: author || '',
      homepage: homepage || '',
      packageName: packageName || '',
      configSchema: configSchema || {},
      config: config || {},
      enabled: enabled !== false,
      siteId,
      installedAt: new Date(),
    })

    res.status(201).json(createResponse(doc))
  } catch (err) {
    next(err)
  }
})

// ── Update plugin config / toggle enabled ─────────────────────────────────────
router.put('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const { config, enabled, ...rest } = req.body
    const adapter = getAdapter(req)
    
    const existing = await adapter.findOne<Record<string, any>>(PLUGINS_COLLECTION, { _id: id, siteId })
    if (!existing) throw new InvalidPayloadError(`Plugin "${id}" not found`)

    const update: Record<string, any> = { updatedAt: new Date(), ...rest }
    if (config !== undefined) update.config = config
    if (enabled !== undefined) update.enabled = enabled

    const doc = await adapter.update<Record<string, any>>(PLUGINS_COLLECTION, id, update)
    if (!doc) throw new InvalidPayloadError(`Plugin "${id}" not found`)

    res.json(createResponse(doc))
  } catch (err) {
    next(err)
  }
})

// ── Uninstall a plugin ────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
    const adapter = getAdapter(req)

    const existing = await adapter.findOne<Record<string, any>>(PLUGINS_COLLECTION, { _id: id, siteId })
    if (!existing) throw new InvalidPayloadError(`Plugin "${id}" not found`)

    const deleted = await adapter.delete(PLUGINS_COLLECTION, id)
    if (!deleted) throw new InvalidPayloadError(`Plugin "${id}" not found`)

    res.json(createResponse({ message: 'Plugin uninstalled' }))
  } catch (err) {
    next(err)
  }
})

export default router
