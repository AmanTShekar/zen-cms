import { Router } from 'express'
import { CollectionConfig, WebhookTarget, FieldConfig, RelationFieldConfig } from '@zenithcms/types'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { getCompiledZodSchema } from '../schema/engine'
import { createResponse } from './utils'
import { requireAuth } from '../middleware/auth'
import { WebhookService } from '../services/webhook'
import { CacheService } from '../services/cache'
import { ContentService } from '../services/content'
import { parseQueryParams } from './query-parser'
import { NotFoundError, ForbiddenError, ValidationError, InvalidPayloadError } from '../errors'
import { eventHub } from '../services/event-hub'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { PreviewService } from '../services/preview'

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

async function resolveRelations(
  docs: any[],
  fields: FieldConfig[],
  populate: string[],
  depth: number,
  adapter: DatabaseAdapter,
  currentDepth = 0,
  configRegistry?: any
) {
  if (currentDepth >= depth || !docs || docs.length === 0) return

  const popByFirstSegment: Record<string, string[]> = {}
  for (const path of populate) {
    const parts = path.split('.')
    const first = parts[0]
    const rest = parts.slice(1).join('.')
    if (!popByFirstSegment[first]) {
      popByFirstSegment[first] = []
    }
    if (rest) {
      popByFirstSegment[first].push(rest)
    }
  }

  for (const field of fields) {
    const fieldName = field.name
    const hasWildcard = populate.includes('*') || popByFirstSegment['*'] !== undefined
    const isExplicitlyPopulated = fieldName in popByFirstSegment || hasWildcard
    const shouldResolveRelation =
      isExplicitlyPopulated ||
      (depth > 0 &&
        ((field.type as string) === 'relation' || (field.type as string) === 'relationship' || field.type === 'media'))

    if (
      shouldResolveRelation &&
      ((field.type as string) === 'relation' || (field.type as string) === 'relationship' || field.type === 'media')
    ) {
      const relationTo = field.type === 'media' ? 'media' : (field as any).relationTo
      if (!relationTo) continue

      const idsToFetch = new Set<string>()
      for (const doc of docs) {
        if (!doc) continue
        const val = doc[fieldName]
        if (Array.isArray(val)) {
          val.forEach((id: any) => {
            if (id && typeof id === 'string') idsToFetch.add(id)
            else if (id && typeof id === 'object' && id._id) idsToFetch.add(id._id.toString())
            else if (id && typeof id === 'object' && id.id) idsToFetch.add(id.id.toString())
          })
        } else if (val) {
          if (typeof val === 'string') idsToFetch.add(val)
          else if (typeof val === 'object' && val._id) idsToFetch.add(val._id.toString())
          else if (typeof val === 'object' && val.id) idsToFetch.add(val.id.toString())
        }
      }

      if (idsToFetch.size > 0) {
        const idsArray = Array.from(idsToFetch)
        let relatedDocs: any[] = []
        try {
          relatedDocs = await adapter.find(relationTo, { _id: { $in: idsArray } })
        } catch (err) {
          console.error(`Failed to fetch relations from ${relationTo}`, err)
        }

        const relatedMap = new Map<string, any>()
        for (const rDoc of relatedDocs) {
          const idStr = rDoc._id?.toString() || rDoc.id?.toString()
          if (idStr) relatedMap.set(idStr, rDoc)
        }

        const nestedPopulate = hasWildcard ? ['*'] : (popByFirstSegment[fieldName] || [])
        const targetCol =
          configRegistry?.collections?.find((c: any) => c.slug === relationTo) ||
          (relationTo === 'media'
            ? {
                slug: 'media',
                fields: [
                  { name: 'name', type: 'text' },
                  { name: 'url', type: 'text' },
                  { name: 'alt', type: 'text' },
                  { name: 'folder', type: 'text' },
                  { name: 'mimetype', type: 'text' },
                  { name: 'size', type: 'number' },
                ],
              }
            : null)

        if (targetCol && relatedDocs.length > 0) {
          await resolveRelations(
            relatedDocs,
            targetCol.fields,
            nestedPopulate,
            depth,
            adapter,
            currentDepth + 1,
            configRegistry
          )
        }

        for (const doc of docs) {
          if (!doc) continue
          const val = doc[fieldName]
          if (Array.isArray(val)) {
            doc[fieldName] = val
              .map((id: any) => {
                const idStr = typeof id === 'string' ? id : (id?._id?.toString() || id?.id?.toString())
                return relatedMap.get(idStr) || id
              })
              .filter(Boolean)
          } else if (val) {
            const idStr = typeof val === 'string' ? val : (val?._id?.toString() || val?.id?.toString())
            doc[fieldName] = relatedMap.get(idStr) || val
          }
        }
      }
    }

    if ((field.type === 'group' || field.type === 'collapsible') && docs) {
      const nestedDocs: any[] = []
      for (const doc of docs) {
        if (doc && doc[fieldName] && typeof doc[fieldName] === 'object') {
          nestedDocs.push(doc[fieldName])
        }
      }
      const nestedPopulate = hasWildcard
        ? ['*']
        : popByFirstSegment[fieldName] ||
          populate.filter((p) => p.startsWith(fieldName + '.')).map((p) => p.slice(fieldName.length + 1))
      await resolveRelations(
        nestedDocs,
        (field as any).fields || [],
        nestedPopulate,
        depth,
        adapter,
        currentDepth,
        configRegistry
      )
    } else if (field.type === 'array' && docs) {
      const nestedDocs: any[] = []
      for (const doc of docs) {
        if (doc && Array.isArray(doc[fieldName])) {
          nestedDocs.push(...doc[fieldName])
        }
      }
      const nestedPopulate = hasWildcard
        ? ['*']
        : popByFirstSegment[fieldName] ||
          populate.filter((p) => p.startsWith(fieldName + '.')).map((p) => p.slice(fieldName.length + 1))
      await resolveRelations(
        nestedDocs,
        (field as any).fields || [],
        nestedPopulate,
        depth,
        adapter,
        currentDepth,
        configRegistry
      )
    } else if (field.type === 'blocks' && docs) {
      const nestedPopulate = hasWildcard
        ? ['*']
        : popByFirstSegment[fieldName] ||
          populate.filter((p) => p.startsWith(fieldName + '.')).map((p) => p.slice(fieldName.length + 1))
      const blocksList = (field as any).blocks || []
      for (const blockDef of blocksList) {
        const nestedDocsForBlock: any[] = []
        for (const doc of docs) {
          if (doc && Array.isArray(doc[fieldName])) {
            for (const item of doc[fieldName]) {
              if (item && item.blockType === blockDef.slug) {
                nestedDocsForBlock.push(item)
              }
            }
          }
        }
        if (nestedDocsForBlock.length > 0) {
          await resolveRelations(
            nestedDocsForBlock,
            blockDef.fields || [],
            nestedPopulate,
            depth,
            adapter,
            currentDepth,
            configRegistry
          )
        }
      }
    }
  }
}

