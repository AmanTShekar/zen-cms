import { Router, Request, Response } from 'express'
import { createResponse } from './utils'
import { requireAuth } from '../middleware/auth'
import { InvalidPayloadError, NotFoundError, ForbiddenError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

const router: import('express').Router = Router()

// Require auth for all site workspace operations
router.use(requireAuth)

const MASKED_SITE_FIELDS = ['stripeSecretKey', 'stripeWebhookSecret']

const maskSiteSecrets = (site: Record<string, unknown> | null) => {
  if (!site) return site
  const copy = { ...site }
  for (const field of MASKED_SITE_FIELDS) {
    if (copy[field]) {
      const val = String(copy[field])
      copy[field] = val.length > 8 ? val.substring(0, 4) + '••••••••' + val.substring(val.length - 4) : '••••••••'
    }
  }
  return copy
}

const unmaskSiteSecrets = (updates: Record<string, unknown>) => {
  if (!updates) return updates
  const cleaned = { ...updates }
  for (const field of MASKED_SITE_FIELDS) {
    if (typeof cleaned[field] === 'string' && cleaned[field].includes('••••••••')) {
      delete cleaned[field]
    }
  }
  return cleaned
}

// ── GET /api/v1/sites ────────────────────────────────────────────────────────
// Lists all sites where the user is an owner or a member
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const userFromDb = await adapter.findOne<Record<string, unknown>>('users', { _id: user.id }) || 
                       await adapter.findOne<Record<string, unknown>>('users', { id: user.id }) || user
    
    // Adapter-agnostic: fetch all sites owned by user OR containing user as member
    // $or with dot-notation `members.userId` is Mongo-specific; use JS filter instead
    const allSites = await adapter.find<Record<string, unknown>>('z_sites', {}, { sort: { updatedAt: -1 } })
    let sites = allSites.filter((s: Record<string, unknown>) =>
      user.role === 'admin' ||
      s.ownerId === user.id ||
      (Array.isArray(s.members) && s.members.some((m: Record<string, unknown>) => m.userId === user.id)) ||
      (Array.isArray((userFromDb as Record<string, unknown>).specialAccess) && (
        (userFromDb as Record<string, unknown>).specialAccess.includes(`site:${s.slug}`) ||
        (userFromDb as Record<string, unknown>).specialAccess.includes(`site:${s.id || s._id}`)
      ))
    )
    if (req.query.workspaceId) {
      sites = sites.filter((s: Record<string, unknown>) => s.workspaceId === req.query.workspaceId)
    }

    res.json(createResponse(sites.map((s: Record<string, unknown>) => maskSiteSecrets(s))))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/sites ───────────────────────────────────────────────────────
// Creates a new site workspace
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, slug, icon, description, collections, globals, workspaceId } = req.body
    if (!name || !slug) {
      throw new InvalidPayloadError('Name and slug are required fields.')
    }
    if (!workspaceId) {
      throw new InvalidPayloadError('workspaceId is a required field.')
    }

    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Check if slug is unique
    const existing = await adapter.findOne<Record<string, unknown>>('z_sites', { slug: slug.toLowerCase() })
    if (existing) {
      throw new InvalidPayloadError(`A site workspace with the slug '${slug}' already exists.`)
    }

    const site = await adapter.create<Record<string, unknown>>('z_sites', {
      name,
      slug: slug.toLowerCase(),
      icon: icon || '🌐',
      description,
      ownerId: user.id,
      workspaceId,
      members: [
        {
          userId: user.id,
          role: 'admin',
          addedAt: new Date(),
        },
      ],
      collections: collections || [],
      globals: globals || [],
    })

    res.status(201).json(createResponse(site))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/sites/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Adapter-agnostic: fetch by id or _id, then JS-verify membership
    const allById = await adapter.find<Record<string, unknown>>('z_sites', { id })
    let site: Record<string, unknown> | null = allById[0] || null
    if (!site) {
      const allByMongoId = await adapter.find<Record<string, unknown>>('z_sites', { _id: id })
      site = allByMongoId[0] || null
    }

    const isMember = site && (
      site.ownerId === user.id ||
      (Array.isArray(site.members) && site.members.some((m: Record<string, unknown>) => m.userId === user.id))
    )
    if (!isMember) throw new NotFoundError('Site workspace', id)

    res.json(createResponse(maskSiteSecrets(site)))
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/v1/sites/:id ──────────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Adapter-agnostic lookup
    const allById = await adapter.find<Record<string, unknown>>('z_sites', { id })
    let site: Record<string, unknown> | null = allById[0] || null
    if (!site) {
      const allByMongoId = await adapter.find<Record<string, unknown>>('z_sites', { _id: id })
      site = allByMongoId[0] || null
    }
    if (!site) throw new NotFoundError('Site workspace', id)

    const member = site.members.find((m: Record<string, unknown>) => m.userId === user.id)
    const isAdmin = member?.role === 'admin' || site.ownerId === user.id

    if (!isAdmin) {
      throw new ForbiddenError('You do not have administrative privileges to update this site workspace.')
    }

    const updates = unmaskSiteSecrets(req.body)
    // Don't allow changing ownerId directly here
    delete updates.ownerId
    delete updates.members

    const updatedSite = await adapter.update<Record<string, unknown>>('z_sites', id, updates)
    res.json(createResponse(maskSiteSecrets(updatedSite)))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/sites/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Adapter-agnostic lookup
    const allById = await adapter.find<Record<string, unknown>>('z_sites', { id })
    let site: Record<string, unknown> | null = allById[0] || null
    if (!site) {
      const allByMongoId = await adapter.find<Record<string, unknown>>('z_sites', { _id: id })
      site = allByMongoId[0] || null
    }
    if (!site) throw new NotFoundError('Site workspace', id)

    if (site.ownerId !== user.id) {
      throw new ForbiddenError('Only the site owner can permanently delete this site workspace.')
    }

    await adapter.delete('z_sites', id)
    res.json(createResponse({ success: true, message: 'Site workspace successfully removed.' }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/sites/:id/members ───────────────────────────────────────────
// Adds a member to the site workspace
router.post('/:id/members', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const { userId, role } = req.body
    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

    if (!userId || !role) {
      throw new InvalidPayloadError('userId and role are required fields.')
    }

    // Adapter-agnostic lookup
    const allById = await adapter.find<Record<string, unknown>>('z_sites', { id })
    let site: Record<string, unknown> | null = allById[0] || null
    if (!site) {
      const allByMongoId = await adapter.find<Record<string, unknown>>('z_sites', { _id: id })
      site = allByMongoId[0] || null
    }
    if (!site) throw new NotFoundError('Site workspace', id)

    // Only admin or owner can invite members
    const member = site.members.find((m: Record<string, unknown>) => m.userId === user.id)
    const isAdmin = member?.role === 'admin' || site.ownerId === user.id

    if (!isAdmin) {
      throw new ForbiddenError('Only site administrators can manage workspace membership.')
    }

    // Check if user is already a member
    const existingMember = site.members.find((m: Record<string, unknown>) => m.userId === userId)
    if (existingMember) {
      throw new InvalidPayloadError('This user is already a member of this workspace.')
    }

    const updatedMembers = [...site.members, { userId, role, addedAt: new Date() }]
    const updatedSite = await adapter.update<Record<string, unknown>>('z_sites', id, { members: updatedMembers })

    res.json(createResponse(updatedSite))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/sites/:id/members/:userId ─────────────────────────────────
// Removes a member from the site workspace
router.delete('/:id/members/:userId', async (req: Request, res: Response, next) => {
  try {
    const { id, userId } = req.params
    const user = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).user
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Adapter-agnostic lookup
    const allById = await adapter.find<Record<string, unknown>>('z_sites', { id })
    let site: Record<string, unknown> | null = allById[0] || null
    if (!site) {
      const allByMongoId = await adapter.find<Record<string, unknown>>('z_sites', { _id: id })
      site = allByMongoId[0] || null
    }
    if (!site) throw new NotFoundError('Site workspace', id)

    // Only admin, owner, or the user themselves (leaving the site) can remove a member
    const member = site.members.find((m: Record<string, unknown>) => m.userId === user.id)
    const isAdmin = member?.role === 'admin' || site.ownerId === user.id
    const isSelf = user.id === userId

    if (!isAdmin && !isSelf) {
      throw new ForbiddenError('You do not have permissions to remove members from this workspace.')
    }

    // Cannot remove the owner of the site
    if (site.ownerId === userId) {
      throw new InvalidPayloadError(
        'The workspace owner cannot be removed. You must transfer ownership first or delete the site.'
      )
    }

    const filteredMembers = site.members.filter((m: Record<string, unknown>) => m.userId !== userId)
    const updatedSite = await adapter.update<Record<string, unknown>>('z_sites', id, { members: filteredMembers })

    res.json(createResponse(updatedSite))
  } catch (err) {
    next(err)
  }
})

export default router
