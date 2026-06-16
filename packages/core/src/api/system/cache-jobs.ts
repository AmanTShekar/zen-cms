import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireRole } from '../../middleware/auth'
import { createResponse, createErrorResponse } from '../utils'
import { ApiKeyService } from '../../services/api-key'
import { SearchService } from '../../services/search'
import { InvalidPayloadError, NotFoundError, ValidationError } from '../../errors'
import { CacheService } from '../../services/cache'
import { getPrometheusMetrics } from '../../middleware/metrics'
import { AIService } from '../../services/ai'
import { VectorSearchService } from '../../services/vector-search'
import { adminComponentRegistry } from '../../plugins/hooks'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter'
import { AuthService } from '../../services/auth'
import { EmailService } from '../../services/email'
import { ContentService } from '../../services/content'
import { createCollectionRouter } from '../factory'
import { execSync } from 'child_process'

const MASK_PLACEHOLDER = '[MASKED_CREDENTIAL]'

export function maskSettings(settings: any) {
  if (!settings) return settings
  const result = JSON.parse(JSON.stringify(settings)) // deep clone
  
  if (result.smtp?.password) result.smtp.password = MASK_PLACEHOLDER
  if (result.stripe?.secretKey) result.stripe.secretKey = MASK_PLACEHOLDER
  if (result.stripe?.webhookSecret) result.stripe.webhookSecret = MASK_PLACEHOLDER
  if (result.ai?.openaiKey) result.ai.openaiKey = MASK_PLACEHOLDER
  if (result.ai?.anthropicKey) result.ai.anthropicKey = MASK_PLACEHOLDER
  
  return result
}

export function unmaskSettings(incoming: any, existing: any) {
  if (!incoming) return incoming
  const result = JSON.parse(JSON.stringify(incoming))
  
  if (result.smtp && result.smtp.password === MASK_PLACEHOLDER) {
    if (existing?.smtp?.password) result.smtp.password = existing.smtp.password
    else delete result.smtp.password
  }
  
  if (result.stripe && result.stripe.secretKey === MASK_PLACEHOLDER) {
    if (existing?.stripe?.secretKey) result.stripe.secretKey = existing.stripe.secretKey
    else delete result.stripe.secretKey
  }
  
  if (result.stripe && result.stripe.webhookSecret === MASK_PLACEHOLDER) {
    if (existing?.stripe?.webhookSecret) result.stripe.webhookSecret = existing.stripe.webhookSecret
    else delete result.stripe.webhookSecret
  }
  
  if (result.ai && result.ai.openaiKey === MASK_PLACEHOLDER) {
    if (existing?.ai?.openaiKey) result.ai.openaiKey = existing.ai.openaiKey
    else delete result.ai.openaiKey
  }
  
  if (result.ai && result.ai.anthropicKey === MASK_PLACEHOLDER) {
    if (existing?.ai?.anthropicKey) result.ai.anthropicKey = existing.ai.anthropicKey
    else delete result.ai.anthropicKey
  }
  
  return result
}

// ── Rate Limiters (Guard Rails) ─────────────────────────────────────────────
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
})

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
})

// ── AI Architect Schema Validator ─────────────────────────────────────────────
// Enforces the CollectionConfig contract on AI-generated output.
// Prevents malformed AI responses from injecting unexpected fields.
const VALID_FIELD_TYPES = [
  'text', 'number', 'email', 'textarea', 'checkbox',
  'date', 'select', 'media', 'richtext', 'relation',
  'json', 'slug', 'array', 'blocks',
] as const

const AIFieldSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must be a valid identifier'),
  type: z.enum(VALID_FIELD_TYPES),
  label: z.string().optional(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  defaultValue: z.unknown().optional(),
})

const AICollectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  labels: z.object({ singular: z.string(), plural: z.string() }).optional(),
  drafts: z.boolean().optional(),
  timestamps: z.boolean().optional(),
  fields: z.array(AIFieldSchema).min(1).max(50),
})

// removed router


import { Router as ERouter } from 'express';
export const systemRouter4: ERouter = ERouter();
const router = systemRouter4;


router.post('/cache/flush', requireAuth, requireRole('admin'), (_req, res) => {
  CacheService.flush()
  res.json(createResponse({ success: true }))
})

router.post(
  '/media/sweep',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const pruneUnreferenced = !!req.body.pruneUnreferencedMedia
      const { pruneOrphanedMedia } = await import('../../services/storage/sweeper')
      const result = await pruneOrphanedMedia(adapter, { pruneUnreferencedMedia: pruneUnreferenced })
      res.json(createResponse(result))
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/settings',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      let settings = await adapter.findOne<any>('z_settings', {})
      if (!settings) {
        settings = await adapter.create<any>('z_settings', {
          siteName: 'Zenith CMS',
          publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
          maintenanceMode: false,
          enableDrafts: true,
          defaultLocale: 'en',
          allowedOrigins: [],
          jwtExpiresIn: '7d',
          passwordMinLength: 8,
          rateLimitWindow: 15,
          rateLimitMax: 100,
        })
      }
      res.json(createResponse(maskSettings(settings)))
    } catch (err) {
      next(err)
    }
  }
)

