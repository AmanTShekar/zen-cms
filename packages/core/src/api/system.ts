import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse, createErrorResponse } from './utils'
import { ApiKeyService } from '../services/api-key'
import { SearchService } from '../services/search'
import { InvalidPayloadError, ValidationError } from '../errors'
import { CacheService } from '../services/cache'
import { AIService } from '../services/ai'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { AuthService } from '../services/auth'
import { EmailService } from '../services/email'
import { seedTailoredData } from '../database/seed'
import { ContentService } from '../services/content'
import { createCollectionRouter } from './factory'

// ── Rate Limiters (Guard Rails) ─────────────────────────────────────────────
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
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

const router: Router = Router()

// ── 1. SYSTEM CRITICAL (Top Priority) ────────────────────────────────────────

router.get('/plugins', requireAuth, (req: Request, res: Response) => {
  const engine = req.app.get('zenith_engine')
  const plugins = (engine?.plugins || []).map((p: any) => ({
    id: p.name.toLowerCase().replace(/\s+/g, '-'),
    name: p.name,
    version: p.version || '1.0.0',
    description:
      p.description || 'Enterprise modular extension providing custom Zenith extensions.',
    author: p.author || 'Third Party',
    downloads: p.downloads || 0,
    status: p.disabled ? 'inactive' : 'active',
    verified: p.author === 'ROOT_KERNEL',
  }))
  res.json(createResponse(plugins))
})

router.post(
  '/plugins/inject',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const { name, version, author, description } = req.body
      if (!name) throw new InvalidPayloadError('Plugin name is required')

      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      // Check if plugin already exists
      const exists = engine.plugins.some((p: any) => p.name.toLowerCase() === name.toLowerCase())
      if (exists) throw new InvalidPayloadError(`Plugin "${name}" is already injected`)

      const newPlugin = {
        name,
        version: version || '1.0.0',
        description: description || 'Injected module providing customized business logic.',
        author: author || 'Third Party',
        downloads: 1,
        apply: (cfg: any) => cfg,
      }

      engine.plugins.push(newPlugin)

      res.status(201).json(
        createResponse({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          version: newPlugin.version,
          description: newPlugin.description,
          author: newPlugin.author,
          downloads: 1,
          status: 'active',
          verified: false,
        })
      )
    } catch (err: any) {
      res.status(400).json(createResponse(null, { error: err.message }))
    }
  }
)

router.post(
  '/plugins/:id/enable',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      const plugin = engine.plugins.find(
        (p: any) => p.name.toLowerCase().replace(/\s+/g, '-') === req.params.id
      )
      if (!plugin) throw new InvalidPayloadError(`Plugin "${req.params.id}" not found`)
      ;(plugin as any).disabled = false
      res.json(createResponse({ success: true }))
    } catch (err: any) {
      res.status(400).json(createResponse(null, { error: err.message }))
    }
  }
)

router.post(
  '/plugins/:id/disable',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      const plugin = engine.plugins.find(
        (p: any) => p.name.toLowerCase().replace(/\s+/g, '-') === req.params.id
      )
      if (!plugin) throw new InvalidPayloadError(`Plugin "${req.params.id}" not found`)
      ;(plugin as any).disabled = true
      res.json(createResponse({ success: true }))
    } catch (err: any) {
      res.status(400).json(createResponse(null, { error: err.message }))
    }
  }
)

router.get('/health', async (req: Request, res: Response) => {
  const adapter = (req as any).zenith?.adapter
  const dbHealth = adapter ? adapter.getHealth() : 'disconnected'
  const healthy = dbHealth === 'ok'
  const config = (req as any).zenith?.config

  const data = {
    status: healthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '6.0.45-STABLE',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'production',
    database: dbHealth,
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
    },
    cpu: {
      load: os.loadavg(),
      cores: os.cpus().length,
      usage: `${Math.round((os.loadavg()[0] * 100) / os.cpus().length)}%`,
    },
    registry: {
      collections: config?.collections?.map((c: any) => ({ slug: c.slug, label: c.label })) || [],
      globals: config?.globals?.map((g: any) => ({ slug: g.slug, label: g.label })) || [],
    },
    services: {
      database: dbHealth,
      email: process.env.RESEND_API_KEY ? 'configured' : 'dev-mode',
      storage: process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : 'local',
      ai:
        process.env.ANTHROPIC_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.OPENROUTER_API_KEY
          ? 'configured'
          : 'disabled',
    },
  }
  res.status(healthy ? 200 : 503).json(createResponse(data))
})

