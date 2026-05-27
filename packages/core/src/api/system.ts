import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse, createErrorResponse } from './utils'
import { ApiKeyService } from '../services/api-key'
import { SearchService } from '../services/search'
import { InvalidPayloadError, NotFoundError, ValidationError } from '../errors'
import { CacheService } from '../services/cache'
import { getPrometheusMetrics } from '../middleware/metrics'
import { AIService } from '../services/ai'
import { VectorSearchService } from '../services/vector-search'
import { adminComponentRegistry } from '../plugins/hooks'
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

const router: Router = Router()

// ── 1. SYSTEM CRITICAL (Top Priority) ────────────────────────────────────────

// ── Admin Component Registry (for plugin-injected UI) ────────────────────────

router.get('/admin-components', requireAuth, (_req: Request, res: Response) => {
  res.json(createResponse(adminComponentRegistry.getAll()))
})

router.post(
  '/admin-components/register',
  requireAuth,
  requireRole('admin'),
  (req: Request, res: Response) => {
    const { pluginName, slot, component, label, icon } = req.body
    if (!pluginName || !slot || !component || !label) {
      throw new InvalidPayloadError('pluginName, slot, component, and label are required')
    }
    adminComponentRegistry.register({ pluginName, slot, component, label, icon })
    res.status(201).json(createResponse({ success: true }))
  }
)

router.get('/schemas', requireAuth, (_req: Request, res: Response) => {
  const engine = _req.app.get('zenith_engine')
  res.json(createResponse({
    collections: engine.config.collections,
    globals: engine.config.globals || []
  }))
})

// ── 1b. SCHEMA HOT RELOAD ────────────────────────────────────────────────────
router.post('/schema/reload', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: any) => {
  try {
    const engine = req.app.get('zenith_engine')
    if (!engine || !engine.reloadSchema) {
      throw new Error('Engine reload is not available')
    }

    // Pass the currently loaded config or require parsing a fresh one? 
    // Usually a reload implies reading it fresh. Let's just pass nothing and it will use the current one or we can re-evaluate.
    // To make it truly dynamic, we can re-require cms.config.js here.
    let newConfig: any
    try {
      const configPath = require('path').join(process.cwd(), 'cms.config')
      delete require.cache[require.resolve(configPath)]
      newConfig = require(configPath).default || require(configPath)
    } catch (e) {
      // If no config file, we just reload existing config
    }

    await engine.reloadSchema(newConfig)
    res.json(createResponse({ success: true, message: 'Schema hot-reloaded successfully without downtime' }))
  } catch (err) {
    next(err)
  }
})

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
  async (req: Request, res: Response, next: any) => {
    try {
      const { name, version, author, description } = req.body
      if (!name) throw new InvalidPayloadError('Plugin name is required')

      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

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
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/plugins/:id/enable',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: any) => {
    try {
      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      const plugin = engine.plugins.find(
        (p: any) => p.name.toLowerCase().replace(/\s+/g, '-') === req.params.id
      )
      if (!plugin) throw new InvalidPayloadError(`Plugin "${req.params.id}" not found`)
      ;(plugin as any).disabled = false
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/plugins/:id/disable',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next: any) => {
    try {
      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      const plugin = engine.plugins.find(
        (p: any) => p.name.toLowerCase().replace(/\s+/g, '-') === req.params.id
      )
      if (!plugin) throw new InvalidPayloadError(`Plugin "${req.params.id}" not found`)
      ;(plugin as any).disabled = true
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  }
)

/**
 * Summarize a field config into a clean discovery-safe shape.
 * Strips hooks, access functions, and other non-serializable/internal props.
 */
function summarizeField(field: any): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    name: field.name,
    type: field.type,
  }
  if (field.label) summary.label = field.label
  if (field.required) summary.required = true
  if (field.hasMany) summary.hasMany = true
  if (field.localized) summary.localized = true
  if (field.unique) summary.unique = true
  if (field.index) summary.index = true
  if (field.defaultValue !== undefined) summary.defaultValue = field.defaultValue
  if (field.relationTo) summary.relationTo = field.relationTo
  if (field.options) summary.options = field.options
  if (field.type === 'blocks' && Array.isArray(field.blocks)) {
    summary.blocks = field.blocks.map((b: any) => b.slug)
  }
  if (Array.isArray(field.fields)) {
    summary.fields = field.fields.map(summarizeField)
  }
  if (Array.isArray(field.tabs)) {
    summary.tabs = field.tabs.map((tab: any) => ({
      name: tab.name,
      label: tab.label,
      fields: (tab.fields || []).map(summarizeField),
    }))
  }
  if (field.admin) {
    const admin: Record<string, unknown> = {}
    if (field.admin.description) admin.description = field.admin.description
    if (field.admin.placeholder) admin.placeholder = field.admin.placeholder
    if (field.admin.width) admin.width = field.admin.width
    if (field.admin.className) admin.className = field.admin.className
    if (field.admin.readOnly !== undefined) admin.readOnly = field.admin.readOnly
    if (field.admin.hidden !== undefined) admin.hidden = field.admin.hidden
    if (Object.keys(admin).length > 0) summary.admin = admin
  }
  return summary
}

