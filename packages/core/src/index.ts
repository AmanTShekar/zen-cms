import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import mongoSanitize from 'express-mongo-sanitize'
import path from 'path'
import fs from 'fs/promises'

import { CMSConfig } from '@zenithcms/types'
import { applyPlugins, createPluginContext, ZenithPlugin } from './plugins'
import { logger } from './services/logger'
import { SchedulerService } from './services/scheduler'
import { seedInitialData } from './database/seed'
import { seedDummyData } from './database/seed-dummy'
import { ContentService } from './services/content'
import { FlowEngine } from './services/flow-engine'
import { WebhookService } from './services/webhook'
import { PresenceService } from './services/presence'
import { sessionStore } from './services/session-store'
import { eventHub } from './services/event-hub'

// ── Register Mongoose Schemas (Required for MongoDB Mode) ────────────────────
import './database/user-model'
import './database/api-key-model'
import './database/audit-model'
import './database/dashboard-layout-model'
import './database/flow-model'
import './database/member-model'
import './database/onboarding-state-model'
import './database/password-reset-model'
import './database/preference-model'
import './database/settings-model'
import './database/site-model'
import './database/workspace-model'
import './database/version-model'
import './database/webhook-model'
import './database/webhook-config-model'
import './database/plugin-model'
import './database/release-model'
import './database/role-model'
import './database/template-model'
import './database/comment-model'
import './database/lock-model'

// ── Middleware ───────────────────────────────────────────────────────────────
import { rateLimitMiddleware } from './middleware/rate-limit'
import { apiKeyMiddleware } from './middleware/api-key'
import { globalErrorHandler } from './middleware/error-handler'
import { csrfProtection } from './middleware/csrf'
import { maintenanceMiddleware } from './middleware/maintenance'
import { metricsMiddleware, getPrometheusMetrics } from './middleware/metrics'
import { tracerMiddleware } from './middleware/tracer'
import { siteVaryMiddleware } from './middleware/siteVary'
import { requestTimeout } from './middleware/timeout'

// ── Routers ──────────────────────────────────────────────────────────────────
import { createCollectionRouter } from './api/factory'
import { auditMiddleware } from './middleware/audit'
import systemRouter from './api/system'
import introspectRouter from './api/introspect'
import authRouter from './api/auth'
import uploadRouter from './api/upload'
import _mediaRouter from './api/media'
import importExportRouter from './api/import-export'
import backupRouter from './api/backup'
import preferencesRouter from './api/preferences'
import versionsRouter from './api/versions'
import locksRouter from './api/locks'
import commentsRouter from './api/comments'
import presenceRouter from './api/presence'
import { DeploymentService } from './services/deployment'
import contentToolsRouter from './api/content-tools'
import membersRouter from './api/members'
import flowsRouter from './api/flows'
import dashboardRouter from './api/dashboard'
import sitesRouter from './api/sites'
import workspacesRouter from './api/workspaces'
import promotionRouter from './api/promotion'
import releasesRouter from './api/releases'
import rolesRouter, { seedSystemRoles } from './api/roles'
import templatesRouter from './api/templates'
import webhooksRouter from './api/webhooks'
import pluginsRouter from './api/plugins'
import schemasRouter from './api/schemas'
import componentsRouter from './api/components'
import campaignsRouter from './api/campaigns'
import blocksRouter from './api/blocks'
import redirectsRouter from './api/redirects'
import duplicateRouter from './api/duplicate'
import bulkRouter from './api/bulk'
import trashRouter from './api/trash'
import eventsRouter from './api/events'

// ── Redirect Handler Middleware ───────────────────────────────────────────────
import { redirectHandler } from './middleware/redirect-handler'

// ── GraphQL / Swagger (optional) ─────────────────────────────────────────────
import { setupSwagger } from './api/swagger'
import { setupGraphQL } from './api/graphql'

import { DatabaseAdapter } from './database/adapters/BaseAdapter'
import { TypeSynthesizer } from './services/type-synthesizer'
import { AdapterFactory } from './database/adapters/AdapterFactory'
import { AotBridge } from './database/adapters/AotBridge'

export interface ZenithOptions {
  config: CMSConfig
  plugins?: ZenithPlugin[]
  adapter?: DatabaseAdapter
  port?: number
  cors?: {
    origins?: string[]
    credentials?: boolean
  }
}