router.get('/counts', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const config = (req as any).zenith?.config
    const adapter = (req as any).zenith?.adapter
    if (!config || !adapter) return res.json(createResponse({}))
    const counts: Record<string, number> = {}
    await Promise.all(
      config.collections.map(async (col: any) => {
        try {
          counts[col.slug] = await adapter.count(col.slug, {})
        } catch (e) {
          counts[col.slug] = 0
        }
      })
    )
    res.json(createResponse(counts))
  } catch (err) {
    next(err)
  }
})

router.get(
  '/audit-logs',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const limitQuery = parseInt(req.query.limit as string)
      const limitVal = isNaN(limitQuery) || limitQuery <= 0 ? 100 : Math.min(limitQuery, 100)
      const logs = await adapter.find<any>('audit_logs', {}, { sort: { timestamp: -1 }, limit: limitVal })
      res.json(createResponse(logs))
    } catch (err) {
      next(err)
    }
  }
)

// ── 2. IDENTITY & ACCESS ─────────────────────────────────────────────────────

// TODO: Phase 3 decoupling: Refactor UserModel, ApiKeyModel, etc. to use Adapter generic collections

router.get(
  '/api-keys',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const keys = await adapter.find<any>('z_api_keys', { revoked: false }, { select: ['-key'] })
      res.json(createResponse(keys))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/api-keys',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { name, role, expiresInDays } = req.body
      const result = await ApiKeyService.generateKey(name, role, expiresInDays)
      res.status(201).json(createResponse(result))
    } catch (err) {
      next(err)
    }
  }
)

// ── 3. SEARCH & AI ───────────────────────────────────────────────────────────

router.get('/search', searchLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const q = req.query.q as string
    if (!q) throw new InvalidPayloadError('Query required')
    const config = (req as any).zenith?.config
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    const results = await SearchService.globalSearch(q.trim(), config.collections, adapter, 20, siteId)
    res.json(createResponse(results))
  } catch (err) {
    next(err)
  }
})

router.post('/ai/generate', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { prompt } = req.body
    const result = await AIService.generateContent(prompt)
    res.json(createResponse({ result }))
  } catch (err) {
    next(err)
  }
})

router.post(
  '/ai-architect',
  aiLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { prompt } = req.body
      if (!prompt) throw new InvalidPayloadError('Prompt is required for AI Architect')

      const systemPrompt = `You are the Zenith CMS AI Schema Architect. Your job is to convert natural language requirements into a valid, rich, real-world ready JSON CollectionConfig.

Return ONLY a valid JSON object matching the following structure:
{
  "name": "string (the display name of the collection, e.g., 'Blog Posts')",
  "slug": "string (lowercase plural slug, matching /^[a-z0-9-]+$/, e.g., 'blog-posts')",
  "labels": {
    "singular": "string (e.g., 'Blog Post')",
    "plural": "string (e.g., 'Blog Posts')"
  },
  "drafts": boolean (default true for content collections like posts, false for settings/users),
  "timestamps": boolean (default true),
  "fields": [
    {
      "name": "string (camelCase field identifier, e.g., 'authorName', 'featuredImage')",
      "type": "text" | "number" | "email" | "textarea" | "checkbox" | "date" | "select" | "media" | "richtext" | "relation",
      "label": "string (human readable label, e.g., 'Author Name')",
      "required": boolean,
      "unique": boolean,
      "options": [{"label": "Option Name", "value": "option_value"}] (only for 'select' type),
      "defaultValue": any (optional)
    }
  ]
}

Rules:
1. Provide rich, complete, real-world ready schemas. If a user asks for a blog post, include title, slug, content, author, publishDate, featuredImage, and category fields.
2. Reply ONLY with valid JSON. Do not include markdown formatting, backticks, or any explanation.

User Request: ${prompt}`

      const aiResponse = await AIService.generateContent(systemPrompt)

      let rawParsed: unknown
      try {
        const jsonStart = aiResponse.indexOf('{')
        const jsonEnd = aiResponse.lastIndexOf('}')
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('AI response did not contain a valid JSON object')
        }
        const jsonString = aiResponse.substring(jsonStart, jsonEnd + 1)
        rawParsed = JSON.parse(jsonString)
      } catch (e: any) {
        throw new InvalidPayloadError(`AI generated invalid JSON: ${e.message}. Please try a more specific prompt.`)
      }

      // Validate AI output against the CollectionConfig schema contract.
      // This prevents malformed or adversarial AI responses from poisoning the user's config.
      const validation = AICollectionSchema.safeParse(rawParsed)
      if (!validation.success) {
        throw new ValidationError(
          validation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        )
      }

      const schema = validation.data
      res.json(createResponse({ message: 'AI Architect generated schema successfully', schema }))
    } catch (err) {
      next(err)
    }
  }
)

