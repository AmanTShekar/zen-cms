import express, { Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import mongoSanitize from 'express-mongo-sanitize'
import path from 'path'
import fs from 'fs/promises'

import { CMSConfig } from '@zenith-open/zenithcms-types'
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
import { AuthService } from './services/auth'

// ── Register Mongoose Schemas (Required for MongoDB Mode) ────────────────────
import './database/registry'

// ── Middleware ───────────────────────────────────────────────────────────────
import { rateLimitMiddleware } from './middleware/rate-limit'
import { apiKeyMiddleware } from './middleware/api-key'
import { globalErrorHandler } from './middleware/error-handler'
import { csrfProtection } from './middleware/csrf'
import { maintenanceMiddleware } from './middleware/maintenance'
import { metricsMiddleware, getPrometheusMetrics } from './middleware/metrics'
import { slowQueryMiddleware } from './middleware/slow-query'
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
  public server: import('http').Server | null = null;
  public auditInterval: ReturnType<typeof setInterval> | null = null;

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
    this.adapter = options.adapter || AdapterFactory.create((this.config as any).database?.uri, (this.config as any).database?.engine)
    AdapterFactory.setActiveAdapter(this.adapter)

    this.app = express()
    this.app.set('zenith_engine', this)

    // Enable trust proxy for secure rate-limiting and cookie transport behind reverse proxies.
    // Default to 1 (one reverse proxy) rather than `true` (trust all) to prevent
    // X-Forwarded-For header spoofing that would bypass IP-based rate limiting.
    // Set TRUST_PROXY=2 for two-layer setups (e.g., CDN → load balancer → app).
    const trustProxy = process.env.TRUST_PROXY
    if (trustProxy) {
      this.app.set('trust proxy', trustProxy === 'true' ? 1 : trustProxy === 'false' ? false : Number(trustProxy) || trustProxy)
    } else {
      this.app.set('trust proxy', 1) // Trust exactly one reverse proxy by default
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
    this.app.use(slowQueryMiddleware)
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
            connectSrc: ["'self'", "ws:", "wss:"],
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
          (process.env.NODE_ENV === 'production'
            // Security: deny all cross-origin requests in production when CORS_ORIGINS is unset.
            // Never fall back to localhost origins in production — that would allow any
            // localhost-based attacker to make authenticated cross-origin requests.
            ? []
            : true),
        credentials: this.corsOptions?.credentials ?? true,
      })
    )
    if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) {
      logger.warn('CORS_ORIGINS is not set in production — all cross-origin requests will be blocked. Set the CORS_ORIGINS env var to allow your frontend origins.')
    }
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

    // Attach config, adapter and plugins to every request so route handlers can access them
    // NOTE: __zenithAdapter is set here (not in start()) so upload and all routes have it from
    // the very first request — eliminating the startup race condition that caused 500 errors.
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
      req.__zenithAdapter = this.adapter
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
    router.get('/metrics', async (req, res) => {
      try {
        const { metricsRegistry } = await import('./telemetry/metrics')
        res.set('Content-Type', metricsRegistry.contentType)
        res.end(await metricsRegistry.metrics())
      } catch (err) {
        res.status(500).end(err)
      }
    })
    logger.warn('[SECURITY] The /metrics endpoint is exposed. Ensure your infrastructure restricts public access to this path.')

    // ── Kubernetes Health Probes ──────────────────────────────────────────────
    router.get('/live', (_req, res) => {
      // Returns 200 immediately to verify process health.
      res.status(200).send('OK')
    })

    router.get('/ready', (_req, res) => {
      // Returns 200 only if DB connection is active.
      if (this.adapter && this.adapter.getHealth() === 'ok') {
        res.status(200).send('Ready')
      } else {
        res.status(503).send('Not Ready')
      }
    })

    router.get('/health', (_req, res) => {
      // Returns detailed system metrics
      res.status(200).json({
        status: this.adapter?.getHealth() === 'ok' ? 'ok' : 'degraded',
        uptime: process.uptime(),
        database: this.adapter?.getHealth() || 'disconnected',
        memoryUsage: process.memoryUsage(),
        version: process.env.npm_package_version || 'unknown',
        timestamp: new Date().toISOString()
      })
    })

    // ── Public ───────────────────────────────────────────────────────────────
    router.use('/api/v1/auth', authRouter)
    router.use('/api/v1/system', systemRouter)
    router.use('/api/v1/system/webhooks', webhooksRouter)
    router.use('/api/v1/system/plugins', pluginsRouter)
    router.use('/api/v1/schemas', schemasRouter)
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
      let token = req.cookies?.accessToken
      if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1]
      }
      if (token) {
        try {
          const decoded = AuthService.verifyToken(token)
          if (decoded) (req as any).user = decoded
        } catch {
          // Token invalid or expired, ignore
        }
      }

      const isAuthenticated = !!(req as any).user
      const isAdmin = isAuthenticated && ((req as any).user?.role === 'admin' || (req as any).user?.role === 'editor')

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
      await this.adapter.connect()
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
            const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 15_000)
            const jitter = Math.floor(Math.random() * 1000)
            const delay = baseDelay + jitter
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

      // Sync static configs to database registry
      try {
        const hardcoded = [
          ...(this.config.collections || []).map((c: any) => ({ ...c, isGlobal: false })),
          ...(this.config.globals || []).map((g: any) => ({ ...g, isGlobal: true }))
        ]
        
        for (const hc of hardcoded) {
          if (hc.slug === 'z_users' || hc.slug === 'z_sites' || hc.slug === 'z_collections' || hc.slug === 'z_schemas' || hc.slug === 'z_webhook_configs') continue

          const existing = dbCollections.find(dbC => dbC.slug === hc.slug)
          const payload = {
            name: hc.name,
            slug: hc.slug,
            labels: hc.labels || { singular: hc.name, plural: hc.name + 's' },
            isGlobal: hc.isGlobal,
            drafts: hc.drafts ?? false,
            timestamps: hc.timestamps ?? true,
            publicRead: hc.publicRead ?? false,
            fields: hc.fields || []
          }
          if (!existing) {
            const newDoc = await this.adapter.create('z_collections', payload)
            dbCollections.push(newDoc)
            logger.info(`[Startup Reconciliation] Synced static schema ${hc.slug} to z_collections registry`)
          } else {
            await this.adapter.update('z_collections', existing.id || existing._id, payload)
            logger.info(`[Startup Reconciliation] Updated existing schema ${hc.slug} in z_collections registry`)
            Object.assign(existing, payload)
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, '[Zenith Engine] Failed to sync static collections to z_collections')
      }

      // Startup Reconciliation Check for Blocks
      try {
        const blocksDir = path.resolve(__dirname, '../../../config/blocks')
        const tsSlugs = new Set<string>()
        try {
          await fs.access(blocksDir)
          const files = await fs.readdir(blocksDir)
          files.filter(f => f.endsWith('.ts')).forEach(f => tsSlugs.add(f.replace(/\.ts$/, '')))
        } catch (e) {
          // blocksDir does not exist, ignore
        }
        
        let dbSchemas: any[] = []
        try {
          dbSchemas = await this.adapter.find<any>('z_schemas', {})
        } catch (e) {
           // z_schemas might not exist yet
        }

        const dbSlugs = new Set(dbSchemas.map((s: any) => s.slug))
        
        // 1. Check for orphaned .ts files (File exists, DB missing)
        for (const slug of tsSlugs) {
          if (!dbSlugs.has(slug)) {
            logger.error(`[Startup Reconciliation] CRITICAL: Orphaned file ${slug}.ts found in config/blocks without a corresponding z_schemas DB record. Action Required: Manually run a reconciliation command or re-generate the block via the builder.`)
          }
        }

        // 2. Check for missing .ts files (DB exists, File missing)
        // DEPRECATED: We now support fully dynamic DB-backed blocks, so we do not enforce .ts file existence.
        /*
        for (const dbSchema of dbSchemas) {
          if (!tsSlugs.has(dbSchema.slug)) {
            logger.error(`[Startup Reconciliation] CRITICAL: Missing file ${dbSchema.slug}.ts for DB record in z_schemas. Action Required: Manually delete the DB record or restore the .ts file from version control.`)
          }
        }
        */
      } catch (err: any) {
        logger.warn({ err: err.message }, '[Zenith Engine] Block reconciliation check failed or z_schemas not yet initialized')
      }

      // Merge dynamic collections into core config registries
      for (const dbCol of dbCollections) {
        const isSingleton = dbCol.singleton === true || dbCol.isGlobal === true
        const targetRegistry = isSingleton ? (this.config.globals = this.config.globals || []) : this.config.collections
        
        if (!targetRegistry.some((c) => c.slug === dbCol.slug)) {
          const colConfig = {
            name: dbCol.name,
            slug: dbCol.slug,
            labels: dbCol.labels,
            drafts: dbCol.drafts,
            timestamps: dbCol.timestamps,
            publicRead: dbCol.publicRead ?? false,
            singleton: isSingleton,
            fields: dbCol.fields,
          }
          targetRegistry.push(colConfig)
          
          // Dynamically mount the Express router for this collection
          const { createCollectionRouter } = await import('./api/factory')
          const webhooks = this.config.webhooks || []
          
          if (isSingleton) {
            const globalRouter = createCollectionRouter(colConfig, this.adapter, webhooks)
            this.app.use(`/api/v1/globals/${dbCol.slug}`, globalRouter)
            this.app.use(`/api/v1/${dbCol.slug}`, globalRouter)
            logger.info(`  → /api/v1/${dbCol.slug} (dynamic db-backed global mounted, ${dbCol.fields.length} fields)`)
          } else {
            this.app.use(`/api/v1/${dbCol.slug}`, createCollectionRouter(colConfig, this.adapter, webhooks))
            logger.info(`  → /api/v1/${dbCol.slug} (dynamic db-backed collection mounted, ${dbCol.fields.length} fields)`)
          }
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
        if (dbSchema.type === 'block') continue;

        const isSingleton = dbSchema.type === 'global' || dbSchema.isGlobal;
        const targetRegistry = isSingleton ? (this.config.globals = this.config.globals || []) : this.config.collections;

        if (!targetRegistry.some((c) => c.slug === dbSchema.slug)) {
          const schemaConfig = {
            name: dbSchema.plural || dbSchema.slug,
            slug: dbSchema.slug,
            labels: { singular: dbSchema.singular, plural: dbSchema.plural },
            fields: dbSchema.fields || [],
            publicRead: dbSchema.publicRead ?? false,
            singleton: isSingleton,
            ...(dbSchema.settings || {})
          }
          targetRegistry.push(schemaConfig as any)
          
          const { createCollectionRouter } = await import('./api/factory')
          const webhooks = this.config.webhooks || []
          
          if (isSingleton) {
            const globalRouter = createCollectionRouter(schemaConfig as any, this.adapter, webhooks)
            this.app.use(`/api/v1/globals/${dbSchema.slug}`, globalRouter)
            this.app.use(`/api/v1/${dbSchema.slug}`, globalRouter)
            logger.info(`  → /api/v1/${dbSchema.slug} (UI Builder global mounted, ${dbSchema.fields?.length || 0} fields)`)
          } else {
            this.app.use(`/api/v1/${dbSchema.slug}`, createCollectionRouter(schemaConfig as any, this.adapter, webhooks))
            logger.info(`  → /api/v1/${dbSchema.slug} (UI Builder schema mounted, ${dbSchema.fields?.length || 0} fields)`)
          }
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

      console.log(`[ZenithEngine] Starting to register ${collections.length} collections:`, collections.map(c => c.slug))
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
          this.auditInterval = setInterval(rotateAuditLogs, rotationInterval)
        }, 3 * 60 * 60 * 1000) // first run in 3 hours (≈3am if server started at midnight)
      }

      // Adapter injection already happens in _initMiddleware — this is kept as a no-op comment
      // for historical reference. GraphQL resolvers use req.__zenithAdapter set earlier.
      // this.app.use(...) — removed to prevent double injection

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

      this.server = this.app.listen(port, () => {
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
      this.server.on('error', (err: NodeJS.ErrnoException) => {
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
        const ioOptions: any = {
          cors: {
            origin:
              this.corsOptions?.origins ||
              process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ||
              '*',
            credentials: true,
          },
        }

        if (process.env.REDIS_URL) {
          const { createClient } = await import('redis')
          const { createAdapter } = await import('@socket.io/redis-adapter')
          
          const pubClient = createClient({ url: process.env.REDIS_URL })
          const subClient = pubClient.duplicate()

          await Promise.all([pubClient.connect(), subClient.connect()])
          ioOptions.adapter = createAdapter(pubClient, subClient)
          logger.info('Socket.IO Redis Adapter configured successfully')

          // Phase 5: Redis Pub/Sub for config invalidation across instances
          subClient.subscribe('zenith:tenant:update', async (message) => {
            logger.info(`Received cross-node tenant update for siteId: ${message}`)
            // Clear local caches
            const { AdapterFactory } = await import('./database/adapters/AdapterFactory')
            const adapter = AdapterFactory.getActiveAdapter()
            if ((adapter as any)._invalidateSchemaCache) {
               (adapter as any)._invalidateSchemaCache()
            }
          })
        }

        const io = new Server(this.server, ioOptions)

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

      return this.server
    } catch (error: any) {
      logger.error({ err: error.message, stack: error.stack }, 'Startup failed')
      process.exit(1)
    }
  }

  public async stop(signal: string = 'SIGTERM') {
    logger.info({ signal }, 'Graceful shutdown started')

    if (this.auditInterval) {
      clearInterval(this.auditInterval)
    }

    if ((global as any).__zenithTenantWatcherInstance) {
      try {
        await (global as any).__zenithTenantWatcherInstance.close()
        logger.info('Tenant watcher closed')
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to close tenant watcher')
      }
    }

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

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(async () => {
          // Drain in-flight requests (max 30s) before closing DB connections
          const drainTimeout = setTimeout(() => {
            logger.warn('Shutdown drain timeout (30s) — forcing exit')
            process.exit(1)
          }, 30_000)
          clearTimeout(drainTimeout)
          await this.adapter.disconnect()
          logger.info('Shutdown complete')
          resolve()
        })
      })
    } else {
      await this.adapter.disconnect()
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
export type { CMSConfig, CollectionConfig, FieldConfig } from '@zenith-open/zenithcms-types'