router.patch(
  '/settings',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const updateData = req.body
      let settings = await adapter.findOne<any>('z_settings', {})
      
      const unmaskedData = unmaskSettings(updateData, settings)

      if (!settings) {
        settings = await adapter.create<any>('z_settings', unmaskedData)
      } else {
        const id = (settings.id || settings._id).toString()
        settings = await adapter.update<any>('z_settings', id, unmaskedData)
      }
      res.json(createResponse(maskSettings(settings)))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/db/test-connection',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { uri, dialect } = req.body
      if (!uri) throw new InvalidPayloadError('Database Connection URI is required')
      
      const testAdapter = AdapterFactory.create(uri, dialect)
      await testAdapter.connect()
      await testAdapter.disconnect()
      
      res.json(createResponse({ success: true, message: 'Database connection successful' }))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/db/save-connection',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { uri, dialect } = req.body
      if (!uri) throw new InvalidPayloadError('Database Connection URI is required')
      if (!dialect) throw new InvalidPayloadError('Database Dialect is required')

      const testAdapter = AdapterFactory.create(uri, dialect)
      await testAdapter.connect()
      await testAdapter.disconnect()

      const envUpdates: Record<string, string> = {
        DATABASE_TYPE: dialect,
      }
      if (dialect === 'postgres') {
        envUpdates.POSTGRES_URI = uri
      } else {
        envUpdates.MONGODB_URI = uri
      }

      try {
        const possiblePaths = [
          path.resolve(process.cwd(), '.env'),
          path.resolve(process.cwd(), '../../.env'),
          path.resolve(__dirname, '../../../.env'),
          path.resolve(__dirname, '../../../../.env'),
        ]
        const envPath = possiblePaths.find(p => fsSync.existsSync(p)) || possiblePaths[0]

        let content = ''
        if (fsSync.existsSync(envPath)) {
          content = fsSync.readFileSync(envPath, 'utf8')
        }

        const lines = content.split('\n')
        for (const [key, val] of Object.entries(envUpdates)) {
          let found = false
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith(`${key}=`)) {
              lines[i] = `${key}=${val}`
              found = true
              break
            }
          }
          if (!found) {
            lines.push(`${key}=${val}`)
          }
        }
        fsSync.writeFileSync(envPath, lines.join('\n'), 'utf8')
      } catch (e: any) {
        // Log warning but don't crash
      }

      res.json(createResponse({ success: true, message: 'Database connection configuration saved' }))
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/db/stats',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter = (req as any).zenith?.adapter
      const config = (req as any).zenith?.config
      let size = 0
      const collectionCount = config?.collections?.length || 0

      if (adapter && adapter.name === 'mongoose') {
        const db = (adapter as any).connection?.db
        if (db) {
          const stats = await db.stats()
          size = stats.dataSize || stats.storageSize || 0
        }
      }

      res.json(
        createResponse({
          size,
          collections: collectionCount,
        })
      )
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/roles',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const roles = await adapter.find<any>('z_roles', {})
      res.json(createResponse(roles))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/roles',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { roleName, permissions } = req.body
      if (!roleName) throw new InvalidPayloadError('roleName is required')
      if (!Array.isArray(permissions)) throw new InvalidPayloadError('permissions must be an array')

      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      
      const existing = await adapter.findOne<any>('z_roles', { roleName })
      let result: any
      if (existing) {
        result = await adapter.update('z_roles', (existing.id || existing._id).toString(), { permissions })
      } else {
        result = await adapter.create('z_roles', { roleName, permissions })
      }
      res.json(createResponse(result))
    } catch (err) {
      next(err)
    }
  }
)

router.delete(
  '/roles/:roleName',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { roleName } = req.params
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const existing = await adapter.findOne<any>('z_roles', { roleName })
      if (!existing) {
        return res.status(404).json(createErrorResponse(404, `Role "${roleName}" not found`))
      }
      await adapter.delete('z_roles', (existing.id || existing._id).toString())
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const users = await adapter.find<any>('users', {})
      const sanitizedUsers = users.map((u: any) => {
        const { password, ...rest } = u
        return rest
      })
      res.json(createResponse(sanitizedUsers))
    } catch (err) {
      next(err)
    }
  }
)

