import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { ValidationError, NotFoundError, ForbiddenError } from '../errors'
import { RoleModel } from '../database/role-model'
import { UserModel } from '../database/user-model'
import { logger } from '../services/logger'

const router = Router()

// All routes require admin
router.use(requireRole('admin'))

// ── Schemas ─────────────────────────────────────────────────────────────────

const PermissionSchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string()),
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
    await RoleModel.findOneAndUpdate(
      { roleName: role.roleName },
      { $setOnInsert: role },
      { upsert: true, new: true }
    )
  }

  logger.info('[Roles] System roles seeded')
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/v1/roles — list all roles
router.get('/', async (req, res, next) => {
  try {
    const roles = await RoleModel.find().sort({ isSystem: -1, roleName: 1 }).lean()
    res.json(createResponse(roles))
  } catch (err) {
    next(err)
  }
})

// GET /api/v1/roles/:id — get single role
router.get('/:id', async (req, res, next) => {
  try {
    const role = await RoleModel.findById(req.params.id).lean()
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

    const existing = await RoleModel.findOne({ roleName: validation.data.roleName })
    if (existing) {
      throw new ValidationError([{ field: 'roleName', message: 'A role with this name already exists.' }])
    }

    const role = await RoleModel.create({
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
    const role = await RoleModel.findById(req.params.id)
    if (!role) throw new NotFoundError('Role', req.params.id)
    if (role.isSystem) {
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

    Object.assign(role, validation.data)
    await role.save()

    logger.info(`[Roles] Updated role "${role.roleName}"`)
    res.json(createResponse(role.toObject()))
  } catch (err) {
    next(err)
  }
})

// DELETE /api/v1/roles/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const role = await RoleModel.findById(req.params.id)
    if (!role) throw new NotFoundError('Role', req.params.id)
    if (role.isSystem) {
      throw new ForbiddenError('System roles cannot be deleted. They are protected by Zenith.')
    }

    // Check if any users are assigned this role
    const userCount = await UserModel.countDocuments({ role: role.roleName })
    if (userCount > 0) {
      throw new ForbiddenError(
        `Cannot delete this role — ${userCount} user(s) are currently assigned to it. Reassign them first.`
      )
    }

    await RoleModel.findByIdAndDelete(req.params.id)
    logger.info(`[Roles] Deleted role "${role.roleName}"`)

    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

// POST /api/v1/roles/clone/:id — clone a role as a new custom role
router.post('/clone/:id', async (req, res, next) => {
  try {
    const source = await RoleModel.findById(req.params.id).lean()
    if (!source) throw new NotFoundError('Role', req.params.id)

    const newName = `${source.roleName} (Copy)`
    const alreadyExists = await RoleModel.findOne({ roleName: newName })
    if (alreadyExists) {
      throw new ValidationError([{ field: 'roleName', message: 'Cloned role name already exists.' }])
    }

    const cloned = await RoleModel.create({
      roleName: newName,
      roleType: 'custom',
      description: `Cloned from "${source.roleName}"`,
      isSystem: false,
      permissions: source.permissions,
    })

    logger.info(`[Roles] Cloned role "${source.roleName}" → "${newName}"`)
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

    const user = await UserModel.findById(validation.data.userId)
    if (!user) throw new NotFoundError('User', validation.data.userId)

    user.role = validation.data.role
    await user.save()

    logger.info(`[Roles] Assigned role "${validation.data.role}" to user "${user.email}"`)

    res.json(
      createResponse({
        userId: user._id,
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

    const [users, total] = await Promise.all([
      UserModel.find()
        .select('_id email role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      UserModel.countDocuments(),
    ])

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