import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { createResponse } from './utils';
import { InvalidPayloadError } from '../errors';
import mongoose from 'mongoose';

const router: Router = Router();
router.use(requireAuth);

/**
 * Bulk Operations API
 * ────────────────────
 * Enables efficient batch operations on collection documents.
 * Inspired by Directus's bulk update/delete endpoints.
 *
 * POST /api/v1/:collection/bulk/delete   — delete many by IDs
 * POST /api/v1/:collection/bulk/update   — update many by IDs
 * POST /api/v1/:collection/bulk/publish  — publish many by IDs
 */

router.post('/:collection/bulk/delete', async (req: Request, res: Response, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new InvalidPayloadError('"ids" array is required');
    if (ids.length > 500) throw new InvalidPayloadError('Cannot delete more than 500 documents at once');

    const Model = mongoose.model(req.params.collection);
    const result = await Model.deleteMany({ _id: { $in: ids } });

    res.json(createResponse({ deleted: result.deletedCount }));
  } catch (err) { next(err); }
});

router.post('/:collection/bulk/update', async (req: Request, res: Response, next) => {
  try {
    const { ids, data } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new InvalidPayloadError('"ids" array is required');
    if (!data || typeof data !== 'object') throw new InvalidPayloadError('"data" object is required');
    if (ids.length > 500) throw new InvalidPayloadError('Cannot update more than 500 documents at once');

    const Model = mongoose.model(req.params.collection);
    const result = await Model.updateMany({ _id: { $in: ids } }, { $set: data });

    res.json(createResponse({ updated: result.modifiedCount }));
  } catch (err) { next(err); }
});

router.post('/:collection/bulk/publish', async (req: Request, res: Response, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) throw new InvalidPayloadError('"ids" array is required');

    const Model = mongoose.model(req.params.collection);
    const result = await Model.updateMany(
      { _id: { $in: ids } },
      { $set: { _status: 'published', publishedAt: new Date() } }
    );

    res.json(createResponse({ published: result.modifiedCount }));
  } catch (err) { next(err); }
});

export default router;