/**
 * ZENITH CENTRAL PROCESSING NUCLEUS
 * ────────────────────────────────
 * The engine room of the Zenith CMS ecosystem. This class orchestrates the
 * complete lifecycle of the platform—from cryptographic middleware initialization
 * and dynamic route factory generation to plugin handshake management.
 *
 * CORE RESPONSIBILITIES:
 * 1. REVERSE ROUTE FACTORY: Generates REST/GraphQL nodes from static schemas.
 * 2. ADAPTER ABSTRACTION: Decouples business logic from persistence (Mongo/SQL).
 * 3. PLUGIN HARVESTING: Injects third-party logic into the kernel pipeline.
 */
export class ZenithEngine {
  public app: Express
  public adapter: DatabaseAdapter
  private config: CMSConfig
  public plugins: ZenithPlugin[]
  private port?: number
  private corsOptions?: ZenithOptions['cors']
  private servicesMap = new Map<string, ContentService>()
  private apiRouter: express.Router = express.Router()

  /**
   * ZERO-OVERHEAD LOCAL API BYPASS
   * Exposes raw database CRUD logic fully integrated with hooks, security validation,
   * audit logs, and localization processing. Eliminates serialization & network CPU/latency overhead.
   */
  public get local() {
    return {
      find: async (collectionSlug: string, query: any = {}, options: Partial<import('./services/content').ContentOperationOptions> = {}) => {
        const service = this.servicesMap.get(collectionSlug)
        if (!service)
          throw new Error(`Collection or Global "${collectionSlug}" not registered in Local API`)
        return await service.find(query, options as any)
      },
      findOne: async (collectionSlug: string, query: any = {}, options: Partial<import('./services/content').ContentOperationOptions> = {}) => {
        const service = this.servicesMap.get(collectionSlug)
        if (!service)
          throw new Error(`Collection or Global "${collectionSlug}" not registered in Local API`)
        const result = await service.find(query, { ...options, limit: 1 } as any)
        return result.length > 0 ? result[0] : null
      },
      findById: async (collectionSlug: string, id: string, options: Partial<import('./services/content').ContentOperationOptions> = {}) => {
        const service = this.servicesMap.get(collectionSlug)
        if (!service)
          throw new Error(`Collection or Global "${collectionSlug}" not registered in Local API`)
        return await service.findById(id, options as any)
      },
      create: async (collectionSlug: string, data: any, options: Partial<import('./services/content').ContentOperationOptions> = {}) => {
        const service = this.servicesMap.get(collectionSlug)
        if (!service)
          throw new Error(`Collection or Global "${collectionSlug}" not registered in Local API`)
        return await service.create(data, options as any)
      },
      update: async (collectionSlug: string, id: string, data: any, options: Partial<import('./services/content').ContentOperationOptions> = {}) => {
        const service = this.servicesMap.get(collectionSlug)
        if (!service)
          throw new Error(`Collection or Global "${collectionSlug}" not registered in Local API`)
        return await service.update(id, data, options as any)
      },
      delete: async (collectionSlug: string, id: string, options: Partial<import('./services/content').ContentOperationOptions> = {}) => {
        const service = this.servicesMap.get(collectionSlug)
        if (!service)
          throw new Error(`Collection or Global "${collectionSlug}" not registered in Local API`)
        return await service.delete(id, options as any)
      },
    }
  }

  /**
   * INITIALIZATION SEQUENCE
   * Phase 1: Configuration Harvesting & Plugin Merging
   * Phase 2: Middleware Hardening (Helmet, Rate Limiting, Audit)
   * Phase 3: Neural Bridge & Route Generation
   */
  constructor(options: ZenithOptions) {
    // ── Production Environment Validation ──────────────────────────────────────
    this._validateEnvironment()

    const pluginResult = applyPlugins(options.config, options.plugins || [])
    this.config = pluginResult.config
    if (pluginResult.errors.length > 0) {
      pluginResult.errors.forEach((e: string) => logger.error({ err: e }, 'Plugin error during bootstrap'))
    }
    this.plugins = options.plugins || []
    this.port = options.port
    this.corsOptions = options.cors

    // Resolve database adapter dynamically via AdapterFactory (supporting SQLite, PG, Mongo)
    this.adapter = options.adapter || AdapterFactory.create()
    AdapterFactory.setActiveAdapter(this.adapter)

    this.app = express()
    this.app.set('zenith_engine', this)

    // Enable trust proxy for secure rate-limiting and cookie transport behind reverse proxies
    const trustProxy = process.env.TRUST_PROXY
    if (trustProxy) {
      this.app.set('trust proxy', trustProxy === 'true' ? true : trustProxy === 'false' ? false : Number(trustProxy) || trustProxy)
    } else {
      this.app.set('trust proxy', true) // Default secure trust for standard cloud load balancers
    }

    this._initMiddleware()
    this._initRoutes()
    this._initAuditTrail()
  }