function summarizeCollection(c: any): Record<string, unknown> {
  const summary: Record<string, unknown> = { slug: c.slug }
  if (c.label) summary.label = c.label
  if (c.description) summary.description = c.description
  if (c.singleton) summary.singleton = true
  if (c.versions) summary.versions = true
  if (c.drafts) summary.drafts = true
  if (c.publicRead) summary.publicRead = true
  if (typeof c.admin?.group === 'string') summary.group = c.admin.group
  if (typeof c.admin?.icon === 'string') summary.icon = c.admin.icon
  if (c.defaultSort) summary.defaultSort = c.defaultSort
  if (Array.isArray(c.fields)) {
    summary.fields = c.fields.map(summarizeField)
  }
  summary.endpoints = {
    base: `/api/v1/${c.slug}`,
    find: { method: 'GET', path: `/api/v1/${c.slug}` },
    findById: { method: 'GET', path: `/api/v1/${c.slug}/:id` },
    create: { method: 'POST', path: `/api/v1/${c.slug}` },
    update: { method: c.singleton ? 'PATCH' : 'PUT', path: c.singleton ? `/api/v1/${c.slug}` : `/api/v1/${c.slug}/:id` },
    delete: { method: 'DELETE', path: `/api/v1/${c.slug}/:id` },
    count: { method: 'GET', path: `/api/v1/${c.slug}/count` },
    preview: { method: 'POST', path: `/api/v1/${c.slug}/:id/preview-token` },
  }
  return summary
}

router.get('/openapi.json', (req: Request, res: Response) => {
  const config = (req as any).zenith?.config
  if (!config) return res.status(500).json(createErrorResponse(500, 'Config not loaded'))

  const paths: Record<string, any> = {}
  config.collections.forEach((c: any) => {
    const base = `/api/v1/${c.slug}`
    paths[base] = {
      get: {
        summary: `Find ${c.name}`,
        tags: [c.name],
        responses: { '200': { description: 'Successful response' } }
      },
      post: {
        summary: `Create ${c.name}`,
        tags: [c.name],
        responses: { '201': { description: 'Created successfully' } }
      }
    }
    if (!c.singleton) {
      paths[`${base}/{id}`] = {
        get: {
          summary: `Get ${c.name} by ID`,
          tags: [c.name],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Successful response' } }
        },
        put: {
          summary: `Update ${c.name}`,
          tags: [c.name],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated successfully' } }
        },
        delete: {
          summary: `Delete ${c.name}`,
          tags: [c.name],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Deleted successfully' } }
        }
      }
    }
  })

  const openapi = {
    openapi: '3.0.0',
    info: {
      title: 'Zenith CMS API',
      version: '1.0.0',
      description: 'Auto-generated OpenAPI specification for Zenith CMS collections.',
    },
    paths,
  }

  res.json(openapi)
})

router.get('/health', async (req: Request, res: Response) => {
  const adapter = (req as any).zenith?.adapter
  const dbHealth = adapter ? adapter.getHealth() : 'disconnected'
  const healthy = dbHealth === 'ok'
  const mem = process.memoryUsage()

  const data = {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbHealth,
    version: process.env.ZENITH_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
    },
    platform: process.platform,
    nodeVersion: process.version,
  }
  res.status(healthy ? 200 : 503).json(createResponse(data))
})

