import { Express } from 'express'
import { CMSConfig, FieldConfig as CMSField } from '@zenith-open/zenithcms-types'
import { logger } from '../services/logger'
import { AuthService } from '../services/auth'
import { ContentService } from '../services/content'
import { CacheService } from '../services/cache'
import { eventHub } from '../services/event-hub'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { resolveRelations } from './handlers/RelationResolver'
import { verifySiteAccess } from '../middleware/auth'

/**
 * Zenith GraphQL — Neural Schema Orchestrator
 * ──────────────────────────────────────────
 * Dynamically synthesizes recursive GraphQL types from Zenith collection definitions.
 * Supports deep nested blocks, arrays, relational entanglement, and CRUD mutations.
 */

// Zero-dependency, high-performance DataLoader implementation for relational batching
class SimpleDataLoader<K, V> {
  private batchFn: (keys: K[]) => Promise<V[]>
  private queue: { key: K; resolve: (value: V) => void; reject: (err: unknown) => void }[] = []
  private cache = new Map<K, Promise<V>>()
  private scheduled = false

  constructor(batchFn: (keys: K[]) => Promise<V[]>) {
    this.batchFn = batchFn
  }

  load(key: K): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!
    }

    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject })
      this.scheduleBatch()
    })

    this.cache.set(key, promise)
    return promise
  }

  private scheduleBatch() {
    if (this.scheduled) return
    this.scheduled = true

    process.nextTick(async () => {
      this.scheduled = false
      const currentQueue = [...this.queue]
      this.queue = []

      const keys = currentQueue.map((q) => q.key)
      try {
        const results = await this.batchFn(keys)
        currentQueue.forEach((q, index) => {
          q.resolve(results[index])
        })
      } catch (err) {
        currentQueue.forEach((q) => q.reject(err))
      }
    })
  }
}

// Map Zenith field types → GraphQL types
function fieldTypeToGraphQL(field: CMSField, parentName: string, config?: CMSConfig): string {
  const typeName = `${parentName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`

  switch (field.type) {
    case 'number':
      return 'Float'
    case 'checkbox':
    case 'boolean':
      return 'Boolean'
    case 'date':
      return 'String'
    case 'json':
      return 'JSON'
    case 'media':
      return 'MediaObject'
    case 'relation': {
      const relConfig = field as Record<string, unknown>
      const targetCol = config?.collections.find((c) => c.slug === relConfig.relationTo)
      if (targetCol) {
        const relatedName = targetCol.name.replace(/[^a-zA-Z0-9]/g, '')
        return relConfig.hasMany ? `[${relatedName}]` : relatedName
      }
      return 'ID'
    }
    case 'group':
      return typeName
    case 'array':
      return `[${typeName}]`
    case 'blocks':
      return `[${typeName}_Block]`
    default:
      return 'String'
  }
}