router.delete(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const existing = await adapter.findOne('users', { _id: req.params.id })
      if (!existing) throw new NotFoundError('User', req.params.id)
      await adapter.delete('users', req.params.id)
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/smtp/test',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      await EmailService.send({
        to: (req as any).user?.email || req.body.email,
        subject: 'SMTP Test from Zenith CMS',
        html: '<p>This is a test email from your Zenith CMS instance. If you received this, your email configuration is working.</p>',
      })
      res.json(createResponse({ success: true, message: 'Test email sent' }))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/collections',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const validation = AICollectionSchema.safeParse(req.body)
      if (!validation.success) {
        throw new ValidationError(
          Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
            field: f,
            message: (m as string[])[0],
          }))
        )
      }
      const { name, slug, fields, drafts } = validation.data
      const fileSlug = slug.toLowerCase()

      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const engine = req.app.get('zenith_engine')

      // Check if collection already exists in dynamic database config or static config
      const existingDb = await adapter.findOne<any>('z_collections', { slug: fileSlug })
      const existingStatic = engine?.config?.collections?.find((c: any) => c.slug === fileSlug)

      if (existingDb || existingStatic) {
        throw new InvalidPayloadError(`Collection with slug "${fileSlug}" already exists`)
      }

      const colConfig: any = {
        name,
        slug: fileSlug,
        labels: { singular: name, plural: `${name}s` },
        drafts: !!drafts,
        timestamps: true,
        fields,
      }

      // Save collection schema dynamically to database
      await adapter.create('z_collections', colConfig)

      // Register the collection with the database adapter in memory
      await adapter.registerCollection(colConfig)

      // Instantiate a new ContentService and mount it to zenith_engine services map
      if (engine) {
        engine.servicesMap.set(fileSlug, new ContentService(colConfig, adapter))

        // Mount the dynamic Express router under /api/v1/${fileSlug}
        const webhooks = engine.config.webhooks || []
        engine.app.use(`/api/v1/${fileSlug}`, createCollectionRouter(colConfig, adapter, webhooks))

        // Push the new collection to zenith_engine.config.collections
        engine.config.collections.push(colConfig)
      }

      res.status(201).json(
        createResponse({
          success: true,
          message: `Collection ${name} created and registered successfully in the database`,
        })
      )
    } catch (err) {
      next(err)
    }
  }
)

// ── Update collection config (hooks, endpoints, access) ───────────────────────
router.patch(
  '/collections/:slug',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { slug } = req.params
      const { hooks, endpoints, access, publicRead } = req.body

      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const engine = req.app.get('zenith_engine')

      // Update in database
      const update: Record<string, unknown> = {}
      if (hooks !== undefined) update.hooks = hooks
      if (endpoints !== undefined) update.endpoints = endpoints
      if (access !== undefined) update.access = access
      if (publicRead !== undefined) update.publicRead = publicRead

      await adapter.update('z_collections', slug, update)

      // Update in engine config
      if (engine) {
        const colIdx = engine.config.collections.findIndex((c: any) => c.slug === slug)
        if (colIdx !== -1) {
          if (hooks !== undefined) engine.config.collections[colIdx].hooks = hooks
          if (endpoints !== undefined) engine.config.collections[colIdx].endpoints = endpoints
          if (access !== undefined) engine.config.collections[colIdx].access = access
          if (publicRead !== undefined) engine.config.collections[colIdx].publicRead = publicRead
        }
      }

      res.json(createResponse({ success: true, message: `Collection "${slug}" configuration updated` }))
    } catch (err) {
      next(err)
    }
  }
)

const memberEmailSchema = z.string().email().max(254)

router.post(
  '/members',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { email, role } = req.body
      if (!email) throw new InvalidPayloadError('Email is required')
      const emailResult = memberEmailSchema.safeParse(email)
      if (!emailResult.success) throw new InvalidPayloadError('Invalid email format')

      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

      const existing = await adapter.findOne<any>('users', { email: email.toLowerCase() })
      if (existing) throw new InvalidPayloadError('User already exists')

      // Generate a cryptographically secure random password — never exposed to the requester.
      // The invited user must use the password-reset link to set their own password.
      const temporaryPassword = crypto.randomBytes(16).toString('base64url')
      const hashed = await AuthService.hashPassword(temporaryPassword)

      const user = await adapter.create<any>('users', {
        email: email.toLowerCase(),
        password: hashed,
        role: role || 'editor',
      })

      const userId = (user.id || user._id).toString()

      // Create a password-reset token valid for 48 hours so the user can set their own password
      const resetToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await adapter.create<any>('z_password_resets', { userId, token: resetToken, expiresAt })
      const resetUrl = `${process.env.ADMIN_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`

      try {
        await EmailService.send({
          to: user.email,
          subject: 'You have been invited to Zenith CMS',
          html: `<p>You have been invited as <strong>${role || 'editor'}</strong>. Set your password by clicking <a href="${resetUrl}">this link</a>. It expires in 48 hours.</p>`,
        })
      } catch {
        // Email failure is non-fatal — admin can resend via password reset
      }

      res.status(201).json(
        createResponse({
          id: userId,
          email: user.email,
          role: user.role,
          message: 'Invitation sent. User must set their password via the emailed link.',
        })
      )
    } catch (err) {
      next(err)
    }
  }
)