router.get('/counts', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const config = (req as any).zenith?.config
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!config || !adapter) return res.json(createResponse({}))
    const counts: Record<string, number> = {}
    await Promise.all(
      config.collections.map(async (col: any) => {
        try {
          const filter = siteId ? { siteId } : {}
          counts[col.slug] = await adapter.count(col.slug, filter)
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
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25))
      const search = (req.query.search as string) || ''
      const filterAction = (req.query.action as string) || ''
      const filterStatus = (req.query.status as string) || ''
      const filterCollection = (req.query.collection as string) || ''
      const siteId = req.headers['x-zenith-site-id'] as string

      // Build query with filters
      const query: Record<string, unknown> = {}
      if (search) {
        query.$or = [
          { userEmail: { $regex: search, $options: 'i' } },
          { userName: { $regex: search, $options: 'i' } },
          { collectionName: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } },
        ]
      }
      if (filterAction) query.action = { $regex: filterAction, $options: 'i' }
      if (filterStatus) query.status = filterStatus
      if (filterCollection) query.collectionName = { $regex: filterCollection, $options: 'i' }
      if (siteId) query.siteId = siteId

      // Handle Mongoose vs Postgres query format
      let logs: any[]
      let total = 0
      if (adapter.name === 'mongoose') {
        const { default: mongoose } = await import('mongoose')
        const model = mongoose.models['AuditLog']
        if (!model) return res.json(createResponse([]))
        total = await model.countDocuments(query)
        logs = await model.find(query)
          .sort({ timestamp: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec()
        logs = logs.map((l: any) => ({ ...l, id: l._id?.toString?.() || l._id }))
      } else {
        // Postgres fallback — use adapter.find with limited filtering
        const pgQuery: Record<string, unknown> = {}
        if (filterAction) pgQuery.action = filterAction
        if (filterStatus) pgQuery.status = filterStatus
        if (filterCollection) pgQuery.collectionName = filterCollection
        if (siteId) pgQuery.siteId = siteId
        logs = await adapter.find<any>('audit_logs', pgQuery, { sort: { timestamp: -1 }, skip: (page - 1) * limit, limit })
        try {
          if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
            const { count, eq, and } = await import('drizzle-orm')
            const { auditLog } = (adapter as any).systemTables || {}
            if (auditLog && (adapter as any).db) {
              const conditions = []
              if (filterAction) conditions.push(eq(auditLog.action, filterAction))
              if (filterStatus) conditions.push(eq(auditLog.status, filterStatus))
              if (filterCollection) conditions.push(eq(auditLog.collectionName, filterCollection))
              if (siteId) conditions.push(eq(auditLog.siteId, siteId))
              const res = await (adapter as any).db.select({ value: count() }).from(auditLog).where(conditions.length ? and(...conditions) : undefined)
              total = res[0].value
            } else {
              total = await adapter.count('audit_logs', pgQuery)
            }
          } else {
            total = await adapter.count('audit_logs', pgQuery)
          }
        } catch {
          total = logs.length
        }
      }

      res.json(
        createResponse(logs, {
          pagination: { page, pageSize: limit, total, totalPages: Math.ceil(total / limit) },
        })
      )
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/audit-logs/stats',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const siteId = req.headers['x-zenith-site-id'] as string
      const query: Record<string, unknown> = {}
      if (siteId) query.siteId = siteId

      let total = 0
      let failedCount = 0
      let successCount = 0
      let actionCounts: Record<string, number> = {}

      if (adapter.name === 'mongoose') {
        const { default: mongoose } = await import('mongoose')
        const model = mongoose.models['AuditLog']
        if (model) {
          total = await model.countDocuments(query)
          const failedQuery = { ...query, status: 'failed' }
          failedCount = await model.countDocuments(failedQuery)
          successCount = total - failedCount
          const agg = await model.aggregate([
            { $match: query },
            { $group: { _id: '$action', count: { $sum: 1 } } },
          ]).exec()
          actionCounts = Object.fromEntries(agg.map((a: any) => [a._id, a.count]))
        }
      } else {
        try {
          const all = await adapter.find<any>('audit_logs', {}, { limit: 10000 })
          total = all.length
          failedCount = all.filter((l: any) => l.status === 'failed').length
          successCount = total - failedCount
          actionCounts = all.reduce((acc: Record<string, number>, l: any) => {
            acc[l.action] = (acc[l.action] || 0) + 1
            return acc
          }, {})
        } catch {
          // stats unavailable
        }
      }

      res.json(createResponse({
        total,
        failed: failedCount,
        success: successCount,
        byAction: actionCounts,
      }))
    } catch (err) {
      next(err)
    }
  }
)

