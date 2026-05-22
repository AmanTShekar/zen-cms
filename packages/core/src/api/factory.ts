import { Router, Request, Response, NextFunction } from 'express'
import { CollectionConfig, WebhookTarget } from '@zenithcms/types'
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

/**
 * Helper to dynamically query and verify granular role permissions in the database.
 */
async function verifyGranularAccess(
  user: any,
  resource: string,
  action: string,
  adapter: DatabaseAdapter
): Promise<boolean | null> {
  if (!user || !user.role) return null
  if (user.role === 'admin') return true

  try {
    const roleRecord = await adapter.findOne<any>('z_roles', { roleName: user.role })
    if (!roleRecord || !roleRecord.permissions) {
      return null // Fallback to schema/default static roles
    }

    const permission = roleRecord.permissions.find(
      (p: any) => p.resource === resource || p.resource === '*'
    )

    if (permission) {
      const allowedActions = permission.actions || []
      if (allowedActions.includes(action) || allowedActions.includes('*')) {
        return true
      }
      return false
    }

    // Deny if dynamic role configuration exists but this resource is not configured
    return false
  } catch (err) {
    return null // Fallback
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
      schema: any
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

  const verifyAccess = async (user: any, action: keyof NonNullable<CollectionConfig['access']>) => {
    if (config.publicRead && action === 'read' && !user) return

    // Dynamic Role Permissions Check
    const granularAccess = await verifyGranularAccess(user, config.slug, action as string, adapter)
    if (granularAccess === true) return
    if (granularAccess === false) throw new ForbiddenError()

    const accessFn = config.access?.[action]
    if (accessFn) {
      const result = await accessFn(user)
      if (result === false) throw new ForbiddenError()
    }
  }

  const sanitizeFields = (doc: any, user: any, action: 'read' | 'update') => {
    if (!doc) return doc
    const sanitized = { ...doc }
    config.fields.forEach((field) => {
      if ((field as any).access?.[action] && !(field as any).access[action]!(user)) {
        delete sanitized[field.name]
      }
    })
    return sanitized
  }

  // ── Authentication & Role Middleware ──────────────────────────────────────────

  router.use((req, res, next) => {
    // Public read: allow GET without auth if configured
    if (config.publicRead && req.method === 'GET') return next()
    return requireAuth(req, res, next)
  })

  // Role enforcement per verb — delegates to schema access functions first,
  // then falls back to safe defaults so the framework never hardcodes role names.
  router.use(async (req, res, next) => {
    if (req.method === 'GET') return next() // read handled per-route via verifyAccess

    const user = (req as any).user
    if (!user) return next() // will be caught by requireAuth above

    let action = 'read'
    if (req.method === 'POST') action = 'create'
    if (req.method === 'PATCH' || req.method === 'PUT') action = 'update'
    if (req.method === 'DELETE') action = 'delete'

    try {
      const granularAccess = await verifyGranularAccess(user, config.slug, action, adapter)
      if (granularAccess === true) return next()
      if (granularAccess === false) {
        return res.status(403).json({ error: { message: `Access Denied: Role permissions deny "${action}" on resource "${config.slug}".` } })
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
      const user = (req as any).user
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'read')

      if (config.singleton) {
        const doc = await contentService.findById('singleton', { user, locale, siteId })
        return res.json(createResponse(sanitizeFields(doc, user, 'read')))
      }

      const { filter, sort, pagination, select, populate } = parseQueryParams(req.query, config)
      const cacheKey = `${cachePrefix}:list:${JSON.stringify(req.query)}:loc:${locale || 'en'}:site:${siteId || ''}`

      const cached = CacheService.get(cacheKey)
      if (cached) return res.json(cached)

      const skip = (pagination.page - 1) * pagination.pageSize
      const findFilter = siteId ? { ...filter, siteId } : filter
      const [docs, total] = await Promise.all([
        contentService.find(filter, {
          user,
          locale,
          sort,
          skip,
          limit: pagination.pageSize,
          select,
          populate,
          siteId,
        } as any),
        adapter.count(config.slug, findFilter),
      ])

      const response = createResponse(
        docs.map((d) => sanitizeFields(d, user, 'read')),
        { pagination: { ...pagination, total, totalPages: Math.ceil(total / pagination.pageSize) } }
      )

      CacheService.set(cacheKey, response, 60, [config.slug])
      res.json(response)
    } catch (err) {
      next(err)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as any).user
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'read')

      const doc = await contentService.findById(req.params.id, { user, locale, siteId })
      if (!doc) throw new NotFoundError(config.name, req.params.id)

      res.json(createResponse(sanitizeFields(doc, user, 'read')))
    } catch (err) {
      next(err)
    }
  })

  router.post('/', async (req, res, next) => {
    try {
      const { schema, contentService } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      await verifyAccess(user, 'create')

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

      res.status(201).json(createResponse(sanitizeFields(doc, user, 'read')))
    } catch (err) {
      next(err)
    }
  })

  router.patch('/', async (req, res, next) => {
    try {
      if (!config.singleton) return next()
      const { schema, contentService } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      await verifyAccess(user, 'update')

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

      res.json(createResponse(sanitizeFields(doc, user, 'read')))
    } catch (err) {
      next(err)
    }
  })

  router.patch('/:id', async (req, res, next) => {
    try {
      const { schema, contentService } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      await verifyAccess(user, 'update')

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

      res.json(createResponse(sanitizeFields(doc, user, 'read')))
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:id', async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'delete')

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
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'create')

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

      const importedDocs: any[] = []
      const errors: any[] = []

      // Validate all records first so we fail fast before touching the DB.
      const validRecords: Array<{ index: number; data: any }> = []
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
      const adapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()

      for (let b = 0; b < validRecords.length; b += BATCH_SIZE) {
        const batch = validRecords.slice(b, b + BATCH_SIZE)
        
        try {
          await adapter.transaction(async (session: any) => {
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
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'read')

      // Cap at 1000 records per export request to prevent V8 heap exhaustion.
      // For larger datasets, use the pagination query params (?page=N) and call repeatedly.
      const requestedLimit = Math.min(parseInt(req.query.limit as string) || 1000, 1000)
      const page = Math.max(parseInt(req.query.page as string) || 1, 1)
      const skip = (page - 1) * requestedLimit

      const [docs, total] = await Promise.all([
        contentService.find({}, { user, siteId, limit: requestedLimit, skip } as any),
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


  // ── Count ───────────────────────────────────────────────────────────────────

  router.get('/count', async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'read')

      const filter: Record<string, any> = {}
      if (siteId) filter.siteId = siteId
      // Parse where params from query string
      for (const [key, value] of Object.entries(req.query)) {
        if (key.startsWith('where[') && key.endsWith(']')) {
          const fieldName = key.slice(6, -1)
          filter[fieldName] = value
        }
      }

      const count = await adapter.count(config.slug, filter)
      res.json(createResponse({ count }))
    } catch (err) {
      next(err)
    }
  })

  // ── Aggregate ────────────────────────────────────────────────────────────────

  router.post('/aggregate', async (req, res, next) => {
    try {
      const user = (req as any).user
      await verifyAccess(user, 'read')
      const { pipeline } = req.body
      if (!Array.isArray(pipeline)) {
        return res.status(400).json({ error: { message: 'pipeline must be an array' } })
      }
      const results = await adapter.aggregate(config.slug, pipeline)
      res.json(createResponse({ results }))
    } catch (err) {
      next(err)
    }
  })

  // ── Versioning & History ────────────────────────────────────────────────────

  if (config.versions) {
    router.get('/:id/versions', async (req, res, next) => {
      try {
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