function applySelect(doc: any, selectStr: string) {
  if (!doc || !selectStr) return doc
  const selectedFields = selectStr
    .split(' ')
    .map((s) => s.trim())
    .filter(Boolean)
  if (selectedFields.length === 0) return doc

  const keysToKeep = new Set([
    ...selectedFields,
    'id',
    '_id',
    '_status',
    'createdAt',
    'updatedAt',
    'siteId',
  ])
  const cleaned: any = {}
  for (const key of Object.keys(doc)) {
    if (keysToKeep.has(key)) {
      cleaned[key] = doc[key]
    }
  }
  return cleaned
}

function applySelectToDocs(docs: any | any[], selectStr: string) {
  if (!selectStr) return docs
  if (Array.isArray(docs)) {
    return docs.map((doc) => applySelect(doc, selectStr))
  }
  return applySelect(docs, selectStr)
}


function serializeBlocks(doc: any, fields: FieldConfig[]) {
  if (!doc || typeof doc !== 'object') return
  for (const field of fields) {
    const val = doc[field.name]
    if (val === undefined || val === null) continue

    if ((field.type as string) === 'blocks' || (field.type as string) === 'dz') {
      if (Array.isArray(val)) {
        doc[field.name] = val.map((block: any) => {
          if (block && typeof block === 'object') {
            const blockType = block.blockType || (block.__component ? block.__component.split('.').pop() : undefined)
            const __component = block.__component || (block.blockType ? `sections.${block.blockType}` : undefined)
            return {
              ...block,
              blockType,
              __component,
            }
          }
          return block
        })
      }
    } else if (field.type === 'array' || field.type === 'group' || field.type === 'collapsible') {
      if (Array.isArray(val)) {
        val.forEach((item: any) => {
          if (item && typeof item === 'object') {
            serializeBlocks(item, (field as any).fields || [])
          }
        })
      } else if (typeof val === 'object') {
        serializeBlocks(val, (field as any).fields || [])
      }
    }
  }
}

