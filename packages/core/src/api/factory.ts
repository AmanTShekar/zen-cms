/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { CollectionConfig, WebhookTarget } from '@zenith-open/zenithcms-types'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { getCompiledZodSchema } from '../schema/engine'
import { createResponse } from './utils'
import { requireAuth } from '../middleware/auth'
import { WebhookService } from '../services/webhook'
import { CacheService } from '../services/cache'
import { ContentService } from '../services/content'
import { parseQueryParams } from './query-parser'
import { NotFoundError, ForbiddenError, ValidationError } from '../errors'
import { eventHub } from '../services/event-hub'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { mutationLimiter } from '../middleware/rate-limit'

/**
 * Helper to dynamically query and verify granular role permissions in the database.
 */
interface GranularAccessResult {
  allowed: boolean
  fieldPermissions?: Record<string, { read?: boolean; write?: boolean }>
}

import { RBACEngine } from '../services/rbac'

async function verifyGranularAccess(
  user: Record<string, any>,
  resource: string,
  action: string,
  _adapter: DatabaseAdapter,
  siteId?: string
): Promise<GranularAccessResult | null> {
  if (!user || !user.role) return null
  if (user.role === 'admin') return { allowed: true }

  const userFromDb = await _adapter.findOne<Record<string, any>>('users', { _id: user.id }) || 
                     await _adapter.findOne<Record<string, any>>('users', { id: user.id }) || user

  // ── Operator Content Restriction (Special Access) ──
  // If the operator has a defined specialAccess array, it acts as a strict whitelist.
  // We must skip this whitelist for system collections needed to boot the CMS UI.
  if (Array.isArray((userFromDb as Record<string, any>).specialAccess) && (userFromDb as Record<string, any>).specialAccess.length > 0) {
    const isSystemResource = resource.startsWith('z_') || ['users', 'media', 'audit-logs'].includes(resource)
    
    if (!isSystemResource) {
      const hasAccess = (userFromDb as Record<string, any>).specialAccess.includes(`col:${resource}`) || (userFromDb as Record<string, any>).specialAccess.includes(`glb:${resource}`)
      if (!hasAccess) {
        return { allowed: false }
      }
    }
  }

  try {
    const hasAccess = await RBACEngine.checkAccess(user.role, resource, action as Record<string, any>, siteId)
    if (hasAccess === null) {
      // No custom role found, but they passed specialAccess. Allow fallback to schema access fns.
      return null
    }

    // ── Field-Level Permissions (Payload CMS parity) ──────────────────────────
    // Load the per-collection, per-field permission map from the role definition.
    // This is the key wire-up that makes fieldPermissions in z_roles actually work.
    const fieldPermissions = await RBACEngine.getFieldPermissions(user.role, resource, siteId)

    return { allowed: hasAccess, fieldPermissions }
  } catch (err) {
    return null // Fallback to schema access functions
  }
}

/**
 * ZENITH ROUTER FACTORY: DYNAMIC ENDPOINT GENERATOR
 * ────────────────────────────────────────────────
 * Orchestrates the conversion of static schemas into high-fidelity REST
 * endpoints. This is the primary bridge between the Schema Engine and
 * the HTTP pipeline.
 */