// ── 4. SETTINGS & MAINTENANCE ────────────────────────────────────────────────

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
      const { pruneOrphanedMedia } = await import('../services/storage/sweeper')
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
          publicUrl: 'http://localhost:3000',
          maintenanceMode: false,
          enableDrafts: true,
          defaultLocale: 'en',
          allowedOrigins: ['*'],
          jwtExpiresIn: '7d',
          passwordMinLength: 8,
          rateLimitWindow: 15,
          rateLimitMax: 100,
        })
      }
      res.json(createResponse(settings))
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
      if (!settings) {
        settings = await adapter.create<any>('z_settings', updateData)
      } else {
        const id = (settings.id || settings._id).toString()
        settings = await adapter.update<any>('z_settings', id, updateData)
      }
      res.json(createResponse(settings))
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
    } catch (err: any) {
      res.status(400).json(
        createErrorResponse(400, `Database connection failed: ${err.message || err}`, null, 'DB_CONNECTION_FAILED')
      )
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
        const fsSync = require('fs')
        const pathModule = require('path')
        const possiblePaths = [
          pathModule.resolve(process.cwd(), '.env'),
          pathModule.resolve(process.cwd(), '../../.env'),
          pathModule.resolve(__dirname, '../../../.env'),
          pathModule.resolve(__dirname, '../../../../.env'),
        ]
        let envPath = possiblePaths.find(p => fsSync.existsSync(p)) || possiblePaths[0]
        
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
    } catch (err: any) {
      res.status(400).json(
        createErrorResponse(400, `Database connection test failed, configuration not saved: ${err.message || err}`, null, 'DB_SAVE_FAILED')
      )
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

router.post(
  '/members',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { email, role } = req.body
      if (!email) throw new InvalidPayloadError('Email is required')

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

// ── 5. ONBOARDING ────────────────────────────────────────────────────────────

router.get('/onboarding', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const state = await adapter.findOne<any>('z_onboarding', {})
    if (!state)
      return res.json(
        createResponse({
          currentStep: 0,
          totalSteps: 7,
          completed: false,
          skipped: false,
          answers: {},
          isDefault: true,
        })
      )
    const completed = !!state.completedAt || state.skipped
    res.json(createResponse({ ...state, completed }))
  } catch (err) {
    next(err)
  }
})

router.post('/onboarding', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const { currentStep, answers, skipped } = req.body
    const updateData = {
      ...(currentStep !== undefined && { currentStep }),
      ...(answers && { answers }),
      ...(skipped !== undefined && { skipped }),
    }
    
    let state = await adapter.findOne<any>('z_onboarding', {})
    if (state) {
      state = await adapter.update('z_onboarding', (state.id || state._id).toString(), updateData)
    } else {
      state = await adapter.create('z_onboarding', updateData)
    }
    res.json(createResponse(state))
  } catch (err) {
    next(err)
  }
})

router.post(
  '/onboarding/complete',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { keyName } = req.body
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      // Generate first API key
      const rawKey = `zk_live_${crypto.randomBytes(24).toString('hex')}`
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
      const apiKey = await adapter.create<any>('z_api_keys', {
        name: keyName || 'My Website',
        key: keyHash,
        role: 'viewer',
      })
      
      const state = await adapter.findOne<any>('z_onboarding', {})
      const updateData = { completedAt: new Date(), answers: { ...(state?.answers || {}), generatedApiKeyId: apiKey.id || apiKey._id } }
      if (state) {
        await adapter.update('z_onboarding', (state.id || state._id).toString(), updateData)
      } else {
        await adapter.create('z_onboarding', updateData)
      }

      // Dynamic custom schema seeding based on vertical onboarding selection
      const projectType = state?.answers?.projectType || 'custom'
      if (projectType && projectType !== 'custom') {
        await seedTailoredData(projectType, adapter)
      }
      
      res.json(
        createResponse({
          apiKey: rawKey,
          apiKeyId: apiKey._id,
          message: 'Onboarding complete. Copy your API key — it will not be shown again.',
        })
      )
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/onboarding/reset',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      await adapter.deleteMany('z_onboarding', {})
      res.json(createResponse({ message: 'Onboarding reset. Wizard will reappear on next login.' }))
    } catch (err) {
      next(err)
    }
  }
)

export default router