  /**
   * Validates critical environment variables at startup.
   * In production, missing secrets cause a hard failure.
   * In development, missing values log a warning but allow boot.
   */
  private _validateEnvironment() {
    const requiredInProduction = [
      ['JWT_SECRET', 'JWT signing secret'],
      ['JWT_REFRESH_SECRET', 'JWT refresh token secret'],
    ]
    const recommended = [
      ['DATABASE_TYPE', 'Database dialect (postgres/mongodb)'],
      ['PREVIEW_SECRET', 'Preview token signing secret'],
    ]

    if (process.env.NODE_ENV === 'production') {
      for (const [key, desc] of requiredInProduction) {
        if (!process.env[key]) {
          throw new Error(`[Zenith] FATAL: ${key} (${desc}) must be set in production.`)
        }
      }
      for (const [key, desc] of recommended) {
        if (!process.env[key]) {
          logger.warn({ key }, `[Zenith] Recommended env var "${key}" (${desc}) is not set.`)
        }
      }
    }
  }

  /**
   * Subscribes to the global event hub to record immutable audit trails.
   */
  private _initAuditTrail() {
    const handleEvent = async (action: string, payload: any) => {
      try {
        const { collection, documentId, user, siteId, data } = payload
        if (!user) return
        
        await this.adapter.create('z_audit_logs', {
          userId: user.id || user._id,
          userEmail: user.email,
          action,
          collectionName: collection,
          documentId,
          changes: data,
          siteId,
          timestamp: new Date(),
          status: 'success'
        })
      } catch (err: any) {
        logger.error({ err: err.message }, 'Failed to persist immutable audit log')
      }
    }

    eventHub.on('content.created', (payload) => handleEvent('create', payload))
    eventHub.on('content.updated', (payload) => handleEvent('update', payload))
    eventHub.on('content.deleted', (payload) => handleEvent('delete', payload))
  }

  private async _initPlugins() {
    const ctx = createPluginContext(this.app, this.config)
    for (const plugin of this.plugins) {
      if (plugin.enabled === false) continue
      if (plugin.onInit) {
        try {
          await plugin.onInit(ctx)
        } catch (err: any) {
          logger.error({ plugin: plugin.id || plugin.name, err: err.message }, 'Plugin onInit failed')
        }
      }
    }
  }