router.get(
  '/audit-logs/:id',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const { id } = req.params
      const log = await adapter.findOne<any>('audit_logs', { id })
      if (!log) return res.status(404).json(createErrorResponse(404, 'Audit log not found'))
      res.json(createResponse(log))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/audit-logs/purge',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const { before, action, status: filterStatus, siteId: filterSiteId } = req.body
      const siteId = req.headers['x-zenith-site-id'] as string

      const query: Record<string, unknown> = {}
      if (before) query.timestamp = { $lt: new Date(before) }
      if (action) query.action = action
      if (filterStatus) query.status = filterStatus
      if (siteId) query.siteId = siteId
      if (filterSiteId) query.siteId = filterSiteId

      const deleted = await adapter.deleteMany('audit_logs', query)
      res.json(createResponse({ deleted, message: `Purged ${deleted} audit log entries` }))
    } catch (err) {
      next(err)
    }
  }
)

// ── Audit Log Retention Info ────────────────────────────────────────────────
router.get(
  '/audit-logs/retention',
  requireAuth,
  requireRole('admin'),
  async (_req: Request, res: Response, next) => {
    try {
      const { getAuditRetentionInfo } = await import('../services/audit-rotation')
      const info = await getAuditRetentionInfo()
      res.json(createResponse(info))
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

const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
})

router.post(
  '/api-keys',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const parsed = apiKeySchema.safeParse(req.body)
      if (!parsed.success) throw new InvalidPayloadError('Invalid input: ' + parsed.error.errors.map(e => e.message).join(', '))
      const { name, role, expiresInDays } = parsed.data
      const result = await ApiKeyService.generateKey(name, role, expiresInDays)
      res.status(201).json(createResponse(result))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/api-keys/:id/revoke',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
      await adapter.update('z_api_keys', req.params.id, { revoked: true, revokedAt: new Date() })
      res.json(createResponse({ success: true }))
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

router.post('/ai/tag-image', aiLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { imageUrl } = req.body
    if (!imageUrl) throw new InvalidPayloadError('imageUrl is required')
    const result = await AIService.generateImageTags(imageUrl)
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

// ── Semantic Vector Search ───────────────────────────────────────────────────

router.get('/search/semantic', searchLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const q = req.query.q as string
    if (!q) throw new InvalidPayloadError('Query required')
    if (!VectorSearchService.isAvailable()) {
      return res.status(503).json(createErrorResponse(503, 'Semantic search requires OPENAI_API_KEY or OPENROUTER_API_KEY'))
    }
    const config = (req as any).zenith?.config
    const siteId = req.headers['x-zenith-site-id'] as string
    const collections = (config?.collections || []).map((c: any) => c.slug)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const results = await VectorSearchService.search(q.trim(), collections, limit, siteId)
    res.json(createResponse({ results, count: results.length }))
  } catch (err) {
    next(err)
  }
})

router.post('/search/index-document', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { collection, documentId, field, text, siteId } = req.body
    if (!collection || !documentId || !field || !text) {
      throw new InvalidPayloadError('collection, documentId, field, and text are required')
    }
    if (!VectorSearchService.isAvailable()) {
      return res.status(503).json(createErrorResponse(503, 'Semantic search requires OPENAI_API_KEY or OPENROUTER_API_KEY'))
    }
    await VectorSearchService.indexDocument(collection, documentId, field, text, siteId)
    res.json(createResponse({ success: true }))
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
          publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',
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
        const site = await adapter.findOne<any>('z_sites', {})
        const siteId = site ? (site.id || site._id).toString() : undefined
        await seedTailoredData(projectType, adapter, siteId)
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

// ── Prometheus Metrics ─────────────────────────────────────────────────────────
router.get('/metrics', async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.send(getPrometheusMetrics())
})

export default router