export function createCollectionRouter(
  config: CollectionConfig,
  adapter: DatabaseAdapter,
  webhooks: WebhookTarget[] = []
): Router {
  const router = Router()

  /**
   * LAZY CONTEXT INITIALIZATION
   * Deferring expensive Zod schema generation and Service instantiation
   * until the first request hits this collection endpoint.
   */
  const getContext = (() => {
    let context: {
      schema: Record<string, any>
      contentService: ContentService
      cachePrefix: string
    } | null = null

    return () => {
      if (!context) {
        context = {
          schema: getCompiledZodSchema(config.fields, config),
          contentService: new ContentService(config, adapter),
          cachePrefix: `col:${config.slug}`,
        }
      }
      return context
    }
  })()

  // ── Access Control Helper ──────────────────────────────────────────────────

  const verifyAccess = async (user: Record<string, any>, action: keyof NonNullable<CollectionConfig['access']>, siteId?: string) => {
    let fieldPermissions: Record<string, any> = {}
    if (config.publicRead && action === 'read' && !user) return fieldPermissions

    // Dynamic Role Permissions Check
    const granularAccess = await verifyGranularAccess(user, config.slug, action as string, adapter, siteId)
    if (granularAccess) {
      if (granularAccess.allowed === false) throw new ForbiddenError()
      fieldPermissions = granularAccess.fieldPermissions || {}
      return fieldPermissions
    }

    const accessFn = config.access?.[action]
    if (accessFn) {
      const result = await accessFn(user)
      if (result === false) throw new ForbiddenError()
    }
    return fieldPermissions
  }

  const sanitizeFields = (doc: Record<string, any>, user: Record<string, any>, action: 'read' | 'update', fieldPermissions: Record<string, { read?: boolean; write?: boolean }> = {}) => {
    if (!doc) return doc
    const sanitized = { ...doc }
    config.fields.forEach((field) => {
      const fieldPerms = fieldPermissions[field.name]
      if (fieldPerms) {
        const hasAccess = action === 'read' ? fieldPerms.read !== false : fieldPerms.write !== false
        if (!hasAccess) {
          delete sanitized[field.name]
          return
        }
      }

      if ((field as Record<string, any>).access?.[action] && !(field as Record<string, any>).access[action]!(user)) {
        delete sanitized[field.name]
      }
    })
    return sanitized
  }

  const enforceWritePermissions = (data: Record<string, any>, fieldPermissions: Record<string, { write?: boolean }> = {}) => {
    if (!data) return data
    const result = { ...data }
    for (const key of Object.keys(result)) {
      if (fieldPermissions[key]?.write === false) {
        delete result[key]
      }
    }
    return result
  }

  // ── Authentication & Role Middleware ──────────────────────────────────────────

  router.use((req, res, next) => {
    if (!req.headers['x-zenith-site-id']) {
      return res.status(400).json({ error: { message: 'Missing x-zenith-site-id header' } })
    }

    // Public read: allow GET without auth if configured
    if (config.publicRead && req.method === 'GET') {
      req.siteId = req.headers['x-zenith-site-id'] as string
      return next()
    }
    return requireAuth(req, res, next)
  })

  // Role enforcement per verb — delegates to schema access functions first,
  // then falls back to safe defaults so the framework never hardcodes role names.
  router.use(async (req, res, next) => {
    if (req.method === 'GET') return next() // read handled per-route via verifyAccess

    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).siteId
    if (!user) return next() // will be caught by requireAuth above

    let action = 'read'
    if (req.method === 'POST') action = 'create'
    if (req.method === 'PATCH' || req.method === 'PUT') action = 'update'
    if (req.method === 'DELETE') action = 'delete'

    try {
      const granularAccess = await verifyGranularAccess(user, config.slug, action, adapter, siteId)
      if (granularAccess) {
        if (granularAccess.allowed === false) {
          return res.status(403).json({ error: { message: `Access Denied: Role permissions deny "${action}" on resource "${config.slug}".` } })
        }
        return next()
      }

      if (req.method === 'DELETE') {
        // If the schema defines an explicit delete access function, use it.
        if (config.access?.delete) {
          if ((await config.access.delete(user)) === false) {
            return res.status(403).json({ error: { message: 'Access denied: delete not permitted.' } })
          }
        } else {
          // Safe default: only admin-role users may delete when no access fn is provided.
          if (user.role !== 'admin') {
            return res.status(403).json({ error: { message: 'Only administrators can delete documents.' } })
          }
        }
      } else if (req.method === 'POST') {
        if (config.access?.create) {
          if ((await config.access.create(user)) === false) {
            return res.status(403).json({ error: { message: 'Access denied: create not permitted.' } })
          }
        } else {
          // Safe default: viewers cannot create.
          if (user.role === 'viewer') {
            return res.status(403).json({ error: { message: 'Read-only access: viewers cannot create content.' } })
          }
        }
      } else if (req.method === 'PATCH' || req.method === 'PUT') {
        if (config.access?.update) {
          if ((await config.access.update(user)) === false) {
            return res.status(403).json({ error: { message: 'Access denied: update not permitted.' } })
          }
        } else {
          // Safe default: viewers cannot update.
          if (user.role === 'viewer') {
            return res.status(403).json({ error: { message: 'Read-only access: viewers cannot modify content.' } })
          }
        }
      }
    } catch (err: any) {
      return res.status(403).json({ error: { message: 'Access control evaluation failed.' } })
    }

    next()
  })

  // ── Route Handlers ─────────────────────────────────────────────────────────

  router.get('/', async (req, res, next) => {
    try {
      const { contentService, cachePrefix } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      const siteId = req.headers['x-zenith-site-id'] as string
      const fieldPermissions = await verifyAccess(user, 'read', req.siteId)

      if (config.singleton) {
        const doc = await contentService.findById('singleton', { user, locale, siteId })
        return res.json(createResponse(sanitizeFields(doc, user, 'read', fieldPermissions)))
      }

      const { filter, sort, pagination, select, populate } = parseQueryParams(req.query, config)
      const cacheKey = `${cachePrefix}:list:${JSON.stringify(req.query)}:loc:${locale || 'en'}:site:${siteId || ''}`

      const cached = CacheService.get(cacheKey)
      if (cached) {
        res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate')
        return res.json(cached)
      }

      const isCursorMode = !!pagination.cursor
      let findFilter = { ...filter, siteId }

      if (isCursorMode) {
        const sortField = sort.replace(/^-/, '')
        const sortDir = sort.startsWith('-') ? -1 : 1
        try {
          const decoded = Buffer.from(pagination.cursor!, 'base64').toString('utf-8')
          const [cursorUpdatedAt, cursorId] = decoded.split('_')
          if (cursorUpdatedAt && cursorId) {
            const cursorFilter: Record<string, any> = {
              $or: [
                { updatedAt: sortDir === 1 ? { $gt: new Date(cursorUpdatedAt) } : { $lt: new Date(cursorUpdatedAt) } },
                {
                  updatedAt: new Date(cursorUpdatedAt),
                  _id: sortDir === 1 ? { $gt: cursorId } : { $lt: cursorId },
                },
              ],
            }
            findFilter = { ...findFilter, ...cursorFilter }
          }
        } catch {
          // Invalid cursor — ignore and use offset mode fallback
        }
      }

      const limit = Math.min(isCursorMode ? (pagination.limit || pagination.pageSize) : pagination.pageSize, 1000)
      const clampedPageSize = Math.min(pagination.pageSize, 1000)
      const skip = isCursorMode ? 0 : (pagination.page - 1) * clampedPageSize

      const [docs, total] = await Promise.all([
        contentService.find(findFilter, {
          user,
          locale,
          sort,
          skip,
          limit,
          select,
          populate,
          siteId,
        } as Record<string, any>),
        isCursorMode ? Promise.resolve(-1) : adapter.count(config.slug, findFilter),
      ])

      const sanitized = docs.map((d) => sanitizeFields(d, user, 'read', fieldPermissions))

      const paginationMeta = isCursorMode
        ? { limit, hasNextPage: docs.length === limit }
        : { ...pagination, total, totalPages: Math.ceil(total / pagination.pageSize) }

      if (isCursorMode && docs.length > 0) {
        const lastDoc = docs[docs.length - 1] as Record<string, any>
        const nextCursor = Buffer.from(`${lastDoc.updatedAt}_${lastDoc._id || lastDoc.id}`).toString('base64')
        ;(paginationMeta as Record<string, any>).nextCursor = nextCursor
      }

      const response = createResponse(sanitized, { pagination: paginationMeta as Record<string, any> })

      const firstUpdated = (docs[0] as Record<string, any>)?.updatedAt || ''
      const lastUpdated = (docs[docs.length - 1] as Record<string, any>)?.updatedAt || ''
      const etag = crypto.createHash('sha256').update(`${total}:${pagination.pageSize}:${firstUpdated}:${lastUpdated}`).digest('hex').slice(0, 16)
      const ifNoneMatch = req.headers['if-none-match']
      if (ifNoneMatch === etag) {
        return res.status(304).end()
      }
      res.setHeader('ETag', `"${etag}"`)
      if (docs.length > 0 && lastUpdated) {
        res.setHeader('Last-Modified', new Date(lastUpdated).toUTCString())
      }
      res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate')

      CacheService.set(cacheKey, response, 60, [config.slug])
      res.json(response)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      const siteId = req.headers['x-zenith-site-id'] as string
      const fieldPermissions = await verifyAccess(user, 'read', req.siteId)

      const doc = await contentService.findById(req.params.id, { user, locale, siteId })
      if (!doc) throw new NotFoundError(config.name, req.params.id)

      const sanitized = sanitizeFields(doc, user, 'read', fieldPermissions)
      const etag = crypto.createHash('sha256').update(`${(doc as Record<string, any>)._id}:${(doc as Record<string, any>).updatedAt || ''}`).digest('hex').slice(0, 16)
      const ifNoneMatch = req.headers['if-none-match']
      if (ifNoneMatch === etag) {
        return res.status(304).end()
      }
      res.setHeader('ETag', `"${etag}"`)
      if ((doc as Record<string, any>).updatedAt) {
        res.setHeader('Last-Modified', new Date((doc as Record<string, any>).updatedAt).toUTCString())
      }
      res.setHeader('Cache-Control', 'private, max-age=300, must-revalidate')

      res.json(createResponse(sanitized))
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/preview-token', async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const siteId = req.headers['x-zenith-site-id'] as string
      // Just return a dummy token for now so frontend stops throwing 404
      const token = `preview_${req.params.id}_${Date.now()}`
      return res.json({ data: { token } })
    } catch (err: any) {
      next(err)
    }
  })

  router.post('/', mutationLimiter, async (req, res, next) => {
    try {
      const { schema, contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const siteId = req.headers['x-zenith-site-id'] as string
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      const fieldPermissions = await verifyAccess(user, 'create', req.siteId)
      req.body = enforceWritePermissions(req.body, fieldPermissions)

      const validation = schema.safeParse(req.body)
      if (!validation.success) {
        throw new ValidationError(
          Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
            field: f,
            message: (m as string[])[0],
          }))
        )
      }

      const doc = await contentService.create(validation.data, { user, siteId, locale })

      CacheService.invalidateTag(config.slug)

      res.status(201).json(createResponse(sanitizeFields(doc, user, 'read', fieldPermissions)))
    } catch (err) {
      next(err)
    }
  })

  router.patch('/', async (req, res, next) => {
    try {
      if (!config.singleton) return next()
      const { schema, contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const siteId = req.headers['x-zenith-site-id'] as string
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      const fieldPermissions = await verifyAccess(user, 'update', req.siteId)
      req.body = enforceWritePermissions(req.body, fieldPermissions)

      const validation = schema.partial().safeParse(req.body)
      if (!validation.success) {
        throw new ValidationError(
          Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
            field: f,
            message: (m as string[])[0],
          }))
        )
      }

      const { doc } = await contentService.update('singleton', validation.data, {
        user,
        siteId,
        locale,
      })

      CacheService.invalidateTag(config.slug)

      res.json(createResponse(sanitizeFields(doc, user, 'read', fieldPermissions)))
    } catch (err) {
      next(err)
    }
  })

  router.patch('/:id', mutationLimiter, async (req, res, next) => {
    try {
      const { schema, contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const siteId = req.headers['x-zenith-site-id'] as string
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      const fieldPermissions = await verifyAccess(user, 'update', req.siteId)
      req.body = enforceWritePermissions(req.body, fieldPermissions)

      const validation = schema.partial().safeParse(req.body)
      if (!validation.success) {
        throw new ValidationError(
          Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
            field: f,
            message: (m as string[])[0],
          }))
        )
      }

      const { doc } = await contentService.update(req.params.id, validation.data, {
        user,
        siteId,
        locale,
      })

      CacheService.invalidateTag(config.slug)

      res.json(createResponse(sanitizeFields(doc, user, 'read', fieldPermissions)))
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:id', mutationLimiter, async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'delete', req.siteId)

      await contentService.delete(req.params.id, { user, siteId })
      CacheService.invalidateTag(config.slug)
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  })

  // ── Content Import & Export ──────────────────────────────────────────────────

  router.post('/import', async (req, res, next) => {
    try {
      const { schema, contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'create', req.siteId)

      const records = req.body
      if (!Array.isArray(records)) {
        return res
          .status(400)
          .json({ error: { message: 'Import payload must be an array of records.' } })
      }

      // Hard cap: prevent accidental multi-GB uploads from hanging the server.
      const MAX_IMPORT = 5000
      if (records.length > MAX_IMPORT) {
        return res.status(400).json({
          error: { message: `Import is capped at ${MAX_IMPORT} records per request. Split your data into smaller batches.` },
        })
      }

      const importedDocs: Record<string, any>[] = []
      const errors: Record<string, any>[] = []

      // Validate all records first so we fail fast before touching the DB.
      const validRecords: Array<{ index: number; data: Record<string, any> }> = []
      for (let i = 0; i < records.length; i++) {
        const validation = schema.safeParse(records[i])
        if (!validation.success) {
          errors.push({
            index: i,
            errors: Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
              field: f,
              message: (m as string[])[0],
            })),
          })
        } else {
          validRecords.push({ index: i, data: validation.data })
        }
      }

      // Process in parallel batches of 50 to avoid N+1 serial waterfall.
      // Wrapped in a transaction to ensure atomicity per batch.
      const BATCH_SIZE = 50
      const adapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

      for (let b = 0; b < validRecords.length; b += BATCH_SIZE) {
        const batch = validRecords.slice(b, b + BATCH_SIZE)
        
        try {
          await adapter.transaction(async (session: Record<string, any>) => {
            const results = await Promise.all(
              batch.map(({ data }) => contentService.create(data, { user, siteId, session }))
            )
            results.forEach((doc) => {
              importedDocs.push(sanitizeFields(doc, user, 'read'))
            })
          })
        } catch (err: any) {
          // If transaction rolls back, mark all records in this batch as failed
          batch.forEach(({ index }) => {
            errors.push({
              index,
              message: err.message || 'Transaction failed, batch rolled back.',
            })
          })
        }
      }

      if (importedDocs.length > 0) {
        CacheService.invalidateTag(config.slug)
      }

      res.json(
        createResponse({
          importedCount: importedDocs.length,
          failedCount: errors.length,
          errors,
          data: importedDocs,
        })
      )
    } catch (err) {
      next(err)
    }
  })

  router.get('/export', async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'read', req.siteId)

      // Cap at 1000 records per export request to prevent V8 heap exhaustion.
      // For larger datasets, use the pagination query params (?page=N) and call repeatedly.
      const requestedLimit = Math.min(parseInt(req.query.limit as string) || 1000, 1000)
      const page = Math.max(parseInt(req.query.page as string) || 1, 1)
      const skip = (page - 1) * requestedLimit

      const [docs, total] = await Promise.all([
        contentService.find({}, { user, siteId, limit: requestedLimit, skip } as Record<string, any>),
        adapter.count(config.slug, siteId ? { siteId } : {}),
      ])

      const sanitizedDocs = docs.map((d) => sanitizeFields(d, user, 'read'))
      const totalPages = Math.ceil(total / requestedLimit)

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename=${config.slug}_export_p${page}_${Date.now()}.json`)
      res.json(createResponse(sanitizedDocs, {
        pagination: { page, pageSize: requestedLimit, total, totalPages },
        note: totalPages > 1 ? `This is page ${page} of ${totalPages}. Use ?page=N to export all records.` : undefined,
      }))
    } catch (err) {
      next(err)
    }
  })


  // ── Versioning & History ────────────────────────────────────────────────────

  if (config.versions) {
    router.get('/:id/versions', async (req, res, next) => {
      try {
        const { contentService } = getContext()
        const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
        const siteId = req.headers['x-zenith-site-id'] as string
        const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
        
        // ISOLATION FIX: Verify user can read this document first
        await contentService.findById(req.params.id, { user, locale, siteId })

        const versions = await adapter.getVersions(config.slug, req.params.id)
        res.json(createResponse(versions))
      } catch (err) {
        next(err)
      }
    })
  }

  // ── Custom Endpoints ────────────────────────────────────────────────────────

  if (config.endpoints) {
    config.endpoints.forEach((e) => {
      router[e.method](e.path, e.handler)
    })
  }

  return router
}
