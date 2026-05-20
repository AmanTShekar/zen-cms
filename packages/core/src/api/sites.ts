import { Router, Request, Response } from 'express'
import { createResponse } from './utils'
import { requireAuth } from '../middleware/auth'
import { InvalidPayloadError, NotFoundError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

const router = Router()

// Require auth for all site workspace operations
router.use(requireAuth)

// ── GET /api/v1/sites ────────────────────────────────────────────────────────
// Lists all sites where the user is an owner or a member
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const sites = await adapter.find<any>('z_sites', {
      $or: [{ ownerId: user.id }, { 'members.userId': user.id }],
    }, { sort: { updatedAt: -1 } })

    res.json(createResponse(sites))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/sites ───────────────────────────────────────────────────────
// Creates a new site workspace
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, slug, icon, description, collections, globals } = req.body
    if (!name || !slug) {
      throw new InvalidPayloadError('Name and slug are required fields.')
    }

    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Check if slug is unique
    const existing = await adapter.findOne<any>('z_sites', { slug: slug.toLowerCase() })
    if (existing) {
      throw new InvalidPayloadError(`A site workspace with the slug '${slug}' already exists.`)
    }

    const site = await adapter.create<any>('z_sites', {
      name,
      slug: slug.toLowerCase(),
      icon: icon || '🌐',
      description,
      ownerId: user.id,
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
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const site = await adapter.findOne<any>('z_sites', {
      _id: id,
      $or: [{ ownerId: user.id }, { 'members.userId': user.id }],
    })

    if (!site) {
      throw new NotFoundError('Site workspace', id)
    }

    res.json(createResponse(site))
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/v1/sites/:id ──────────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Only allow owner or admin members to update the site
    const site = await adapter.findOne<any>('z_sites', { _id: id })
    if (!site) {
      throw new NotFoundError('Site workspace', id)
    }

    const member = site.members.find((m: any) => m.userId === user.id)
    const isAdmin = member?.role === 'admin' || site.ownerId === user.id

    if (!isAdmin) {
      return res.status(403).json({
        error: {
          message: 'You do not have administrative privileges to update this site workspace.',
        },
      })
    }

    const updates = req.body
    // Don't allow changing ownerId directly here
    delete updates.ownerId
    delete updates.members

    const updatedSite = await adapter.update<any>('z_sites', id, updates)
    res.json(createResponse(updatedSite))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/sites/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Only the owner can delete the site workspace entirely
    const site = await adapter.findOne<any>('z_sites', { _id: id })
    if (!site) {
      throw new NotFoundError('Site workspace', id)
    }

    if (site.ownerId !== user.id) {
      return res.status(403).json({
        error: { message: 'Only the site owner can permanently delete this site workspace.' },
      })
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
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    if (!userId || !role) {
      throw new InvalidPayloadError('userId and role are required fields.')
    }

    const site = await adapter.findOne<any>('z_sites', { _id: id })
    if (!site) {
      throw new NotFoundError('Site workspace', id)
    }

    // Only admin or owner can invite members
    const member = site.members.find((m: any) => m.userId === user.id)
    const isAdmin = member?.role === 'admin' || site.ownerId === user.id

    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: { message: 'Only site administrators can manage workspace membership.' } })
    }

    // Check if user is already a member
    const existingMember = site.members.find((m: any) => m.userId === userId)
    if (existingMember) {
      throw new InvalidPayloadError('This user is already a member of this workspace.')
    }

    const updatedMembers = [...site.members, { userId, role, addedAt: new Date() }]
    const updatedSite = await adapter.update<any>('z_sites', id, { members: updatedMembers })

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
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const site = await adapter.findOne<any>('z_sites', { _id: id })
    if (!site) {
      throw new NotFoundError('Site workspace', id)
    }

    // Only admin, owner, or the user themselves (leaving the site) can remove a member
    const member = site.members.find((m: any) => m.userId === user.id)
    const isAdmin = member?.role === 'admin' || site.ownerId === user.id
    const isSelf = user.id === userId

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        error: { message: 'You do not have permissions to remove members from this workspace.' },
      })
    }

    // Cannot remove the owner of the site
    if (site.ownerId === userId) {
      throw new InvalidPayloadError(
        'The workspace owner cannot be removed. You must transfer ownership first or delete the site.'
      )
    }

    const filteredMembers = site.members.filter((m: any) => m.userId !== userId)
    const updatedSite = await adapter.update<any>('z_sites', id, { members: filteredMembers })

    res.json(createResponse(updatedSite))
  } catch (err) {
    next(err)
  }
})

export default router