export async function setupGraphQL(app: Express, config: CMSConfig) {
  try {
    const { createHandler } = await import('graphql-http/lib/use/express')
    const { buildSchema, GraphQLError } = await import('graphql')
    const { createComplexityRule, simpleEstimator } = await import('graphql-query-complexity')

    let schemaSdl = `
      scalar JSON

      type MediaObject {
        url: String
        alt: String
        width: Float
        height: Float
      }

      type PageInfo {
        page: Int
        pageSize: Int
        total: Int
        totalPages: Int
      }
    `

    const resolvers: Record<string, (...args: Record<string, unknown>[]) => unknown> = {}
    const processedTypes = new Set<string>()

    const buildRecursiveTypes = (fields: CMSField[], parentName: string) => {
      fields.forEach((field) => {
        const typeName = `${parentName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`

        if (field.type === 'group' && !processedTypes.has(typeName)) {
          processedTypes.add(typeName)
          const subFields = (field as Record<string, unknown>).fields
            ?.map((f: Record<string, unknown>) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName, config)}`)
            .join('\n')
          schemaSdl += `\ntype ${typeName} {\n${subFields}\n}\n`
          buildRecursiveTypes((field as Record<string, unknown>).fields || [], typeName)
        }

        if (field.type === 'array' && !processedTypes.has(typeName)) {
          processedTypes.add(typeName)
          const subFields = (field as Record<string, unknown>).fields
            ?.map((f: Record<string, unknown>) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName, config)}`)
            .join('\n')
          schemaSdl += `\ntype ${typeName} {\n${subFields}\n}\n`
          buildRecursiveTypes((field as Record<string, unknown>).fields || [], typeName)
        }

        if (field.type === 'blocks' && !processedTypes.has(`${typeName}_Block`)) {
          processedTypes.add(`${typeName}_Block`)
          const unionTypes: string[] = []

          ;(field as Record<string, unknown>).blocks?.forEach((blockOrSlug: Record<string, unknown>) => {
            const isString = typeof blockOrSlug === 'string'
            const slug = isString ? blockOrSlug : blockOrSlug.slug
            const blockDef = isString ? config.collections.find((c) => c.slug === slug) : blockOrSlug
            if (!blockDef) return

            const blockTypeName = `${typeName}_${slug.charAt(0).toUpperCase() + slug.slice(1)}`
            unionTypes.push(blockTypeName)
            const blockFields = blockDef.fields
              ?.map((f: Record<string, unknown>) => `  ${f.name}: ${fieldTypeToGraphQL(f, blockTypeName, config)}`)
              .join('\n')
            schemaSdl += `\ntype ${blockTypeName} {\n  blockType: String\n${blockFields}\n}\n`
            buildRecursiveTypes(blockDef.fields || [], blockTypeName)
          })

          if (unionTypes.length > 0) {
            schemaSdl += `\nunion ${typeName}_Block = ${unionTypes.join(' | ')}\n`
          } else {
            schemaSdl += `\ntype ${typeName}_Block {\n  blockType: String\n}\n`
          }
        }
      })
    }

    const parseResolverParams = (first: Record<string, unknown>, second: Record<string, unknown>, third: Record<string, unknown>) => {
      let args: Record<string, unknown> = {}
      let context: Record<string, unknown> = {}

      if (
        first &&
        typeof first === 'object' &&
        ('id' in first || 'page' in first || 'status' in first || 'data' in first)
      ) {
        args = first
        context = second || {}
      } else {
        args = second || {}
        context = third || {}
      }
      return { args, context }
    }

    // ── Recursive Document Decorator ─────────────────────────────────────────
    const decorators: Record<string, (doc: Record<string, unknown>, context: Record<string, unknown>) => unknown> = {}

    const createDocumentDecorator = (fields: CMSField[], collectionsConfig: Record<string, unknown>[], parentTypeName: string) => {
      const relationFields = fields.filter((f) => f.type === 'relation')
      const blockFields = fields.filter((f) => f.type === 'blocks')
      const groupFields = fields.filter((f) => f.type === 'group')
      const arrayFields = fields.filter((f) => f.type === 'array')

      return (doc: Record<string, unknown>, context: Record<string, unknown>): unknown => {
        if (!doc) return null
        const decorated = { ...doc }
        decorated.id = doc._id?.toString() || doc.id

        // Attach relation resolvers
        relationFields.forEach((field) => {
          const relConfig = field as Record<string, unknown>
          const rawValue = doc[field.name]

          decorated[field.name] = async (args: Record<string, unknown>, ctx: Record<string, unknown>) => {
            const graphqlCtx = ctx || context
            if (!graphqlCtx.getLoader) return null

            if (rawValue === undefined || rawValue === null) {
              return relConfig.hasMany ? [] : null
            }

            const targetSlug = relConfig.relationTo
            const loader = graphqlCtx.getLoader(targetSlug)

            const relatedCol = collectionsConfig.find((c) => c.slug === targetSlug)
            const childDecorator = relatedCol ? decorators[targetSlug] : (d: Record<string, unknown>) => d

            if (Array.isArray(rawValue)) {
              const promises = rawValue.map((id) => loader.load(id.toString()))
              const results = await Promise.all(promises)
              return results.map((d) => d ? childDecorator(d, graphqlCtx) : null)
            } else {
              const d = await loader.load(rawValue.toString())
              return d ? childDecorator(d, graphqlCtx) : null
            }
          }
        })

        // Intercept blocks to set __typename for union matching and decorate children recursively
        blockFields.forEach((field) => {
          const typeName = `${parentTypeName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`
          const rawValue = doc[field.name]
          if (Array.isArray(rawValue)) {
            decorated[field.name] = rawValue.map((item: Record<string, unknown>) => {
              if (!item || typeof item !== 'object') return item
              const blockSlug = item.blockType
              let blockConfig = (field as Record<string, unknown>).blocks?.find((b: Record<string, unknown>) => typeof b === 'string' ? b === blockSlug : b.slug === blockSlug)
              if (typeof blockConfig === 'string') {
                blockConfig = collectionsConfig.find(c => c.slug === blockConfig)
              }
              const blockTypeName = `${typeName}_${blockSlug.charAt(0).toUpperCase() + blockSlug.slice(1)}`

              const blockDecorator = blockConfig ? createDocumentDecorator(blockConfig.fields || [], collectionsConfig, blockTypeName) : (d: Record<string, unknown>) => d

              const decoratedItem = blockDecorator(item, context)
              decoratedItem.__typename = blockTypeName
              return decoratedItem
            })
          }
        })

        // Recursively handle nested groups
        groupFields.forEach((field) => {
          const typeName = `${parentTypeName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`
          const rawValue = doc[field.name]
          if (rawValue && typeof rawValue === 'object') {
            const groupDecorator = createDocumentDecorator((field as Record<string, unknown>).fields || [], collectionsConfig, typeName)
            decorated[field.name] = groupDecorator(rawValue, context)
          }
        })

        // Recursively handle nested arrays
        arrayFields.forEach((field) => {
          const typeName = `${parentTypeName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`
          const rawValue = doc[field.name]
          if (Array.isArray(rawValue)) {
            const arrDecorator = createDocumentDecorator((field as Record<string, unknown>).fields || [], collectionsConfig, typeName)
            decorated[field.name] = rawValue.map((item) => arrDecorator(item, context))
          }
        })

        return decorated
      }
    }

    // Initialize decorators for all collections
    config.collections.forEach((col) => {
      const typeName = col.name.replace(/[^a-zA-Z0-9]/g, '')
      decorators[col.slug] = createDocumentDecorator(col.fields, config.collections, typeName)
    })

    // Initialize decorators for all globals
    ;(config.globals || []).forEach((global) => {
      const typeName = global.name.replace(/[^a-zA-Z0-9]/g, '')
      decorators[global.slug] = createDocumentDecorator(global.fields, config.collections, typeName)
    })

    // ── Build Query & Mutation Types ──────────────────────────────────────────
    config.collections.forEach((col) => {
      const typeName = col.name.replace(/[^a-zA-Z0-9]/g, '')
      const slug = col.slug

      buildRecursiveTypes(col.fields, typeName)

      const typeFields = col.fields
        .map((f) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName, config)}`)
        .join('\n')

      schemaSdl += `
        type ${typeName} {
          id: ID!
${typeFields}
          createdAt: String
          updatedAt: String
          ${col.drafts ? '_status: String' : ''}
        }

        type ${typeName}List {
          data: [${typeName}]
          pageInfo: PageInfo
        }
      `

      // ── Resolvers ──────────────────────────────────────────────────────────
      resolvers[`get${typeName}`] = async (first: Record<string, unknown>, second: Record<string, unknown>, third: Record<string, unknown>) => {
        const { args, context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        const { id, populate, depth } = args
        const adapter = context.adapter

        const contentService = new ContentService(col, adapter)
        const doc = await contentService.findById(id, { user: context.user, siteId: context.siteId })
        if (!doc) return null

        // Resolve relations via populate/depth (mirrors REST ?populate=&depth=)
        const popArr = populate
          ? Array.isArray(populate) ? populate : [populate]
          : []
        const effectiveDepth = depth !== undefined ? depth : (popArr.length > 0 ? 5 : 0)
        if (effectiveDepth > 0 || popArr.length > 0) {
          await resolveRelations([doc], col.fields, popArr, effectiveDepth, adapter, 0, config, context.siteId)
        }

        return decorators[slug](doc, context)
      }

      resolvers[`list${typeName}`] = async (first: Record<string, unknown>, second: Record<string, unknown>, third: Record<string, unknown>) => {
        const { args, context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        const { page = 1, pageSize = 25, status, populate, depth } = args || {}
        const adapter = context.adapter
        const filter: Record<string, unknown> = {}
        if (col.drafts && status) filter._status = status

        const skip = (page - 1) * Math.min(pageSize, 100)
        const contentService = new ContentService(col, adapter)

        const [docs, total] = await Promise.all([
          contentService.find(filter, {
            user: context.user,
            siteId: context.siteId,
            skip,
            limit: Math.min(pageSize, 100)
          } as Record<string, unknown>),
          adapter.count(slug, context.siteId ? { ...filter, siteId: context.siteId } : filter),
        ])

        // Resolve relations via populate/depth (mirrors REST ?populate=&depth=)
        const popArr = populate
          ? Array.isArray(populate) ? populate : [populate]
          : []
        const effectiveDepth = depth !== undefined ? depth : (popArr.length > 0 ? 5 : 0)
        if (effectiveDepth > 0 || popArr.length > 0) {
          await resolveRelations(docs, col.fields, popArr, effectiveDepth, adapter, 0, config, context.siteId)
        }

        return {
          data: docs.map((d: Record<string, unknown>) => decorators[slug](d, context)),
          pageInfo: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        }
      }

      // ── Mutations ──────────────────────────────────────────────────────────
      resolvers[`create${typeName}`] = async (first: Record<string, unknown>, second: Record<string, unknown>, third: Record<string, unknown>) => {
        const { args, context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        if (context.user.role === 'viewer') throw new Error('Forbidden: Read-only access')
        const adapter = context.adapter
        const { data } = args

        const contentService = new ContentService(col, adapter)
        const doc = await contentService.create(data, { user: context.user, siteId: context.siteId })

        CacheService.invalidateTag(slug)

        return decorators[slug](doc, context)
      }

      resolvers[`update${typeName}`] = async (first: Record<string, unknown>, second: Record<string, unknown>, third: Record<string, unknown>) => {
        const { args, context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        if (context.user.role === 'viewer') throw new Error('Forbidden: Read-only access')
        const adapter = context.adapter
        const { id, data } = args

        const contentService = new ContentService(col, adapter)
        const { doc, delta } = await contentService.update(id, data, { user: context.user, siteId: context.siteId })

        CacheService.invalidateTag(slug)

        return decorators[slug](doc, context)
      }

      resolvers[`delete${typeName}`] = async (first: Record<string, unknown>, second: Record<string, unknown>, third: Record<string, unknown>) => {
        const { args, context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        if (context.user.role !== 'admin') throw new Error('Forbidden: Only administrators can delete documents')
        const adapter = context.adapter
        const { id } = args

        const contentService = new ContentService(col, adapter)
        await contentService.delete(id, { user: context.user, siteId: context.siteId })

        CacheService.invalidateTag(slug)
        return true
      }
    })

    ;(config.globals || []).forEach((global) => {
      const typeName = global.name.replace(/[^a-zA-Z0-9]/g, '')
      buildRecursiveTypes(global.fields, typeName)
      const typeFields = global.fields
        .map((f) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName, config)}`)
        .join('\n')

      schemaSdl += `\ntype ${typeName} {\n  id: ID!\n${typeFields}\n  updatedAt: String\n}\n`

      resolvers[`get${typeName}`] = async (first: Record<string, unknown>, second: Record<string, unknown>, third: Record<string, unknown>) => {
        const { context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        const adapter = context.adapter
        const filter: Record<string, unknown> = {}
        if (context.siteId) filter.siteId = context.siteId
        const doc = await adapter.findOne(global.slug, filter)
        return doc ? decorators[global.slug](doc, context) : null
      }
    })

    const queryFields = [
      ...config.collections.map((c) => {
        const n = c.name.replace(/[^a-zA-Z0-9]/g, '')
        return `  get${n}(id: ID!, populate: [String], depth: Int): ${n}\n  list${n}(page: Int, pageSize: Int, status: String, populate: [String], depth: Int): ${n}List`
      }),
      ...(config.globals || []).map(
        (g) => `  get${g.name.replace(/[^a-zA-Z0-9]/g, '')}(populate: [String], depth: Int): ${g.name.replace(/[^a-zA-Z0-9]/g, '')}`
      ),
    ].join('\n')

    if (!queryFields) {
      resolvers['_dummy'] = () => 'Zenith'
    }

    schemaSdl += `\ntype Query {\n${queryFields || '  _dummy: String'}\n}\n`

    let mutationFields = ''
    config.collections.forEach((col) => {
      const typeName = col.name.replace(/[^a-zA-Z0-9]/g, '')
      mutationFields += `  create${typeName}(data: JSON!): ${typeName}\n`
      mutationFields += `  update${typeName}(id: ID!, data: JSON!): ${typeName}\n`
      mutationFields += `  delete${typeName}(id: ID!): Boolean\n`
    })

    if (mutationFields) {
      schemaSdl += `\ntype Mutation {\n${mutationFields}\n}\n`
    }

    app.use(
      '/graphql',
      (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
        const query = req.body?.query || req.query?.query || ''
        if (query) {
          let currentDepth = 0
          let maxSeen = 0
          for (const char of query) {
            if (char === '{') {
              currentDepth++
              if (currentDepth > maxSeen) maxSeen = currentDepth
            } else if (char === '}') {
              currentDepth--
            }
          }
          if (maxSeen > 6) {
            return res.status(400).json({
              errors: [{ message: 'GraphQL query depth exceeds maximum allowed limit (5 levels).' }]
            })
          }
        }
        next()
      },
      createHandler({
        schema: buildSchema(schemaSdl),
        rootValue: resolvers,
        validationRules: [
          createComplexityRule({
            estimators: [simpleEstimator({ defaultComplexity: 1 })],
            maximumComplexity: 1000,
            createError: (max: number, actual: number) => new GraphQLError(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`),
          }),
        ],
        context: async (req: import('express').Request) => {
          // ── Authentication ────────────────────────────────────────────────
          // Check Bearer token OR httpOnly cookie
          const authHeader = req.raw.headers['authorization'] || ''
          const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.raw.cookies?.accessToken
          const user = token ? AuthService.verifyToken(token) : null

          // Adapter is injected by the engine on setup — falls back gracefully
          const adapter = (req.raw as Record<string, unknown>).__zenithAdapter || AdapterFactory.getActiveAdapter()
          const siteId = req.raw.headers['x-zenith-site-id'] || req.raw.headers['X-Zenith-Site-Id']

          // ── Secure Tenant Resolution (IDOR Protection) ──
          if (siteId && user) {
            const hasAccess = await verifySiteAccess(user as Record<string, unknown>, siteId)
            if (!hasAccess) {
              throw new Error('Forbidden: Access denied to this site')
            }
          }

          // Isolated DataLoaders mapping per request scope
          const loaders = new Map<string, SimpleDataLoader<string, Record<string, unknown>>>()
          const getLoader = (slug: string) => {
            if (!loaders.has(slug)) {
              loaders.set(
                slug,
                new SimpleDataLoader(async (keys: string[]) => {
                  // Adapter-safe per-ID fetching (avoids MongoDB $in for Postgres parity)
                  const fetched = await Promise.all(
                    keys.map((id) => {
                      const query1 = siteId ? { id, siteId } : { id }
                      const query2 = siteId ? { _id: id, siteId } : { _id: id }
                      return adapter.findOne(slug, query1).catch(() =>
                        adapter.findOne(slug, query2).catch(() => null)
                      )
                    })
                  )
                  const docs = fetched.filter(Boolean)
                  const docMap = new Map(docs.map((d: Record<string, unknown>) => [d._id?.toString() || d.id, d]))
                  return keys.map((k) => docMap.get(k) || null)
                })
              )
            }
            return loaders.get(slug)!
          }

          return {
            user,
            adapter,
            siteId,
            getLoader,
          }
        },
      })
    )
    logger.info('Zenith_GraphQL_Ready')
  } catch (err) {
    logger.warn({ err }, 'GraphQL_Setup_Failed')
  }
}
