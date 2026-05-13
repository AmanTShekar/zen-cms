import express, { Express } from 'express';
import _mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs/promises';

import { CMSConfig } from '@zenith/types';
import { applyPlugins, ZenithPlugin } from './plugins';
import { logger } from './services/logger';
import { SchedulerService } from './services/scheduler';
import { seedInitialData } from './database/seed';
import { seedDummyData } from './database/seed-dummy';

// ── Middleware ───────────────────────────────────────────────────────────────
import { rateLimitMiddleware } from './middleware/rate-limit';
import { apiKeyMiddleware } from './middleware/api-key';
import { _globalErrorHandler } from './middleware/error-handler';

// ── Routers ──────────────────────────────────────────────────────────────────
import { createCollectionRouter } from './api/factory';
import { _errorHandler } from './middleware/error-handler';
import { auditMiddleware } from './middleware/audit';
import systemRouter from './api/system';
import authRouter from './api/auth';
import uploadRouter from './api/upload';
import _mediaRouter from './api/media';
import preferencesRouter from './api/preferences';
import versionsRouter from './api/versions';
import presenceRouter from './api/presence';
import { DeploymentService } from './services/deployment';
import contentToolsRouter from './api/content-tools';
import membersRouter from './api/members';
import flowsRouter from './api/flows';

// ── GraphQL / Swagger (optional) ─────────────────────────────────────────────
import { setupSwagger } from './api/swagger';
import { setupGraphQL } from './api/graphql';

import { DatabaseAdapter } from './database/adapters/BaseAdapter';
import { MongooseAdapter } from './database/adapters/MongooseAdapter';

export interface ZenithOptions {
  config: CMSConfig;
  plugins?: ZenithPlugin[];
  adapter?: DatabaseAdapter;
  port?: number;
  cors?: {
    origins?: string[];
    credentials?: boolean;
  };
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
  public app: Express;
  public adapter: DatabaseAdapter;
  private config: CMSConfig;
  private plugins: ZenithPlugin[];
  private port?: number;
  private corsOptions?: ZenithOptions['cors'];

  /**
   * INITIALIZATION SEQUENCE
   * Phase 1: Configuration Harvesting & Plugin Merging
   * Phase 2: Middleware Hardening (Helmet, Rate Limiting, Audit)
   * Phase 3: Neural Bridge & Route Generation
   */
  constructor(options: ZenithOptions) {
    this.config = applyPlugins(options.config, options.plugins || []);
    this.plugins = options.plugins || [];
    this.port = options.port;
    this.corsOptions = options.cors;
    
    // Default to Mongoose if no adapter provided
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith';
    this.adapter = options.adapter || new MongooseAdapter(mongoUri);
    
    this.app = express();
    this._initMiddleware();
    this._initPlugins(); // Phase 2: Call onInit hooks
    this._initRoutes();
  }

  private async _initPlugins() {
    for (const plugin of this.plugins) {
      if (plugin.onInit) {
        await plugin.onInit(this.app);
      }
    }
  }

  private _initMiddleware() {
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({
      origin: this.corsOptions?.origins || process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || true,
      credentials: this.corsOptions?.credentials ?? true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(auditMiddleware);
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(cookieParser());
    this.app.use(mongoSanitize());
    this.app.use(rateLimitMiddleware);
    this.app.use(apiKeyMiddleware);

    // Attach config and plugins to every request so route handlers can access them
    this.app.use((req: unknown, _res, next) => {
      req.zenith = { 
        config: this.config,
        plugins: this.plugins.map(p => ({
          name: p.name,
          description: p.description,
          version: p.version,
          author: p.author,
          downloads: p.downloads
        }))
      };
      next();
    });
  }

  private _initRoutes() {
    // ── Public ───────────────────────────────────────────────────────────────
    this.app.use('/api/v1/auth', authRouter);
    this.app.use('/api/v1/system', systemRouter);

    // ── Media ────────────────────────────────────────────────────────────────
    this.app.use('/api/v1/upload', uploadRouter);
    this.app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

    // ── Content Management Tools (non-collection) ─────────────────────────────
    this.app.use('/api/v1/preferences', preferencesRouter);
    this.app.use('/api/v1/versions', versionsRouter);
    this.app.use('/api/v1/presence', presenceRouter);
    this.app.use('/api/v1/content-tools', contentToolsRouter);
    this.app.use('/api/v1/members', membersRouter);
    this.app.use('/api/v1/flows', flowsRouter);

    // ── Dynamic Collection Routers ────────────────────────────────────────────
    const webhooks = this.config.webhooks || [];
    
    // Ensure 'media' is in collections for the API to work (if not explicitly defined)
    const collections = [...this.config.collections];
    if (!collections.find(c => c.slug === 'media')) {
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
          { name: 'size', type: 'number' }
        ]
      } as unknown);
    }

