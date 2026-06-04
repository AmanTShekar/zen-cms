import { Express } from 'express'
import { CMSConfig, FieldConfig as CMSField } from '@zenithcms/types'
import { logger } from '../services/logger'
import { AuthService } from '../services/auth'
import { ContentService } from '../services/content'
import { CacheService } from '../services/cache'
import { eventHub } from '../services/event-hub'

/**
 * Zenith GraphQL — Neural Schema Orchestrator
 * ──────────────────────────────────────────
 * Dynamically synthesizes recursive GraphQL types from Zenith collection definitions.
 * Supports deep nested blocks, arrays, relational entanglement, and CRUD mutations.
 */

// Zero-dependency, high-performance DataLoader implementation for relational batching
class SimpleDataLoader<K, V> {
  private batchFn: (keys: K[]) => Promise<V[]>
  private queue: { key: K; resolve: (value: V) => void; reject: (err: any) => void }[] = []
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
      const relConfig = field as any
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
    const { buildSchema } = await import('graphql')

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

    const resolvers: Record<string, (...args: any[]) => any> = {}
    const processedTypes = new Set<string>()

    const buildRecursiveTypes = (fields: CMSField[], parentName: string) => {
      fields.forEach((field) => {
        const typeName = `${parentName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`

        if (field.type === 'group' && !processedTypes.has(typeName)) {
          processedTypes.add(typeName)
          const subFields = (field as any).fields
            ?.map((f: any) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName, config)}`)
            .join('\n')
          schemaSdl += `\ntype ${typeName} {\n${subFields}\n}\n`
          buildRecursiveTypes((field as any).fields || [], typeName)
        }

        if (field.type === 'array' && !processedTypes.has(typeName)) {
          processedTypes.add(typeName)
          const subFields = (field as any).fields
            ?.map((f: any) => `  ${f.name}: ${fieldTypeToGraphQL(f, typeName, config)}`)
            .join('\n')
          schemaSdl += `\ntype ${typeName} {\n${subFields}\n}\n`
          buildRecursiveTypes((field as any).fields || [], typeName)
        }

        if (field.type === 'blocks' && !processedTypes.has(`${typeName}_Block`)) {
          processedTypes.add(`${typeName}_Block`)
          const unionTypes: string[] = []

          ;(field as any).blocks?.forEach((block: any) => {
            const blockTypeName = `${typeName}_${block.slug.charAt(0).toUpperCase() + block.slug.slice(1)}`
            unionTypes.push(blockTypeName)
            const blockFields = block.fields
              ?.map((f: any) => `  ${f.name}: ${fieldTypeToGraphQL(f, blockTypeName, config)}`)
              .join('\n')
            schemaSdl += `\ntype ${blockTypeName} {\n  blockType: String\n${blockFields}\n}\n`
            buildRecursiveTypes(block.fields || [], blockTypeName)
          })

          if (unionTypes.length > 0) {
            schemaSdl += `\nunion ${typeName}_Block = ${unionTypes.join(' | ')}\n`
          } else {
            schemaSdl += `\ntype ${typeName}_Block {\n  blockType: String\n}\n`
          }
        }
      })
    }

    const parseResolverParams = (first: any, second: any, third: any) => {
      let args: any = {}
      let context: any = {}

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
    const decorators: Record<string, (doc: any, context: any) => any> = {}

    const createDocumentDecorator = (fields: CMSField[], collectionsConfig: any[], parentTypeName: string) => {
      const relationFields = fields.filter((f) => f.type === 'relation')
      const blockFields = fields.filter((f) => f.type === 'blocks')
      const groupFields = fields.filter((f) => f.type === 'group')
      const arrayFields = fields.filter((f) => f.type === 'array')

      return (doc: any, context: any): any => {
        if (!doc) return null
        const decorated = { ...doc }
        decorated.id = doc._id?.toString() || doc.id

        // Attach relation resolvers
        relationFields.forEach((field) => {
          const relConfig = field as any
          const rawValue = doc[field.name]

          decorated[field.name] = async (args: any, ctx: any) => {
            const graphqlCtx = ctx || context
            if (!graphqlCtx.getLoader) return null

            if (rawValue === undefined || rawValue === null) {
              return relConfig.hasMany ? [] : null
            }

            const targetSlug = relConfig.relationTo
            const loader = graphqlCtx.getLoader(targetSlug)

            const relatedCol = collectionsConfig.find((c) => c.slug === targetSlug)
            const childDecorator = relatedCol ? decorators[targetSlug] : (d: any) => d

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
            decorated[field.name] = rawValue.map((item: any) => {
              if (!item || typeof item !== 'object') return item
              const blockSlug = item.blockType
              const blockConfig = (field as any).blocks?.find((b: any) => b.slug === blockSlug)
              const blockTypeName = `${typeName}_${blockSlug.charAt(0).toUpperCase() + blockSlug.slice(1)}`

              const blockDecorator = blockConfig ? createDocumentDecorator(blockConfig.fields || [], collectionsConfig, blockTypeName) : (d: any) => d

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
            const groupDecorator = createDocumentDecorator((field as any).fields || [], collectionsConfig, typeName)
            decorated[field.name] = groupDecorator(rawValue, context)
          }
        })

        // Recursively handle nested arrays
        arrayFields.forEach((field) => {
          const typeName = `${parentTypeName}_${field.name.charAt(0).toUpperCase() + field.name.slice(1)}`
          const rawValue = doc[field.name]
          if (Array.isArray(rawValue)) {
            const arrDecorator = createDocumentDecorator((field as any).fields || [], collectionsConfig, typeName)
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
      resolvers[`get${typeName}`] = async (first: any, second: any, third: any) => {
        const { args, context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        const { id } = args
        const adapter = context.adapter
        
        const contentService = new ContentService(col, adapter)
        const doc = await contentService.findById(id, { user: context.user, siteId: context.siteId })
        return doc ? decorators[slug](doc, context) : null
      }

      resolvers[`list${typeName}`] = async (first: any, second: any, third: any) => {
        const { args, context } = parseResolverParams(first, second, third)
        if (!context.user) throw new Error('Unauthorized')
        const { page = 1, pageSize = 25, status } = args || {}
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
          } as any),
          adapter.count(slug, context.siteId ? { ...filter, siteId: context.siteId } : filter),
        ])
        return {
          data: docs.map((d: any) => decorators[slug](d, context)),
          pageInfo: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        }
      }

      // ── Mutations ──────────────────────────────────────────────────────────
      resolvers[`create${typeName}`] = async (first: any, second: any, third: any) => {
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

      resolvers[`update${typeName}`] = async (first: any, second: any, third: any) => {
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

      resolvers[`delete${typeName}`] = async (first: any, second: any, third: any) => {
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

      resolvers[`get${typeName}`] = async (first: any, second: any, third: any) => {
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
        return `  get${n}(id: ID!): ${n}\n  list${n}(page: Int, pageSize: Int, status: String): ${n}List`
      }),
      ...(config.globals || []).map(
        (g) => `  get${g.name.replace(/[^a-zA-Z0-9]/g, '')}: ${g.name.replace(/[^a-zA-Z0-9]/g, '')}`
      ),
    ].join('\n')

    schemaSdl += `\ntype Query {\n${queryFields}\n}\n`

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
      (req: any, res: any, next: any) => {
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
        context: (req: any) => {
          // ── Authentication ────────────────────────────────────────────────
          // Check Bearer token OR httpOnly cookie
          const authHeader = req.raw.headers['authorization'] || ''
          const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.raw.cookies?.accessToken
          const user = token ? AuthService.verifyToken(token) : null

          // Adapter is injected by the engine on setup — falls back gracefully
          const adapter = (req.raw as any).__zenithAdapter || AdapterFactory.getActiveAdapter()
          const siteId = req.raw.headers['x-zenith-site-id'] || req.raw.headers['X-Zenith-Site-Id']

          // Isolated DataLoaders mapping per request scope
          const loaders = new Map<string, SimpleDataLoader<string, any>>()
          const getLoader = (slug: string) => {
            if (!loaders.has(slug)) {
              loaders.set(
                slug,
                new SimpleDataLoader(async (keys: string[]) => {
                  // Adapter-safe per-ID fetching (avoids MongoDB $in for Postgres parity)
                  const fetched = await Promise.all(
                    keys.map((id) =>
                      adapter.findOne(slug, { id }).catch(() =>
                        adapter.findOne(slug, { _id: id }).catch(() => null)
                      )
                    )
                  )
                  const docs = fetched.filter(Boolean)
                  const docMap = new Map(docs.map((d: any) => [d._id?.toString() || d.id, d]))
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
