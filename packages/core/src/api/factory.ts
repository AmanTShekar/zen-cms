import { Router, Request, Response, NextFunction } from 'express';
import { CollectionConfig, WebhookTarget } from '@zenith/types';
import { DatabaseAdapter } from '../database/adapters/BaseAdapter';
import { createZodSchema } from '../schema/engine';
import { createResponse } from './utils';
import { requireAuth } from '../middleware/auth';
import { WebhookService } from '../services/webhook';
import { CacheService } from '../services/cache';
import { ContentService } from '../services/content';
import { parseQueryParams } from './query-parser';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  InvalidPayloadError,
} from '../errors';
import { eventHub } from '../services/event-hub';

/**
 * ZENITH ROUTER FACTORY: DYNAMIC ENDPOINT GENERATOR
 * ────────────────────────────────────────────────
 * Orchestrates the conversion of static schemas into high-fidelity REST 
 * endpoints. This is the primary bridge between the Schema Engine and 
 * the HTTP pipeline.
 * 
 * PERFORMANCE & SAFETY BALANCE:
 * 1. RUNTIME VALIDATION: Every payload is rigorously parsed by Zod.
 * 2. CACHE-AWARE: Integrated with the CacheService to minimize DB load.
 * 3. AUDIT-FIRST: Automatically triggers audit trails and event dispatchers.
 */
export function createCollectionRouter(
  config: CollectionConfig, 
  adapter: DatabaseAdapter, 
  webhooks: WebhookTarget[] = []
): Router {
  const router = Router();

  /**
   * LAZY CONTEXT INITIALIZATION
   * Deferring expensive Zod schema generation and Service instantiation 
   * until the first request hits this collection endpoint.
   */
  const getContext = (() => {
    let context: {
      schema: any;
      contentService: ContentService;
      cachePrefix: string;
    } | null = null;

    return () => {
      if (!context) {
        context = {
          schema: createZodSchema(config.fields, config),
          contentService: new ContentService(config, adapter),
          cachePrefix: `col:${config.slug}`
        };
      }
      return context;
    };
  })();

  // ── Access Control Helper ──────────────────────────────────────────────────
  
  const verifyAccess = (user: any, action: keyof NonNullable<CollectionConfig['access']>) => {
    if (config.publicRead && action === 'read' && !user) return;
    const accessFn = config.access?.[action];
    if (accessFn) {
      const result = accessFn(user);
      if (result === false) throw new ForbiddenError();
    }
  };

  const sanitizeFields = (doc: any, user: any, action: 'read' | 'update') => {
    if (!doc) return doc;
    const sanitized = { ...doc };
    config.fields.forEach(field => {
      if (field.access?.[action] && !field.access[action]!(user)) {
        delete sanitized[field.name];
      }
    });
    return sanitized;
  };

  // ── Authentication Middleware ──────────────────────────────────────────────

  router.use((req, res, next) => {
    if (config.publicRead && req.method === 'GET') return next();
    return requireAuth(req, res, next);
  });

  // ── Route Handlers ─────────────────────────────────────────────────────────

  router.get('/', async (req, res, next) => {
    try {
      const { contentService, cachePrefix } = getContext();
      const user = (req as any).user;
      verifyAccess(user, 'read');

      if (config.singleton) {
        const doc = await contentService.findById('singleton', { user });
        return res.json(createResponse(sanitizeFields(doc, user, 'read')));
      }

      const { filter, sort, pagination, select, populate } = parseQueryParams(req.query, config);
      const cacheKey = `${cachePrefix}:list:${JSON.stringify(req.query)}`;
      
      const cached = CacheService.get(cacheKey);
      if (cached) return res.json(cached);

      const skip = (pagination.page - 1) * pagination.pageSize;
      const [docs, total] = await Promise.all([
        contentService.find(filter, { user, sort, skip, limit: pagination.pageSize, select, populate }),
        adapter.count(config.slug, filter)
      ]);

      const response = createResponse(
        docs.map(d => sanitizeFields(d, user, 'read')),
        { pagination: { ...pagination, total, totalPages: Math.ceil(total / pagination.pageSize) } }
      );

      CacheService.set(cacheKey, response, 60, [config.slug]);
      res.json(response);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const { contentService } = getContext();
      const user = (req as any).user;
      verifyAccess(user, 'read');

      const doc = await contentService.findById(req.params.id, { user });
      if (!doc) throw new NotFoundError(config.name, req.params.id);

      res.json(createResponse(sanitizeFields(doc, user, 'read')));
    } catch (err) { next(err); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const { schema, contentService } = getContext();
      const user = (req as any).user;
      verifyAccess(user, 'create');

      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError(Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({ field: f, message: (m as string[])[0] })));
      }

      const doc = await contentService.create(validation.data, { user });

      CacheService.invalidateTag(config.slug);
      WebhookService.dispatchEvent(webhooks, `${config.slug}.created`, doc, config.slug);
      eventHub.emit('content.created', { collection: config.slug, document: doc });

      res.status(201).json(createResponse(sanitizeFields(doc, user, 'read')));
    } catch (err) { next(err); }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const { schema, contentService } = getContext();
      const user = (req as any).user;
      verifyAccess(user, 'update');

      const validation = schema.partial().safeParse(req.body);
      if (!validation.success) {
        throw new ValidationError(Object.entries(validation.error.flatten().fieldErrors).map(([f, m]) => ({ field: f, message: (m as string[])[0] })));
      }

      const { doc, delta } = await contentService.update(req.params.id, validation.data, { user });

      CacheService.invalidateTag(config.slug);
      WebhookService.dispatchEvent(webhooks, `${config.slug}.updated`, doc, config.slug);
      eventHub.emit('content.updated', { collection: config.slug, document: doc, delta });

      res.json(createResponse(sanitizeFields(doc, user, 'read')));
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const { contentService } = getContext();
      const user = (req as any).user;
      verifyAccess(user, 'delete');

      await contentService.delete(req.params.id, { user });
      CacheService.invalidateTag(config.slug);
      res.json(createResponse({ success: true }));
    } catch (err) { next(err); }
  });

  // ── Versioning & History ────────────────────────────────────────────────────

  if (config.versions) {
    router.get('/:id/versions', async (req, res, next) => {
      try {
        const versions = await adapter.getVersions(config.slug, req.params.id);
        res.json(createResponse(versions));
      } catch (err) { next(err); }
    });
  }

  // ── Custom Endpoints ────────────────────────────────────────────────────────

  if (config.endpoints) {
    config.endpoints.forEach(e => {
      router[e.method](e.path, e.handler);
    });
  }

  return router;
}