    collections.forEach(col => {
      this.app.use(`/api/v1/${col.slug}`, createCollectionRouter(col, this.adapter, webhooks));
      logger.info(`  → /api/v1/${col.slug} (${col.fields.length} fields)`);
    });

    // ── Global/Singleton Routes ───────────────────────────────────────────────
    (this.config.globals || []).forEach(global => {
      const router = createCollectionRouter(global, this.adapter, webhooks);
      // Primary mount
      this.app.use(`/api/v1/globals/${global.slug}`, router);
      // Compatibility mount (intuitive flat structure)
      this.app.use(`/api/v1/${global.slug}`, router);
      
      logger.info(`  → /api/v1/${global.slug} (singleton)`);
    });

    // ── API Docs & GraphQL ────────────────────────────────────────────────────
    setupSwagger(this.app, this.config);
    // GraphQL is initialized async after DB connects

    // ── Root Health/Config Endpoint ───────────────────────────────────────────
    this.app.get('/api/v1/health', (req, res) => {
      res.json({
        data: {
          collections: this.config.collections,
          globals: this.config.globals || []
        }
      });
    });
  }

  /** Export the full resolved config as JSON (for CI/CD or frontend code-gen) */
  public async exportSchema(outputPath = 'zenith-schema.json') {
    const fullPath = path.resolve(process.cwd(), outputPath);
    await fs.writeFile(fullPath, JSON.stringify(this.config, null, 2));
    logger.info(`Schema exported → ${fullPath}`);
  }

  public async start(port = this.port || Number(process.env.PORT) || 3000) {
    try {
      await this.adapter.connect();
      logger.info(`Database connected (${this.adapter.name})`);

      // Register all collections and globals with the adapter
      const collections = [...this.config.collections];
      const globals = this.config.globals || [];

      // Add system collections if missing
      if (!collections.find(c => c.slug === 'media')) {
        collections.push({ 
          slug: 'media', 
          name: 'Media', 
          fields: [
            { name: 'name', type: 'text' },
            { name: 'url', type: 'text' },
            { name: 'alt', type: 'text' },
            { name: 'folder', type: 'text' },
            { name: 'mimetype', type: 'text' },
            { name: 'size', type: 'number' }
          ] 
        } as unknown);
      }
      
      for (const col of collections) {
        await this.adapter.registerCollection(col);
      }

      for (const global of globals) {
        await this.adapter.registerCollection(global);
      }

      await seedInitialData();
      
      // Optional high-fidelity dummy seeding for demos
      if (process.env.ZENITH_SEED === 'true') {
        await seedDummyData(this.config.collections);
      }

      SchedulerService.init(this.config.collections);
      DeploymentService.init(this.config);

      // GraphQL needs DB to be connected first (model registration)
      await setupGraphQL(this.app, this.config);

      const server = this.app.listen(port, () => {
        console.log(`
╔════════════════════════════════════════════════╗
║            🚀  Zenith CMS — Online              ║
╠════════════════════════════════════════════════╣
║  REST API    →  http://localhost:${port}/api/v1
║  GraphQL     →  http://localhost:${port}/graphql
║  Swagger     →  http://localhost:${port}/api-docs
║  Health      →  http://localhost:${port}/api/v1/system/health
╚════════════════════════════════════════════════╝`);
      });

      // Graceful shutdown
      const shutdown = async (signal: string) => {
        logger.info({ signal }, 'Graceful shutdown started');
        SchedulerService.stop();
        server.close(async () => {
          await this.adapter.disconnect();
          logger.info('Shutdown complete');
          process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000);
      };

      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));

      return server;
    } catch (error) {
      logger.error({ error }, 'Startup failed');
      process.exit(1);
    }
  }
}

/**
 * Zenith CMS Factory
 * ──────────────────
 * Creates and initializes a new Zenith instance.
 */
export async function createZenith(options: ZenithOptions) {
  return new ZenithEngine(options);
}

// ── Public API Surface ────────────────────────────────────────────────────────
export * from './errors';
export * from './utils';
export * from './plugins';
export { eventHub } from './services/event-hub';
export { AIService } from './services/ai';
export type { CMSConfig, CollectionConfig, FieldConfig } from '@zenith/types';
