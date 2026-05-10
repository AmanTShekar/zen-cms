import express, { Express } from 'express';
import mongoose from 'mongoose';
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

// ── Middleware ───────────────────────────────────────────────────────────────
import { rateLimitMiddleware } from './middleware/rate-limit';
import { apiKeyMiddleware } from './middleware/api-key';
import { globalErrorHandler } from './middleware/error-handler';

// ── Routers ──────────────────────────────────────────────────────────────────
import { createCollectionRouter } from './api/factory';
import systemRouter from './api/system';
import authRouter from './api/auth';
import uploadRouter from './api/upload';
import mediaRouter from './api/media';
import preferencesRouter from './api/preferences';
import versionsRouter from './api/versions';
import presenceRouter from './api/presence';
import contentToolsRouter from './api/content-tools';

// ── GraphQL / Swagger (optional) ─────────────────────────────────────────────
import { setupSwagger } from './api/swagger';
import { setupGraphQL } from './api/graphql';

export interface ZenithOptions {
  config: CMSConfig;
  plugins?: ZenithPlugin[];
}

export class ZenithEngine {
  public app: Express;
  private config: CMSConfig;

  constructor({ config, plugins = [] }: ZenithOptions) {
    this.config = applyPlugins(config, plugins);
    this.app = express();
    this._initMiddleware();
    this._initRoutes();
  }

  private _initMiddleware() {
    this.app.use(helmet({ contentSecurityPolicy: false }));
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || true,
      credentials: true,
    }));
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(cookieParser());
    this.app.use(mongoSanitize());
    this.app.use(rateLimitMiddleware);
    this.app.use(apiKeyMiddleware);

    // Attach config to every request so route handlers can access collections
    this.app.use((req: any, _res, next) => {
      req.zenith = { config: this.config };
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
          { name: 'url', type: 'text' },
          { name: 'alt', type: 'text' },
          { name: 'mimetype', type: 'text' },
          { name: 'size', type: 'number' }
        ]
      } as any);
    }

    collections.forEach(col => {
      this.app.use(`/api/v1/${col.slug}`, createCollectionRouter(col, webhooks));
      logger.info(`  → /api/v1/${col.slug} (${col.fields.length} fields)`);
    });

    // ── Global/Singleton Routes ───────────────────────────────────────────────
    (this.config.globals || []).forEach(global => {
      const router = createCollectionRouter(global, webhooks);
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

  public async start(port = Number(process.env.PORT) || 3000) {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith';
      await mongoose.connect(mongoUri);
      logger.info('MongoDB connected');

      await seedInitialData();
      SchedulerService.init(this.config.collections);

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
          await mongoose.connection.close();
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