  private _initMiddleware() {
    this.app.use(tracerMiddleware)
    this.app.use(siteVaryMiddleware)
    this.app.use(metricsMiddleware)
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Swagger UI
            styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Swagger UI
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
          },
        },
        crossOriginEmbedderPolicy: false, // Allow embedding in admin iframe previews
      })
    )
    this.app.use(
      cors({
        origin:
          this.corsOptions?.origins ||
          process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ||
          (process.env.NODE_ENV === 'production' ? false : true),
        credentials: this.corsOptions?.credentials ?? true,
      })
    )
    this.app.use(compression())
    this.app.use(express.json({ limit: '50mb' }))
    this.app.use(auditMiddleware)
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }))
    this.app.use(cookieParser())
    this.app.use(csrfProtection)
    // Only apply MongoDB operator injection sanitizer when running with the Mongoose adapter.
    // In PostgreSQL mode this middleware adds unnecessary regex overhead on every request.
    if (this.adapter?.name === 'mongoose') {
      this.app.use(mongoSanitize())
    }
    this.app.use(maintenanceMiddleware)
    this.app.use(rateLimitMiddleware)
    this.app.use(apiKeyMiddleware)

    // Attach config and plugins to every request so route handlers can access them
    this.app.use((req: any, _res, next) => {
      req.zenith = {
        config: this.config,
        adapter: this.adapter,
        plugins: this.plugins.map((p) => ({
          name: p.name,
          description: p.description,
          version: p.version,
          author: p.author,
          downloads: p.downloads,
        })),
      }
      next()
    })

    // Global request timeout — 30 seconds
    this.app.use(requestTimeout(30_000))
  }

  private _initRoutes() {
    // ── Hot Swappable Router Proxy ──────────────────────────────────────────
    this.app.use((req, res, next) => {
      this.apiRouter(req, res, next)
    })
    
    this._mountRoutes(this.apiRouter)
  }

  private _mountRoutes(router: express.Router) {
    // ── Public Prometheus Metrics ────────────────────────────────────────────
    router.get('/metrics', (_req, res) => {
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      res.send(getPrometheusMetrics())
    })

    // ── Public ───────────────────────────────────────────────────────────────
    router.use('/api/v1/auth', authRouter)
    router.use('/api/v1/system', systemRouter)
    router.use('/api/v1/system/webhooks', webhooksRouter)
    router.use('/api/v1/system/plugins', pluginsRouter)
    router.use('/api/v1/system/schemas', schemasRouter)
    router.use('/api/v1/system/components', componentsRouter)
    router.use('/api/v1/system/campaigns', campaignsRouter)
    router.use('/api/v1/system/backup', backupRouter)
    router.use('/api/v1/system/introspect', introspectRouter)
    router.use('/api/v1/events', eventsRouter)

    // ── Media ────────────────────────────────────────────────────────────────
    router.use('/api/v1/upload', uploadRouter)
    router.use('/media', _mediaRouter)
    router.use('/api/v1/media', _mediaRouter)
    router.use('/api/v1/import-export', importExportRouter)
    router.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

    // ── Content Management Tools (non-collection) ─────────────────────────────
    router.use('/api/v1/preferences', preferencesRouter)
    router.use('/api/v1/versions', versionsRouter)
    router.use('/api/v1/locks', locksRouter)
    router.use('/api/v1/comments', commentsRouter)
    router.use('/api/v1/presence', presenceRouter)
    router.use('/api/v1/content-tools', contentToolsRouter)
    router.use('/api/v1/members', membersRouter)
    router.use('/api/v1/flows', flowsRouter)
    router.use('/api/v1/dashboard', dashboardRouter)
    router.use('/api/v1/sites', sitesRouter)
    router.use('/api/v1/workspaces', workspacesRouter)
    router.use('/api/v1/promotion', promotionRouter)
    router.use('/api/v1/releases', releasesRouter)
    router.use('/api/v1/roles', rolesRouter)
    router.use('/api/v1/templates', templatesRouter)
    router.use('/api/v1/blocks', blocksRouter)
    router.use('/api/v1/redirects', redirectsRouter)
    router.use('/api/v1/trash', trashRouter)
    router.use('/api/v1/duplicate', duplicateRouter)
    router.use('/api/v1', bulkRouter)

    // ── Redirect Handler (intercepts 404s for matching redirect rules) ────────
    router.get('/*', redirectHandler)

    // ── Dynamic Collection Routers ────────────────────────────────────────────
    const webhooks = this.config.webhooks || []

    // Ensure 'media' is in collections for the API to work (if not explicitly defined)
    const collections = [...this.config.collections]
    if (!collections.find((c) => c.slug === 'media')) {
      collections.push({
        name: 'Media',
        slug: 'media',
        publicRead: true,
        fields: [
          { name: 'name', type: 'text' },
          { name: 'url', type: 'text' },
          { name: 'alt', type: 'text' },
          { name: 'folder', type: 'text' },
          { name: 'mimetype', type: 'text' },
          { name: 'size', type: 'number' },
        ],
      } as any)
    }

    collections.forEach((col) => {
      router.use(`/api/v1/${col.slug}`, createCollectionRouter(col, this.adapter, webhooks))
      logger.info(`  → /api/v1/${col.slug} (${col.fields.length} fields)`)
    })

    // ── Global/Singleton Routes ───────────────────────────────────────────────
    ;(this.config.globals || []).forEach((global) => {
      const globalRouter = createCollectionRouter(global, this.adapter, webhooks)
      // Primary mount
      router.use(`/api/v1/globals/${global.slug}`, globalRouter)
      // Compatibility mount (intuitive flat structure)
      router.use(`/api/v1/${global.slug}`, globalRouter)

      logger.info(`  → /api/v1/${global.slug} (singleton)`)
    })

    // ── API Docs & GraphQL ────────────────────────────────────────────────────
    setupSwagger(this.app, this.config)
    // GraphQL is initialized async after DB connects

    // ── Root Health/Config Endpoint ───────────────────────────────────────────
    // Returns full schema details only for admin-authenticated requests.
    // Unauthenticated callers receive a simple status response.
    router.get('/api/v1/health', (req, res) => {
      const isAuthenticated = !!(req as any).user
      const isAdmin = isAuthenticated && (req as any).user?.role === 'admin'
      if (isAdmin) {
        res.json({
          data: {
            collections: this.config.collections,
            globals: this.config.globals || [],
            plugins: (this.plugins || []).map((p) => ({
              id: p.id || p.name,
              name: p.name,
              version: p.version,
              enabled: p.enabled !== false,
              author: p.author,
              description: p.description,
            })),
          },
        })
      } else {
        res.json({ status: 'ok', timestamp: new Date().toISOString() })
      }
    })

    // ── Global Error Handler ──────────────────────────────────────────────────
    router.use(globalErrorHandler)
  }
  
  /**
   * HOT-RELOAD ENGINE
   * Rebuilds the schema router dynamically.
   */
  public async reloadSchema(newConfig?: CMSConfig) {
    logger.info('ZenithEngine: Triggering zero-downtime schema reload...')
    if (newConfig) {
      this.config = newConfig
    }
    const newRouter = express.Router()
    this._mountRoutes(newRouter)
    
    // Attempt schema migrations if necessary
    try {
      await this.adapter.init(this.config)
    } catch (err: any) {
      logger.error({ err: err.message }, 'Schema hot-reload migration failed')
    }

    this.apiRouter = newRouter
    logger.info('ZenithEngine: Schema reloaded successfully.')
  }

  /** Export the full resolved config as JSON (for CI/CD or frontend code-gen) */
  public async exportSchema(outputPath = 'zenith-schema.json') {
    const fullPath = path.resolve(process.cwd(), outputPath)
    await fs.writeFile(fullPath, JSON.stringify(this.config, null, 2))
    logger.info(`Schema exported → ${fullPath}`)
  }

  public async start(port = this.port || Number(process.env.PORT) || 3000) {
    try {
      await this._initPlugins() // Phase 2: Call onInit hooks

      // Retry DB connection with exponential backoff (max ~30s)
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          await this.adapter.connect()
          lastError = null
          break
        } catch (err: any) {
          lastError = err
          if (attempt < 5) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 15_000)
            logger.warn({ attempt, delay }, `Database connection attempt ${attempt} failed. Retrying in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }
      }
      if (lastError) throw lastError
      logger.info(`Database connected (${this.adapter.name})`)

      // Load persisted webhook configs into engine config
      try {
        const whDocs = await this.adapter.find<any>('z_webhook_configs', {})
        this.config.webhooks = whDocs.map((d: any) => ({
          id: String(d._id ?? d.id), url: d.url, secret: d.secret, events: d.events,
          enabled: d.enabled, createdAt: d.createdAt?.toISOString?.() || d.createdAt,
        }))
        logger.info(`[Zenith Engine] Loaded ${whDocs.length} webhook configs from database`)
      } catch (err: any) {
        logger.info({ err: err.message }, '[Zenith Engine] No webhook configs found or z_webhook_configs not yet initialized')
      }

      // Load collections from the dynamic database schema registry
      let dbCollections: any[] = []
      try {
        dbCollections = await this.adapter.find<any>('z_collections', {})
        logger.info(`[Zenith Engine] Loaded ${dbCollections.length} dynamic collections from database registry`)
      } catch (err: any) {
        logger.info({ err: err.message }, '[Zenith Engine] No dynamic collections found or z_collections not yet initialized')
      }

      // Merge dynamic collections into core config registries
      for (const dbCol of dbCollections) {
        if (!this.config.collections.some((c) => c.slug === dbCol.slug)) {
          const colConfig = {
            name: dbCol.name,
            slug: dbCol.slug,
            labels: dbCol.labels,
            drafts: dbCol.drafts,
            timestamps: dbCol.timestamps,
            fields: dbCol.fields,
          }
          this.config.collections.push(colConfig)
          
          // Dynamically mount the Express router for this collection
          const { createCollectionRouter } = await import('./api/factory')
          const webhooks = this.config.webhooks || []
          this.app.use(`/api/v1/${dbCol.slug}`, createCollectionRouter(colConfig, this.adapter, webhooks))
          logger.info(`  → /api/v1/${dbCol.slug} (dynamic db-backed collection mounted, ${dbCol.fields.length} fields)`)
        }
      }

      // Load Content-Type Builder schemas
      let dbSchemas: any[] = []
      try {
        dbSchemas = await this.adapter.find<any>('z_schemas', {})
        logger.info(`[Zenith Engine] Loaded ${dbSchemas.length} UI Builder schemas from database`)
      } catch (err: any) {
        logger.info({ err: err.message }, '[Zenith Engine] No UI Builder schemas found or z_schemas not yet initialized')
      }

      for (const dbSchema of dbSchemas) {
        if (!this.config.collections.some((c) => c.slug === dbSchema.slug)) {
          const schemaConfig = {
            name: dbSchema.plural || dbSchema.slug,
            slug: dbSchema.slug,
            labels: { singular: dbSchema.singular, plural: dbSchema.plural },
            fields: dbSchema.fields || [],
            ...(dbSchema.settings || {})
          }
          this.config.collections.push(schemaConfig)
          
          const { createCollectionRouter } = await import('./api/factory')
          const webhooks = this.config.webhooks || []
          this.app.use(`/api/v1/${dbSchema.slug}`, createCollectionRouter(schemaConfig, this.adapter, webhooks))
          logger.info(`  → /api/v1/${dbSchema.slug} (UI Builder schema mounted, ${dbSchema.fields?.length || 0} fields)`)
        }
      }

      // Register all collections and globals with the adapter
      const collections = [...this.config.collections]
      const globals = this.config.globals || []

      // --- Trigger Ahead-of-Time (AOT) Query Compiler & Extension Synthesizer ---
      try {
        const { ZenithCompiler } = await import('./compiler/parser')
        const { ZenithSynthesizer } = await import('./synthesizer/engine')

        const compiler = new ZenithCompiler(this.config, path.resolve(process.cwd(), '.zenith/adapter.ts'))
        await compiler.compile()
        logger.info('[Zenith Next-Gen] Ahead-of-Time Query Compilation completed successfully.')

        const synthesizer = new ZenithSynthesizer(path.resolve(process.cwd(), '.zenith/extensions'))
        synthesizer.synthesize(collections)
        logger.info('[Zenith Next-Gen] Zero-Dependency Extension Synthesis completed successfully.')
      } catch (compileErr: any) {
        logger.warn({ err: compileErr.message }, '[Zenith Next-Gen] AOT Compiler or Synthesizer failed. Falling back to dynamic execution.')
      }

      // Load AOT bridge query mappings if compiled file exists
      await AotBridge.load()

      // Add system collections if missing
      if (!collections.find((c) => c.slug === 'media')) {
        collections.push({
          slug: 'media',
          name: 'Media',
          fields: [
            { name: 'name', type: 'text' },
            { name: 'url', type: 'text' },
            { name: 'alt', type: 'text' },
            { name: 'folder', type: 'text' },
            { name: 'mimetype', type: 'text' },
            { name: 'size', type: 'number' },
          ],
        } as any)
      }

      for (const col of collections) {
        await this.adapter.registerCollection(col)
        this.servicesMap.set(col.slug, new ContentService(col, this.adapter))
      }

      for (const global of globals) {
        await this.adapter.registerCollection(global)
        this.servicesMap.set(global.slug, new ContentService(global, this.adapter))
      }

      // Synthesize types dynamically for outstanding developer experience.
      // Wrapped in try-catch to survive read-only filesystems (e.g. AWS Fargate, Google Cloud Run).
      // Set DISABLE_TYPE_GEN=true to skip this step entirely in production containers.
      if (process.env.DISABLE_TYPE_GEN === 'true') {
        logger.info('Type synthesis skipped via DISABLE_TYPE_GEN environment variable.')
      } else {
        try {
          const generatedTypesPath = path.resolve(__dirname, '../../types/src/generated.ts')
          await TypeSynthesizer.synthesize([...collections, ...globals], generatedTypesPath)
        } catch (err: any) {
          logger.warn(
            { err: err.message },
            'Failed to run dynamic type synthesis (filesystem may be read-only). Skipping — set DISABLE_TYPE_GEN=true to suppress this warning.'
          )
        }
      }

      await seedInitialData()
      await seedSystemRoles()

      // Optional high-fidelity dummy seeding for demos
      if (process.env.ZENITH_SEED === 'true') {
        await seedDummyData(this.config.collections, this.adapter)
      }

      SchedulerService.init(this.config.collections, this.adapter)
      DeploymentService.init(this.config)
      WebhookService.init(this.config)
      FlowEngine.init()
      PresenceService.init(this.adapter)
      sessionStore.startCleanup()

      // Start audit log rotation (daily check at 3am)
      if (process.env.AUDIT_ROTATION_DISABLE !== 'true') {
        const { rotateAuditLogs } = await import('./services/audit-rotation')
        const rotationInterval = 24 * 60 * 60 * 1000 // once per day
        setTimeout(async () => {
          await rotateAuditLogs()
          setInterval(rotateAuditLogs, rotationInterval)
        }, 3 * 60 * 60 * 1000) // first run in 3 hours (≈3am if server started at midnight)
      }

      // Inject adapter into every request so GraphQL resolvers and plugins can access it
      this.app.use((req: any, _res: any, next: any) => {
        req.__zenithAdapter = this.adapter
        next()
      })

      // GraphQL needs DB to be connected first (model registration)
      await setupGraphQL(this.app, this.config)

      // ── Admin SPA Serving (production) ────────────────────────────────────
      const adminDist = path.resolve(process.cwd(), 'packages/admin/dist')
      try {
        await fs.access(adminDist)
        const stat = await fs.stat(adminDist)
        if (stat.isDirectory()) {
          // Hashed assets (in /assets/) — cache forever since filenames are unique
          this.app.use('/assets', express.static(path.join(adminDist, 'assets'), {
            maxAge: '1y',
            immutable: true,
          }))

          // Other static files (favicon, etc.)
          this.app.use(express.static(adminDist))

          // SPA catch-all: serve index.html for any unmatched GET (non-API) route
          let cachedHtml: string | null = null
          this.app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api/') || req.path.startsWith('/media/') || req.path.startsWith('/uploads/')) {
              return next()
            }
            if (!req.accepts('html')) return next()
            if (cachedHtml) {
              return res.type('html').send(cachedHtml)
            }
            fs.readFile(path.join(adminDist, 'index.html'), 'utf-8')
              .then((html) => {
                cachedHtml = html
                res.type('html').send(html)
              })
              .catch(() => next())
          })

          logger.info(`Admin SPA serving from ${adminDist}`)
        }
      } catch {
        logger.info('Admin SPA dist not found — serving API only')
      }

      const server = this.app.listen(port, () => {
        console.log(`
╔════════════════════════════════════════════════╗
║            🚀  Zenith CMS — Online              ║
╠════════════════════════════════════════════════╣
║  REST API    →  http://localhost:${port}/api/v1
║  GraphQL     →  http://localhost:${port}/graphql
║  Swagger     →  http://localhost:${port}/api-docs
║  Health      →  http://localhost:${port}/api/v1/system/health
╚════════════════════════════════════════════════╝`)
      })

      // Handle port-in-use errors (common with tsx watch restarts on Windows)
      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          logger.warn({ port }, 'Port already in use — another instance is running. Server will not start.')
          // Don't process.exit(1) — let tsx watch or orchestrator handle the lifecycle
          return
        }
        throw err
      })

      // ── Real-Time Collaborative WebSockets & Presence ───────────────────────
      try {
        const { Server } = await import('socket.io')
        const io = new Server(server, {
          cors: {
            origin:
              this.corsOptions?.origins ||
              process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ||
              '*',
            credentials: true,
          },
        })

        io.on('connection', (socket) => {
          socket.on('presence:join', async ({ userId, email, collection, documentId }) => {
            socket.join(`doc:${collection}:${documentId}`)
            const { PresenceService } = await import('./services/presence')
            await PresenceService.heartbeat(userId, email, collection, documentId)

            const activeUsers = await PresenceService.getActiveUsers(collection, documentId)
            io.to(`doc:${collection}:${documentId}`).emit('presence:update', activeUsers)
          })

          socket.on('presence:leave', async ({ userId, collection, documentId }) => {
            const { PresenceService } = await import('./services/presence')
            await PresenceService.leave(userId, collection, documentId)

            const activeUsers = await PresenceService.getActiveUsers(collection, documentId)
            io.to(`doc:${collection}:${documentId}`).emit('presence:update', activeUsers)
            socket.leave(`doc:${collection}:${documentId}`)
          })

          socket.on('presence:heartbeat', async ({ userId, email, collection, documentId }) => {
            const { PresenceService } = await import('./services/presence')
            await PresenceService.heartbeat(userId, email, collection, documentId)

            const activeUsers = await PresenceService.getActiveUsers(collection, documentId)
            io.to(`doc:${collection}:${documentId}`).emit('presence:update', activeUsers)
          })

          // Live Content Editing & Synchronous Event Broadcasts
          socket.on('content:sync', ({ collection, documentId, data, sourceField }) => {
            socket.to(`doc:${collection}:${documentId}`).emit('content:sync', { data, sourceField })
          })

          socket.on('typing:start', ({ userEmail, collection, documentId, field }) => {
            socket.to(`doc:${collection}:${documentId}`).emit('typing:start', { userEmail, field })
          })

          socket.on('typing:stop', ({ userEmail, collection, documentId, field }) => {
            socket.to(`doc:${collection}:${documentId}`).emit('typing:stop', { userEmail, field })
          })

          // ── Real-time Collection Data Sync Subscriptions ──
          socket.on('collection:subscribe', ({ collection }) => {
            socket.join(`collection:${collection}`)
          })

          socket.on('collection:unsubscribe', ({ collection }) => {
            socket.leave(`collection:${collection}`)
          })

          socket.on('disconnect', () => {
            // Natural session expiration handled via Presence TTL heartbeats
          })
        })
        ;(this as any).io = io

        // Tie EventHub to Real-Time Socket Broadcasts
        const { eventHub } = await import('./services/event-hub')
        eventHub.on('content.created', (payload) => {
          io.to(`collection:${payload.collection}`).emit('content.created', payload)
        })
        eventHub.on('content.updated', (payload) => {
          io.to(`collection:${payload.collection}`).emit('content.updated', payload)
          io.to(`doc:${payload.collection}:${payload.document.id}`).emit('content.updated', payload)
        })
        eventHub.on('content.deleted', (payload) => {
          io.to(`collection:${payload.collection}`).emit('content.deleted', payload)
          io.to(`doc:${payload.collection}:${payload.id}`).emit('content.deleted', payload)
        })

        logger.info('Zenith WebSocket Collaboration Server active')
      } catch (wsError: any) {
        logger.warn({ err: wsError.message }, 'Real-time WebSocket initialization deferred')
      }

      // ── Plugin onReady lifecycle ──────────────────────────────────────────
      // Called after DB connect, collection registration, and routes are all live.
      // This is the correct point for plugins to register their own Express routes
      // or perform DB-dependent setup.
      const pluginCtx = createPluginContext(this.app, this.config)
      for (const plugin of this.plugins || []) {
        if (plugin.enabled === false) continue
        try {
          if (typeof plugin.onReady === 'function') {
            await plugin.onReady(pluginCtx)
          }
        } catch (pluginErr: any) {
          logger.warn({ plugin: plugin.id || plugin.name, err: pluginErr.message }, 'Plugin onReady failed')
        }
      }

      // Graceful shutdown
      const shutdown = async (signal: string) => {
        logger.info({ signal }, 'Graceful shutdown started')

        // ── Plugin onDestroy lifecycle ──────────────────────────────────────
        const pluginCtx = createPluginContext(this.app, this.config)
        for (const plugin of this.plugins || []) {
          if (plugin.enabled === false) continue
          if (typeof plugin.onDestroy === 'function') {
            try {
              await Promise.race([
                plugin.onDestroy(pluginCtx),
                new Promise((_, reject) => setTimeout(() => reject(new Error('onDestroy timeout')), 5000)),
              ])
              logger.info({ plugin: plugin.id || plugin.name }, 'Plugin onDestroy completed')
            } catch (err: any) {
              logger.warn({ plugin: plugin.id || plugin.name, err: err.message }, 'Plugin onDestroy failed')
            }
          }
        }

        SchedulerService.stop()
        sessionStore.stopCleanup()

        // Shutdown webhook service
        try {
          await WebhookService.shutdown()
        } catch {
          // ignored
        }

        // Close Socket.IO server
        try {
          const io = (this as any).io
          if (io) {
            await new Promise<void>((resolve) => io.close(resolve))
            logger.info('Socket.IO server closed')
          }
        } catch {
          // ignored
        }

        try {
          /* eslint-disable-next-line @typescript-eslint/no-require-imports */
          const { sandboxPool } = require('./services/content')
          sandboxPool.shutdown()
          logger.info('[Zenith Next-Gen] Sandbox Worker Pool terminated successfully.')
        } catch {
          // Ignored if sandbox pool was not loaded
        }
        server.close(async () => {
          await this.adapter.disconnect()
          logger.info('Shutdown complete')
          process.exit(0)
        })
        setTimeout(() => process.exit(1), 10_000)
      }

      process.on('SIGTERM', () => shutdown('SIGTERM'))
      process.on('SIGINT', () => shutdown('SIGINT'))

      return server
    } catch (error: any) {
      logger.error({ err: error.message, stack: error.stack }, 'Startup failed')
      process.exit(1)
    }
  }
}

/**
 * Zenith CMS Factory
 * ──────────────────
 * Creates and initializes a new Zenith instance.
 */
export async function createZenith(options: ZenithOptions) {
  return new ZenithEngine(options)
}

// ── Public API Surface ────────────────────────────────────────────────────────
export * from './errors'
export * from './utils'
export * from './plugins'
export * from './plugins/strapi-bridge'
export { LicensingService } from './services/LicensingService'
export { eventHub } from './services/event-hub'
export { AIService } from './services/ai'
export type { CMSConfig, CollectionConfig, FieldConfig } from '@zenithcms/types'

