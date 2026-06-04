import { Router, Request, Response } from 'express'
import { createResponse } from './utils'
import { requireAuth } from '../middleware/auth'
import { InvalidPayloadError, NotFoundError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import crypto from 'crypto'

const router: import('express').Router = Router()

// Require auth for all workspaces operations
router.use(requireAuth)

// ── GET /api/v1/workspaces ──────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Adapter-agnostic: fetch all then JS-filter by owner/membership
    // ($or with dot-notation 'members.userId' is MongoDB-specific)
    const all = await adapter.find<any>('z_workspaces', {}, { sort: { updatedAt: -1 } })
    let workspaces = all.filter((ws: any) =>
      ws.ownerId === user.id ||
      (Array.isArray(ws.members) && ws.members.some((m: any) => m.userId === user.id))
    )

    if (!workspaces || workspaces.length === 0) {
      const wsId = crypto.randomUUID()
      const newWs = await adapter.create<any>('z_workspaces', {
        id: wsId,
        name: 'My Workspace',
        slug: `workspace-${user.id.slice(0, 6)}-${Math.random().toString(36).substring(2, 6)}`.toLowerCase(),
        ownerId: user.id,
        members: [{ userId: user.id, role: 'admin', addedAt: new Date() }]
      })

      // Map existing sites to this workspace
      const orphanedSites = await adapter.find<any>('z_sites', { ownerId: user.id })
      for (const site of orphanedSites) {
        if (!site.workspaceId) {
          await adapter.update('z_sites', site.id || site._id, { workspaceId: newWs.id || newWs._id })
        }
      }

      workspaces = [newWs]
    }

    res.json(createResponse(workspaces))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/workspaces ─────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const { name, slug } = req.body
    if (!name || !slug) {
      throw new InvalidPayloadError('Name and slug are required fields.')
    }

    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const existing = await adapter.findOne<any>('z_workspaces', { slug: slug.toLowerCase() })
    if (existing) {
      throw new InvalidPayloadError(`A workspace with the slug '${slug}' already exists.`)
    }

    const wsId = crypto.randomUUID()
    const workspace = await adapter.create<any>('z_workspaces', {
      id: wsId,
      name,
      slug: slug.toLowerCase(),
      ownerId: user.id,
      members: [
        {
          userId: user.id,
          role: 'admin',
          addedAt: new Date()
        }
      ]
    })

    res.status(201).json(createResponse(workspace))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/workspaces/:id ──────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    // Adapter-agnostic lookup with membership check in JS
    const allById = await adapter.find<any>('z_workspaces', { id })
    let workspace: any = allById[0] || null
    if (!workspace) {
      const allByMongoId = await adapter.find<any>('z_workspaces', { _id: id })
      workspace = allByMongoId[0] || null
    }

    const isMember = workspace && (
      workspace.ownerId === user.id ||
      (Array.isArray(workspace.members) && workspace.members.some((m: any) => m.userId === user.id))
    )
    if (!isMember) throw new NotFoundError('Workspace', id)

    res.json(createResponse(workspace))
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/v1/workspaces/:id ────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const allById = await adapter.find<any>('z_workspaces', { id })
    let workspace: any = allById[0] || null
    if (!workspace) {
      const allByMongoId = await adapter.find<any>('z_workspaces', { _id: id })
      workspace = allByMongoId[0] || null
    }
    if (!workspace) throw new NotFoundError('Workspace', id)

    const member = workspace.members?.find((m: any) => m.userId === user.id)
    const isAdmin = member?.role === 'admin' || workspace.ownerId === user.id

    if (!isAdmin) {
      return res.status(403).json({
        error: { message: 'You do not have privileges to update this workspace.' }
      })
    }

    const updates = req.body
    delete updates.ownerId
    delete updates.members

    const updatedWorkspace = await adapter.update<any>('z_workspaces', id, updates)
    res.json(createResponse(updatedWorkspace))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/workspaces/:id ───────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params
    const user = (req as any).user
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

    const allById = await adapter.find<any>('z_workspaces', { id })
    let workspace: any = allById[0] || null
    if (!workspace) {
      const allByMongoId = await adapter.find<any>('z_workspaces', { _id: id })
      workspace = allByMongoId[0] || null
    }
    if (!workspace) throw new NotFoundError('Workspace', id)

    if (workspace.ownerId !== user.id) {
      return res.status(403).json({
        error: { message: 'Only the workspace owner can delete this workspace.' }
      })
    }

    await adapter.delete('z_workspaces', id)
    res.json(createResponse({ success: true, message: 'Workspace removed.' }))
  } catch (err) {
    next(err)
  }
})

export default router
