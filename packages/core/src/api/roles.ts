import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { ValidationError, NotFoundError, ForbiddenError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from '../services/logger'
import { invalidateRoleCache } from '../services/rbac'

const router: import('express').Router = Router()

// All routes require authentication and admin role
router.use(requireAuth)
router.use(requireRole('admin'))

// ── Schemas ─────────────────────────────────────────────────────────────────

const FieldPermissionEntrySchema = z.object({
  read: z.boolean().optional(),
  write: z.boolean().optional(),
}).optional()

const PermissionSchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string()),
  fieldPermissions: z.record(z.string(), FieldPermissionEntrySchema).optional(),
})

const CreateRoleSchema = z.object({
  roleName: z
    .string()
    .min(2, 'Role name must be at least 2 characters')
    .max(50)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_ ]*$/, 'Role name contains invalid characters'),
  description: z.string().max(200).optional(),
  permissions: z.array(PermissionSchema),
})

const UpdateRoleSchema = CreateRoleSchema.partial()

const ASSIGN_ROLE_SCHEMA = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'editor', 'viewer', 'custom']),
})

// ── Lifecycle: seed system roles on first boot ──────────────────────────────

export async function seedSystemRoles() {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const systemRoles = [
      {
        roleName: 'Admin',
        roleType: 'admin',
        description: 'Unrestricted access to all resources and settings',
        isSystem: true,
        permissions: [{ resource: '*', actions: ['*'] }],
      },
      {
        roleName: 'Editor',
        roleType: 'editor',
        description: 'Can create and edit content but cannot delete or configure system settings',
        isSystem: true,
        permissions: [
          { resource: '*', actions: ['create', 'read', 'update'] },
          { resource: 'settings', actions: ['read'] },
        ],
      },
      {
        roleName: 'Viewer',
        roleType: 'viewer',
        description: 'Read-only access to all content',
        isSystem: true,
        permissions: [{ resource: '*', actions: ['read'] }],
      },
    ]

    for (const role of systemRoles) {
      const existing = await adapter.findOne('z_roles', { roleName: role.roleName })
      if (!existing) {
        await adapter.create('z_roles', role)
      }
    }

    logger.info('[Roles] System roles seeded')
  } catch (err: any) {
    if (err.code === 11000 || err.message?.includes('duplicate key error')) {
      logger.info('[Roles] System roles already seeded (caught E11000)')
    } else {
      logger.error({ err: err.message }, '[Roles] Failed to seed system roles')
    }
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/v1/roles — list all roles
router.get('/', async (req, res, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const roles = await adapter.find('z_roles', {}, { sort: { isSystem: -1, roleName: 1 } })
    res.json(createResponse(roles))
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/roles/:id — get single role
router.get('/:id', async (req, res, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const role = await adapter.findOne('z_roles', { _id: req.params.id })
    if (!role) throw new NotFoundError('Role', req.params.id)
    res.json(createResponse(role))
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/roles — create a custom role
router.post('/', async (req, res, next) => {
  try {
    const validation = CreateRoleSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(
        Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
          field: f,
          message: (m as string[])[0],
        }))
      )
    }

    const adapter = AdapterFactory.getActiveAdapter()
    const existing = await adapter.findOne('z_roles', { roleName: validation.data.roleName })
    if (existing) {
      throw new ValidationError([{ field: 'roleName', message: 'A role with this name already exists.' }])
    }

    const role = await adapter.create('z_roles', {
      ...validation.data,
      roleType: 'custom',
      isSystem: false,
    })

    logger.info(`[Roles] Created custom role "${validation.data.roleName}"`)
    res.status(201).json(createResponse(role))
  } catch (err) {
    next(err)
  }
})

// PATCH /api/v1/roles/:id — update a custom role
router.patch('/:id', async (req, res, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const role = await adapter.findOne('z_roles', { _id: req.params.id })
    if (!role) throw new NotFoundError('Role', req.params.id)
    if ((role as any).isSystem) {
      throw new ForbiddenError('System roles cannot be modified. Clone the role to customize it.')
    }

    const validation = UpdateRoleSchema.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(
        Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
          field: f,
          message: (m as string[])[0],
        }))
      )
    }

    const updated = await adapter.update('z_roles', req.params.id, validation.data)
    invalidateRoleCache((role as any).roleName)
    logger.info(`[Roles] Updated role "${(role as any).roleName}"`)
    res.json(createResponse(updated))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/roles/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const role = await adapter.findOne('z_roles', { _id: req.params.id })
    if (!role) throw new NotFoundError('Role', req.params.id)
    if ((role as any).isSystem) {
      throw new ForbiddenError('System roles cannot be deleted. They are protected by Zenith.')
    }

    // Check if any users are assigned this role
    const usersCount = await adapter.count('users', { role: (role as any).roleName })
    if (usersCount > 0) {
      throw new ForbiddenError(
        `Cannot delete this role — ${usersCount} user(s) are currently assigned to it. Reassign them first.`
      )
    }

    await adapter.delete('z_roles', req.params.id)
    invalidateRoleCache((role as any).roleName)
    logger.info(`[Roles] Deleted role "${(role as any).roleName}"`)

    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/roles/clone/:id — clone a role as a new custom role
router.post('/clone/:id', async (req, res, next) => {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    const source = await adapter.findOne('z_roles', { _id: req.params.id })
    if (!source) throw new NotFoundError('Role', req.params.id)

    const newName = `${(source as any).roleName} (Copy)`
    const alreadyExists = await adapter.findOne('z_roles', { roleName: newName })
    if (alreadyExists) {
      throw new ValidationError([{ field: 'roleName', message: 'Cloned role name already exists.' }])
    }

    const cloned = await adapter.create('z_roles', {
      roleName: newName,
      roleType: 'custom',
      description: `Cloned from "${(source as any).roleName}"`,
      isSystem: false,
      permissions: (source as any).permissions,
    })

    logger.info(`[Roles] Cloned role "${(source as any).roleName}" → "${newName}"`)
    res.status(201).json(createResponse(cloned))
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/roles/assign — assign a role to a user
router.post('/assign', async (req, res, next) => {
  try {
    const validation = ASSIGN_ROLE_SCHEMA.safeParse(req.body)
    if (!validation.success) {
      throw new ValidationError(
        Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
          field: f,
          message: (m as string[])[0],
        }))
      )
    }

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<any>('users', { id: validation.data.userId })
    const user = users[0]
    if (!user) throw new NotFoundError('User', validation.data.userId)

    await adapter.update('users', user.id || user._id, { role: validation.data.role })
    user.role = validation.data.role

    logger.info(`[Roles] Assigned role "${validation.data.role}" to user "${user.email}"`)

    res.json(
      createResponse({
        userId: user.id || user._id,
        email: user.email,
        role: user.role,
      })
    )
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/roles/users — list users with their roles
router.get('/users/list', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || '20')))
    const skip = (page - 1) * pageSize

    const adapter = AdapterFactory.getActiveAdapter()
    const users = await adapter.find<any>('users', {}, { 
      skip, 
      limit: pageSize, 
      sort: { createdAt: -1 },
      select: ['email', 'role', 'createdAt']
    })
    const total = await adapter.count('users', {})

    res.json(
      createResponse(users, {
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      })
    )
  } catch (err) {
    next(err)
  }
})

export default router