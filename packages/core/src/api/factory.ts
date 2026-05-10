import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { CollectionConfig, WebhookTarget } from '@zenith/types';
import { createZodSchema } from '../schema/engine';
import { createResponse } from './utils';
import { getModelForCollection } from '../database/model-factory';
import { requireAuth, validateObjectId } from '../middleware/auth';
import { WebhookService } from '../services/webhook';
import { CacheService } from '../services/cache';
import { logger } from '../services/logger';
import { AuditLogModel } from '../database/audit-model';
import { VersionModel } from '../database/version-model';
import { ContentService } from '../services/content';
import { parseQueryParams } from './query-parser';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  InvalidPayloadError,
} from '../errors';
import { eventHub } from '../services/event-hub';
import { AuthService } from '../services/auth';

/**
 * Zenith CMS — Collection CRUD Router Factory
 * ─────────────────────────────────────────────
 * Auto-generates a fully-featured REST router for any CollectionConfig.
 * Features: Versioning, Audit Logs, Caching, Webhooks, EventHub.
 * (Transactions disabled for maximum local dev compatibility)
 */
export function createCollectionRouter(config: CollectionConfig, webhooks: WebhookTarget[] = []): Router {
  const router: Router = Router();
  const schema = createZodSchema(config.fields, config);
  const Model = getModelForCollection(config);
  const contentService = new ContentService(config, Model);
  const cachePrefix = `col:${config.slug}`;

  // ── Helpers ────────────────────────────────────────────────────────────────

  const filterFields = (doc: any, user: any, action: 'read' | 'update') => {
    if (!doc) return doc;
    const out = { ...doc };
    for (const field of config.fields) {
      if (field.access?.[action] && !field.access[action]!(user)) {
        delete out[field.name];
      }
    }
    return out;
  };

  const auditLog = async (req: Request, action: string, docId?: string, changes?: any) => {
    try {
      const user = (req as any).user;
      await AuditLogModel.create({
        userId: user.id,
        userEmail: user.email,
        action,
        collectionName: config.slug,
        documentId: docId,
        changes,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (err) {
      logger.error({ err }, 'Audit log write failed');
    }
  };

  const checkAccess = (user: any, action: 'read' | 'create' | 'update' | 'delete') => {
    if (config.publicRead && action === 'read' && !user) return;
    const fn = config.access?.[action];
    if (!fn) return; // no restriction
    const result = fn(user);
    if (result === false) throw new ForbiddenError();
  };

  // Authentication & Access Control Middleware
  router.use((req: Request, res: Response, next: NextFunction) => {
    // If public read is enabled and this is a GET request, allow without auth
    if (config.publicRead && req.method === 'GET') {
      // Attempt to identify user if token is present, but don't require it
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = AuthService.verifyToken(token);
        if (decoded) (req as any).user = decoded;
      }
      return next();
    }
    
    // Otherwise, strictly require authentication
    return requireAuth(req, res, next);
  });

  // ── GET / — List ─────────────────────────────────────────────────────────
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'read');

      // Singletons return the first (and only) document
      if (config.singleton) {
        const doc = await Model.findOne().lean().exec();
        return res.json(createResponse(filterFields(doc, (req as any).user, 'read')));
      }

      const { filter, sort, pagination, select, populate } = parseQueryParams(req.query, config);
      const cacheKey = `${cachePrefix}:list:${JSON.stringify(req.query)}`;
      const cached = CacheService.get(cacheKey);
      if (cached) return res.json(cached);

      const skip = (pagination.page - 1) * pagination.pageSize;

      let query = Model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(pagination.pageSize)
        .lean();

      if (select) (query as any).select(select);
      if (populate.length) {
        populate.forEach(p => (query as any).populate(p));
      } else {
        config.fields
          .filter(f => f.type === 'relation')
          .forEach(f => (query as any).populate(f.name));
      }

      const [rawData, total] = await Promise.all([
        query.exec(),
        Model.countDocuments(filter),
      ]);

      const data = rawData.map(doc => filterFields(doc, (req as any).user, 'read'));
      const totalPages = Math.ceil(total / pagination.pageSize);
      const response = createResponse(data, {
        pagination: { page: pagination.page, pageSize: pagination.pageSize, total, totalPages },
      });

      CacheService.set(cacheKey, response, 60, [config.slug]);
      res.json(response);
    } catch (err) { next(err); }
  });

  // ── GET /:id — Find one ───────────────────────────────────────────────────
  router.get('/:id', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'read');

      const cacheKey = `${cachePrefix}:${req.params.id}`;
      const cached = CacheService.get(cacheKey);
      if (cached) return res.json(cached);

      const doc = await contentService.findById(req.params.id, { user: (req as any).user });
      if (!doc) throw new NotFoundError(config.name, req.params.id);

      const response = createResponse(filterFields(doc, (req as any).user, 'read'));
      CacheService.set(cacheKey, response, 60, [config.slug]);
      res.json(response);
    } catch (err) { next(err); }
  });

  // ── GET /kanban — Grouped items for Kanban boards ────────────────────────
  if (!config.singleton) {
    router.get('/kanban', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const groupBy = req.query.groupBy as string;
        if (!groupBy) throw new InvalidPayloadError('?groupBy parameter is required');

        // Check if the field exists in schema or is _status
        const isValidField = groupBy === '_status' || config.fields.some(f => f.name === groupBy);
        if (!isValidField) throw new InvalidPayloadError(`Cannot group by unknown field: ${groupBy}`);

        // We use an aggregation pipeline to group the documents
        const pipeline: any[] = [
          { $match: {} }, // Base match can include access control later
          { $sort: { updatedAt: -1 } },
          { $group: {
              _id: `$${groupBy}`,
              items: { $push: '$$ROOT' },
              count: { $sum: 1 }
            }
          },
          { $project: {
              _id: 0,
              column: '$_id',
              count: 1,
              items: { $slice: ['$items', 0, 50] } // Limit to 50 per column for performance
            }
          }
        ];

        const results = await Model.aggregate(pipeline).exec();
        
        // Format as an object: { "draft": { count: 1, items: [...] } }
        const board: Record<string, any> = {};
        results.forEach(group => {
          const key = group.column || 'Uncategorized';
          board[String(key)] = {
            count: group.count,
            items: group.items
          };
        });

        res.json(createResponse(board));
      } catch (err) { next(err); }
    });
  }

  // ── POST / — Create ───────────────────────────────────────────────────────
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'create');

      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        const errors = Object.entries(validation.error.flatten().fieldErrors).map(
          ([field, msgs]) => ({ field, message: (msgs as string[])[0] })
        );
        throw new ValidationError(errors);
      }

      const doc = await contentService.create(validation.data, {
        user: (req as any).user,
      });

      await auditLog(req, 'create', doc._id.toString(), validation.data);

      CacheService.invalidateTag(config.slug);
      WebhookService.dispatchEvent(webhooks, `${config.slug}.created`, doc.toObject(), config.slug);
      await eventHub.emit('content.created', { collection: config.slug, document: doc.toObject() });

      res.status(201).json(createResponse(filterFields(doc.toObject(), (req as any).user, 'read')));
    } catch (err) {
      next(err);
    }
  });

  // ── POST /bulk-update — Update multiple documents ────────────────────────
  router.post('/bulk-update', async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'update');
      const { ids, data } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new InvalidPayloadError('Property "ids" must be a non-empty array');
      }

      const results = await Promise.all(ids.map(id => 
        contentService.update(id, data, { user: (req as any).user })
      ));

      CacheService.invalidateTag(config.slug);
      res.json(createResponse({ updatedCount: results.length }));
    } catch (err) { next(err); }
  });

  // ── POST /bulk-delete — Delete multiple documents ────────────────────────
  router.post('/bulk-delete', async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'delete');
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new InvalidPayloadError('Property "ids" must be a non-empty array');
      }

      const results = await Promise.all(ids.map(id => 
        contentService.delete(id, { user: (req as any).user })
      ));

      CacheService.invalidateTag(config.slug);
      res.json(createResponse({ deletedCount: results.length }));
    } catch (err) { next(err); }
  });

  // ── PATCH /:id — Partial update ───────────────────────────────────────────
  router.patch('/:id', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'update');

      // Use partial schema for PATCH (not all fields required)
      const validation = schema.partial().safeParse(req.body);
      if (!validation.success) {
        const errors = Object.entries(validation.error.flatten().fieldErrors).map(
          ([field, msgs]) => ({ field, message: (msgs as string[])[0] })
        );
        throw new ValidationError(errors);
      }

      const { doc, delta } = await contentService.update(req.params.id, validation.data, {
        user: (req as any).user,
      });

      await auditLog(req, 'update', req.params.id, delta);

      CacheService.invalidateTag(config.slug);
      WebhookService.dispatchEvent(webhooks, `${config.slug}.updated`, doc.toObject(), config.slug);
      await eventHub.emit('content.updated', { collection: config.slug, document: doc.toObject(), delta });

      res.json(createResponse(filterFields(doc.toObject(), (req as any).user, 'read')));
    } catch (err) {
      next(err);
    }
  });

  // ── PUT /:id — Full replace ───────────────────────────────────────────────
  router.put('/:id', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'update');

      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        const errors = Object.entries(validation.error.flatten().fieldErrors).map(
          ([field, msgs]) => ({ field, message: (msgs as string[])[0] })
        );
        throw new ValidationError(errors);
      }

      const { doc, delta } = await contentService.update(req.params.id, validation.data, {
        user: (req as any).user,
      });

      await auditLog(req, 'update', req.params.id, delta);

      CacheService.invalidateTag(config.slug);
      WebhookService.dispatchEvent(webhooks, `${config.slug}.updated`, doc.toObject(), config.slug);
      await eventHub.emit('content.updated', { collection: config.slug, document: doc.toObject(), delta });

      res.json(createResponse(filterFields(doc.toObject(), (req as any).user, 'read')));
    } catch (err) {
      next(err);
    }
  });

  // ── DELETE /:id ───────────────────────────────────────────────────────────
  router.delete('/:id', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
    try {
      checkAccess((req as any).user, 'delete');

      await contentService.delete(req.params.id, { user: (req as any).user });
      await auditLog(req, 'delete', req.params.id, null);

      res.json(createResponse({ success: true }));
    } catch (err) {
      next(err);
    }
  });

  // ── POST /:id/publish — Draft → Published ─────────────────────────────────
  if (config.drafts) {
    router.post('/:id/publish', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
      try {
        checkAccess((req as any).user, 'update');
        const doc = await Model.findByIdAndUpdate(
          req.params.id,
          { $set: { _status: 'published', publishedAt: new Date() } },
          { new: true }
        );
        if (!doc) throw new NotFoundError(config.name, req.params.id);

        CacheService.invalidateTag(config.slug);
        WebhookService.dispatchEvent(webhooks, `${config.slug}.published`, doc.toObject(), config.slug);
        await eventHub.emit('content.published', { collection: config.slug, document: doc.toObject() });

        res.json(createResponse(doc));
      } catch (err) { next(err); }
    });

    router.post('/:id/unpublish', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
      try {
        checkAccess((req as any).user, 'update');
        const doc = await Model.findByIdAndUpdate(
          req.params.id,
          { $set: { _status: 'draft' }, $unset: { publishedAt: 1 } },
          { new: true }
        );
        if (!doc) throw new NotFoundError(config.name, req.params.id);
        CacheService.invalidateTag(config.slug);
        res.json(createResponse(doc));
      } catch (err) { next(err); }
    });
  }

  // ── GET /:id/versions & POST /:id/rollback/:versionId ─────────────────────
  if (config.versions) {
    router.get('/:id/versions', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const versions = await VersionModel
          .find({ collectionSlug: config.slug, documentId: req.params.id })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
          .exec();
        res.json(createResponse(versions));
      } catch (err) { next(err); }
    });

    router.post('/:id/rollback/:versionId', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const version = await VersionModel.findById(req.params.versionId).lean().exec();
        if (!version) throw new NotFoundError('Version', req.params.versionId);
        const { doc } = await contentService.update(req.params.id, (version as any).snapshot, {
          user: (req as any).user,
          skipVersioning: true,
        });
        CacheService.invalidateTag(config.slug);
        res.json(createResponse(doc));
      } catch (err) { next(err); }
    });

    router.get('/:id/versions/:versionId/diff', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
      try {
        const version = await VersionModel.findById(req.params.versionId).lean().exec();
        if (!version) throw new NotFoundError('Version', req.params.versionId);
        
        const currentDoc = await Model.findById(req.params.id).lean().exec();
        if (!currentDoc) throw new NotFoundError(config.name, req.params.id);

        const diffLib = await import('diff');
        const diffs: Record<string, any> = {};

        // Compare text fields (like title, description, content)
        for (const field of config.fields) {
          if (['text', 'textarea', 'richtext', 'json'].includes(field.type)) {
            const oldVal = (version as any).snapshot[field.name] || '';
            const newVal = (currentDoc as any)[field.name] || '';
            
            if (oldVal !== newVal) {
              diffs[field.name] = diffLib.diffWordsWithSpace(String(oldVal), String(newVal));
            }
          } else {
            // Basic inequality for other fields
            const oldVal = (version as any).snapshot[field.name];
            const newVal = (currentDoc as any)[field.name];
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
               diffs[field.name] = diffLib.diffJson(oldVal, newVal);
            }
          }
        }

        res.json(createResponse(diffs));
      } catch (err) { next(err); }
    });
  }

  // ── GET /:id/history — Document audit trail ───────────────────────────────
  router.get('/:id/history', validateObjectId, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await AuditLogModel
        .find({ collectionName: config.slug, documentId: req.params.id })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean()
        .exec();
      res.json(createResponse(logs));
    } catch (err) { next(err); }
  });

  // ── Custom Endpoints ──────────────────────────────────────────────────────
  if (config.endpoints) {
    config.endpoints.forEach(endpoint => {
      router[endpoint.method](endpoint.path, endpoint.handler);
    });
  }

  return router;
}
