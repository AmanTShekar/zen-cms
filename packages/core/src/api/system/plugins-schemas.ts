// @ts-nocheck
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

export function maskSettings(settings: Record<string, any>) {
  if (!settings) return settings
  const result = JSON.parse(JSON.stringify(settings)) // deep clone
  
  if (result.smtp?.password) result.smtp.password = MASK_PLACEHOLDER
  if (result.stripe?.secretKey) result.stripe.secretKey = MASK_PLACEHOLDER
  if (result.stripe?.webhookSecret) result.stripe.webhookSecret = MASK_PLACEHOLDER
  if (result.ai?.openaiKey) result.ai.openaiKey = MASK_PLACEHOLDER
  if (result.ai?.anthropicKey) result.ai.anthropicKey = MASK_PLACEHOLDER
  
  return result
}

export function unmaskSettings(incoming: Record<string, any>, existing: Record<string, any>) {
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
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
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
  defaultValue: z.any().optional(),
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
import { env } from '../../config/env';

export const systemRouter1: ERouter = ERouter();
const router = systemRouter1;


// ── Admin Component Registry (for plugin-injected UI) ────────────────────────

router.get('/settings/theme', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/css')
  // Serve the requested Emerald Green glassmorphism accent colors
  const css = `
    :root {
      --accent-rgb: 16 185 129;
      --color-emerald-green: #10B981;
      --status-green: #10B981;
    }
  `
  res.send(css)
})


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
router.post('/schema/reload', requireAuth, requireRole('admin'), async (req: Request, res: Response, next: import('express').NextFunction) => {
  try {
    const engine = req.app.get('zenith_engine')
    if (!engine || !engine.reloadSchema) {
      throw new Error('Engine reload is not available')
    }

    // Pass the currently loaded config or require parsing a fresh one? 
    // Usually a reload implies reading it fresh. Let's just pass nothing and it will use the current one or we can re-evaluate.
    // To make it truly dynamic, we can re-require cms.config.js here.
    let newConfig: Record<string, any>
    try {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const configPath = require('path').join(process.cwd(), 'cms.config')
      delete require.cache[require.resolve(configPath)]
      newConfig = require(configPath).default || require(configPath)
      /* eslint-enable @typescript-eslint/no-require-imports */
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
  const plugins = (engine?.plugins || []).map((p: Record<string, any>) => ({
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
  async (req: Request, res: Response, next: import('express').NextFunction) => {
    try {
      const { name, version, author, description } = req.body
      if (!name) throw new InvalidPayloadError('Plugin name is required')

      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      const exists = engine.plugins.some((p: Record<string, any>) => p.name.toLowerCase() === name.toLowerCase())
      if (exists) throw new InvalidPayloadError(`Plugin "${name}" is already injected`)

      const newPlugin = {
        name,
        version: version || '1.0.0',
        description: description || 'Injected module providing customized business logic.',
        author: author || 'Third Party',
        downloads: 1,
        apply: (cfg: Record<string, any>) => cfg,
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
  async (req: Request, res: Response, next: import('express').NextFunction) => {
    try {
      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      const plugin = engine.plugins.find(
        (p: Record<string, any>) => p.name.toLowerCase().replace(/\s+/g, '-') === req.params.id
      )
      if (!plugin) throw new InvalidPayloadError(`Plugin "${req.params.id}" not found`)
      ;(plugin as Record<string, any>).disabled = false
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
  async (req: Request, res: Response, next: import('express').NextFunction) => {
    try {
      const engine = req.app.get('zenith_engine')
      if (!engine) throw new Error('Zenith Engine is not running')

      const plugin = engine.plugins.find(
        (p: Record<string, any>) => p.name.toLowerCase().replace(/\s+/g, '-') === req.params.id
      )
      if (!plugin) throw new InvalidPayloadError(`Plugin "${req.params.id}" not found`)
      ;(plugin as Record<string, any>).disabled = true
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
function summarizeField(field: Record<string, any>): Record<string, any> {
  const summary: Record<string, any> = {
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
    summary.blocks = field.blocks.map((b: Record<string, any>) => b.slug)
  }
  if (Array.isArray(field.fields)) {
    summary.fields = field.fields.map(summarizeField)
  }
  if (Array.isArray(field.tabs)) {
    summary.tabs = field.tabs.map((tab: Record<string, any>) => ({
      name: tab.name,
      label: tab.label,
      fields: (tab.fields || []).map(summarizeField),
    }))
  }
  if (field.admin) {
    const admin: Record<string, any> = {}
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

function summarizeCollection(c: Record<string, any>): Record<string, any> {
  const summary: Record<string, any> = { slug: c.slug }
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

router.get('/openapi.json', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const config = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.config
  if (!config) return res.status(500).json(createErrorResponse(500, 'Config not loaded'))

  const paths: Record<string, any> = {}
  config.collections.forEach((c: Record<string, any>) => {
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
  const adapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter
  const dbHealth = adapter ? adapter.getHealth() : 'disconnected'
  const healthy = dbHealth === 'ok'
  const mem = process.memoryUsage()

  const data = {
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: dbHealth,
    version: process.env.ZENITH_VERSION || '1.0.0',
    environment: env.NODE_ENV || 'development',
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
    const config = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.config
    const adapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    if (!config || !adapter) return res.json(createResponse({}))
    const counts: Record<string, number> = {}
    await Promise.all(
      config.collections.map(async (col: Record<string, any>) => {
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
  requireRole('admin'), // ISOLATION FIX: only admins should read audit logs
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25))
      const search = (req.query.search as string) || ''
      const filterAction = (req.query.action as string) || ''
      const filterStatus = (req.query.status as string) || ''
      const filterCollection = (req.query.collection as string) || ''
      const siteId = req.headers['x-zenith-site-id'] as string

      // Build query with filters
      const query: Record<string, any> = {}
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

      // Handle unified adapter query
      let logs: Record<string, any>[] = []
      let total = 0
      
      const pgQuery: Record<string, any> = {}
      if (filterAction) pgQuery.action = filterAction
      if (filterStatus) pgQuery.status = filterStatus
      if (filterCollection) pgQuery.collectionName = filterCollection
      if (siteId) pgQuery.siteId = siteId
      
      try {
        total = await adapter.count('audit_logs', pgQuery)
        logs = await adapter.find<Record<string, any>>('audit_logs', pgQuery, { sort: { timestamp: -1 }, skip: (page - 1) * limit, limit })
      } catch (err) {
        // Fallback for adapter count error
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
      const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const siteId = req.headers['x-zenith-site-id'] as string
      const query: Record<string, any> = {}
      if (siteId) query.siteId = siteId

      let total = 0
      let failedCount = 0
      let successCount = 0
      let actionCounts: Record<string, number> = {}

      if (adapter.name === 'mongoose') {
        const conn = adapter.getNativeClient<Record<string, any>>()
        const model = conn?.models?.['AuditLog'] || conn?.model?.('AuditLog')
        if (model) {
          total = await model.countDocuments(query)
          const failedQuery = { ...query, status: 'failed' }
          failedCount = await model.countDocuments(failedQuery)
          successCount = total - failedCount
          const agg = await model.aggregate([
            { $match: query },
            { $group: { _id: '$action', count: { $sum: 1 } } },
          ]).exec()
          actionCounts = Object.fromEntries(agg.map((a: Record<string, any>) => [a._id, a.count]))
        }
      } else {
        try {
          const all = await adapter.find<Record<string, any>>('audit_logs', {}, { limit: 10000 })
          total = all.length
          failedCount = all.filter((l: Record<string, any>) => l.status === 'failed').length
          successCount = total - failedCount
          actionCounts = all.reduce((acc: Record<string, number>, l: Record<string, any>) => {
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
      const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const siteId = req.headers['x-zenith-site-id'] as string
      const { id } = req.params
      // ISOLATION FIX: scope by siteId to prevent cross-tenant audit log access
      const query: Record<string, any> = { id }
      if (siteId) query.siteId = siteId
      const log = await adapter.findOne<Record<string, any>>('audit_logs', query)
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
      const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const { before, action, status: filterStatus, siteId: filterSiteId } = req.body
      const siteId = req.headers['x-zenith-site-id'] as string

      const query: Record<string, any> = {}
      if (before) {
        // Timestamps are stored as ISO strings in the DB, so we compare lexically.
        query.timestamp = { $lt: new Date(before).toISOString() }
      }
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
      const { getAuditRetentionInfo } = await import('../../services/audit-rotation')
      const info = await getAuditRetentionInfo()
      res.json(createResponse(info))
    } catch (err) {
      next(err)
    }
  }
)