/**
 * ZENITH ROUTER FACTORY: DYNAMIC ENDPOINT GENERATOR
 * ────────────────────────────────────────────────
 * Orchestrates the conversion of static schemas into high-fidelity REST
 * endpoints. This is the primary bridge between the Schema Engine and
 * the HTTP pipeline.
 */
export { resolveRelations, applySelect, applySelectToDocs, serializeBlocks }

/**
 * Cascade Delete Handler
 * ──────────────────────
 * After a document is deleted, scans all other collections for relation fields
 * that reference the deleted collection and takes action per the `onDelete` policy:
 *   - SET_NULL (default): Nullify the reference on related documents
 *   - CASCADE: Delete related documents
 *   - RESTRICT: Throw if related documents exist (should be called before delete)
 *   - NO_ACTION: Leave references as-is
 */
async function handleCascadeDeletes(
  adapter: DatabaseAdapter,
  collectionSlug: string,
  deletedDocId: string,
  collections: CollectionConfig[]
): Promise<void> {
  for (const col of collections) {
    if (col.slug === collectionSlug) continue
    if (!col.fields) continue

    for (const field of col.fields) {
      if (field.type !== 'relation') continue
      const relField = field as RelationFieldConfig
      const targets = Array.isArray(relField.relationTo) ? relField.relationTo : [relField.relationTo]

      if (!targets.includes(collectionSlug)) continue

      const onDelete = relField.onDelete || 'SET_NULL'

      if (relField.hasMany) {
        // Find docs whose array field contains the deleted ID
        const relatedDocs = await adapter.find(col.slug, { [field.name]: deletedDocId })
        for (const doc of relatedDocs) {
          const docId = (doc as any)._id?.toString() || (doc as any).id?.toString()
          if (!docId) continue

          switch (onDelete) {
            case 'CASCADE':
              await adapter.delete(col.slug, docId, {})
              break
            case 'SET_NULL': {
              const current = Array.isArray((doc as any)[field.name]) ? (doc as any)[field.name] : []
              await adapter.update(col.slug, docId, {
                [field.name]: current.filter((id: any) => {
                  const idStr = typeof id === 'object' ? id?.id || id?._id : id
                  return idStr?.toString() !== deletedDocId
                }),
              })
              break
            }
            case 'RESTRICT':
              throw new Error(
                `Cannot delete: "${col.name}" has a "${field.name}" reference to this document (RESTRICT policy)`
              )
            case 'NO_ACTION':
              break
          }
        }
      } else {
        // Single relation — find docs pointing to the deleted ID
        const relatedDoc = await adapter.findOne(col.slug, { [field.name]: deletedDocId })
        if (!relatedDoc) continue
        const docId = (relatedDoc as any)._id?.toString() || (relatedDoc as any).id?.toString()
        if (!docId) continue

        switch (onDelete) {
          case 'CASCADE':
            await adapter.delete(col.slug, docId, {})
            break
          case 'SET_NULL':
            await adapter.update(col.slug, docId, { [field.name]: null })
            break
          case 'RESTRICT':
            throw new Error(
              `Cannot delete: "${col.name}" has a "${field.name}" reference to this document (RESTRICT policy)`
            )
          case 'NO_ACTION':
            break
        }
      }
    }
  }
}

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
    if (action === 'read') {
      serializeBlocks(sanitized, config.fields)
    }
    return sanitized
  }

  /** Strip fields the user is not allowed to set on create/update. */
  const restrictInputFields = (data: any, user: any, action: 'create' | 'update') => {
    if (!data || typeof data !== 'object') return data
    const restricted = { ...data }
    for (const field of config.fields) {
      const fieldAccess = (field as any).access
      if (fieldAccess && fieldAccess[action] && !fieldAccess[action]!(user)) {
        delete restricted[field.name]
      }
      // Also strip read-only fields (access.update === false) on create to prevent
      // privilege escalation — a user could set fields they shouldn't have write access to.
      if (action === 'create' && fieldAccess?.update && !fieldAccess.update(user)) {
        delete restricted[field.name]
      }
    }
    return restricted
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
    // Skip general CRUD verb checks for non-CRUD sub-routes like /preview-token or /aggregate
    if (req.path.endsWith('/preview-token') || req.path === '/aggregate') {
      return next()
    }

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
        throw new ForbiddenError(`Role permissions deny "${action}" on resource "${config.slug}".`)
      }

      if (req.method === 'DELETE') {
        if (config.access?.delete) {
          if ((await config.access.delete(user)) === false) {
            throw new ForbiddenError('Access denied: delete not permitted.')
          }
        } else {
          if (user.role !== 'admin') {
            throw new ForbiddenError('Only administrators can delete documents.')
          }
        }
      } else if (req.method === 'POST') {
        if (config.access?.create) {
          if ((await config.access.create(user)) === false) {
            throw new ForbiddenError('Access denied: create not permitted.')
          }
        } else {
          if (user.role === 'viewer') {
            throw new ForbiddenError('Read-only access: viewers cannot create content.')
          }
        }
      } else if (req.method === 'PATCH' || req.method === 'PUT') {
        if (config.access?.update) {
          if ((await config.access.update(user)) === false) {
            throw new ForbiddenError('Access denied: update not permitted.')
          }
        } else {
          if (user.role === 'viewer') {
            throw new ForbiddenError('Read-only access: viewers cannot modify content.')
          }
        }
      }
    } catch (err) {
      next(err)
      return
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
        const { select, populate, depth } = parseQueryParams(req.query, config, req.body)
        if (doc) {
          const configRegistry = (req as any).zenith?.config
          const effectiveDepth = depth !== undefined ? depth : (populate.length > 0 ? 5 : 0)
          if (effectiveDepth > 0 || populate.length > 0) {
            await resolveRelations([doc], config.fields, populate, effectiveDepth, adapter, 0, configRegistry)
          }
          let sanitizedDoc = sanitizeFields(doc, user, 'read')
          if (select) {
            sanitizedDoc = applySelect(sanitizedDoc, select)
          }
          return res.json(createResponse(sanitizedDoc))
        }
        return res.json(createResponse(null))
      }

      const { filter, sort, pagination, select, populate, depth } = parseQueryParams(req.query, config, req.body)
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

      const configRegistry = (req as any).zenith?.config
      const effectiveDepth = depth !== undefined ? depth : (populate.length > 0 ? 5 : 0)
      if (effectiveDepth > 0 || populate.length > 0) {
        await resolveRelations(docs, config.fields, populate, effectiveDepth, adapter, 0, configRegistry)
      }

      let sanitizedDocs = docs.map((d) => sanitizeFields(d, user, 'read'))
      if (select) {
        sanitizedDocs = applySelectToDocs(sanitizedDocs, select)
      }

      const response = createResponse(
        sanitizedDocs,
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

      const { select, populate, depth } = parseQueryParams(req.query, config, req.body)
      // For singletons, always use 'singleton' as the id so the content service
      // looks up the document without requiring a specific _id match.
      const docId = config.singleton ? 'singleton' : req.params.id
      const doc = await contentService.findById(docId, { user, locale, siteId })
      if (!doc) throw new NotFoundError(config.name, docId)

      const configRegistry = (req as any).zenith?.config
      const effectiveDepth = depth !== undefined ? depth : (populate.length > 0 ? 5 : 0)
      if (effectiveDepth > 0 || populate.length > 0) {
        await resolveRelations([doc], config.fields, populate, effectiveDepth, adapter, 0, configRegistry)
      }

      let sanitizedDoc = sanitizeFields(doc, user, 'read')
      if (select) {
        sanitizedDoc = applySelect(sanitizedDoc, select)
      }

      res.json(createResponse(sanitizedDoc))
    } catch (err) {
      next(err)
    }
  })

  // ── Preview Token ──────────────────────────────────────────────────────────
  router.post('/:id/preview-token', async (req, res, next) => {
    try {
      const user = (req as any).user
      await verifyAccess(user, 'read')
      const previewId = config.singleton ? 'singleton' : req.params.id
      const token = PreviewService.generatePreviewToken(config.slug, previewId)
      res.json(createResponse({ token, collection: config.slug, id: previewId }))
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

      const body = restrictInputFields(req.body, user, 'create')
      const validation = schema.safeParse(body)
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

      const body = restrictInputFields(req.body, user, 'update')
      const validation = schema.partial().safeParse(body)
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
        expectedVersion: req.body._version,
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

      const body = restrictInputFields(req.body, user, 'update')
      const validation = schema.partial().safeParse(body)
      if (!validation.success) {
        throw new ValidationError(
          Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({
            field: f,
            message: (m as string[])[0],
          }))
        )
      }

      // For singletons, always use 'singleton' as the id so the content service
      // looks up the document without requiring a specific _id match.
      const docId = config.singleton ? 'singleton' : req.params.id

      const { doc } = await contentService.update(docId, validation.data, {
        user,
        siteId,
        locale,
        expectedVersion: req.body._version,
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

      // Cascade delete: clean up relation references in other collections
      const allCollections = (req as any).zenith?.config?.collections || []
      await handleCascadeDeletes(adapter, config.slug, req.params.id, allCollections)

      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  })

  // ── Soft Delete Endpoints ──────────────────────────────────────────────────
  router.get('/trash', async (req, res, next) => {
    try {
      if (!config.softDelete) throw new NotFoundError('Trash not enabled for this collection', 'trash')
      const { contentService, cachePrefix } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      const locale = (req.query.locale as string) || (req.headers['x-zenith-locale'] as string)
      await verifyAccess(user, 'read')

      const { filter, sort, pagination, select, populate, depth } = parseQueryParams(req.query, config, req.body)
      const skip = (pagination.page - 1) * pagination.pageSize
      const findFilter = siteId ? { ...filter, siteId } : filter
      
      // Override to explicitly fetch only deleted items
      const trashFilter = { ...findFilter, deletedAt: { $ne: null } }

      const [docs, total] = await Promise.all([
        contentService.find(trashFilter, {
          user, locale, sort, skip, limit: pagination.pageSize, select, populate, siteId, includeDeleted: true
        } as any),
        adapter.count(config.slug, trashFilter),
      ])

      const configRegistry = (req as any).zenith?.config
      const effectiveDepth = depth !== undefined ? depth : (populate.length > 0 ? 5 : 0)
      if (effectiveDepth > 0 || populate.length > 0) {
        await resolveRelations(docs, config.fields, populate, effectiveDepth, adapter, 0, configRegistry)
      }

      let sanitizedDocs = docs.map((d) => sanitizeFields(d, user, 'read'))
      if (select) sanitizedDocs = applySelectToDocs(sanitizedDocs, select)

      res.json(createResponse(sanitizedDocs, { pagination: { ...pagination, total, totalPages: Math.ceil(total / pagination.pageSize) } }))
    } catch (err) {
      next(err)
    }
  })

  router.post('/:id/restore', async (req, res, next) => {
    try {
      if (!config.softDelete) throw new NotFoundError('Trash not enabled for this collection', req.params.id)
      const { contentService } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'update')

      const { doc } = await contentService.update(req.params.id, { deletedAt: null }, { user, siteId, includeDeleted: true })
      CacheService.invalidateTag(config.slug)
      res.json(createResponse(sanitizeFields(doc, user, 'read')))
    } catch (err) {
      next(err)
    }
  })

  router.delete('/:id/hard', async (req, res, next) => {
    try {
      const { contentService } = getContext()
      const user = (req as any).user
      const siteId = req.headers['x-zenith-site-id'] as string
      await verifyAccess(user, 'delete')

      await contentService.delete(req.params.id, { user, siteId, includeDeleted: true })
      CacheService.invalidateTag(config.slug)

      // Cascade delete: clean up relation references in other collections
      const allCollections = (req as any).zenith?.config?.collections || []
      await handleCascadeDeletes(adapter, config.slug, req.params.id, allCollections)

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
        throw new InvalidPayloadError('Import payload must be an array of records.')
      }

      const MAX_IMPORT = 5000
      if (records.length > MAX_IMPORT) {
        throw new InvalidPayloadError(`Import is capped at ${MAX_IMPORT} records per request. Split your data into smaller batches.`)
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
        throw new InvalidPayloadError('pipeline must be an array')
      }
      const results = await adapter.aggregate(config.slug, pipeline, { siteId: (req as any).siteId })
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
