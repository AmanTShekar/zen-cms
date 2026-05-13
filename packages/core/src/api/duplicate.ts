import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { createResponse } from './utils';
import { NotFoundError, _InvalidPayloadError } from '../errors';
import mongoose from 'mongoose';

const router: Router = Router();
router.use(requireAuth);

/**
 * Duplicate Document API
 * ──────────────────────
 * Inspired by Payload's duplicateDocument feature.
 * POST /api/v1/:collection/:id/duplicate
 * Creates a deep copy of a document with a new "_id" and clears any unique fields.
 */
router.post('/:collection/:id/duplicate', async (req: Request, res: Response, next) => {
  try {
    const { collection, id } = req.params;
    const config = (req as unknown).zenith?.config;

    const colConfig = config?.collections?.find((c: unknown) => c.slug === collection);
    if (!colConfig) throw new NotFoundError('Collection', collection);

    const Model = mongoose.model(collection);
    const original = await Model.findById(id).lean();
    if (!original) throw new NotFoundError(collection, id);

    // Strip _id, unique fields, and system timestamps to create a clean copy
    const { _id, __v, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = original as unknown;

    // Clear fields marked as unique to avoid constraint violations
    colConfig.fields.forEach((field: unknown) => {
      if (field.unique && data[field.name]) {
        data[field.name] = `${data[field.name]} (Copy)`;
      }
    });

    // If drafts are enabled, start as draft
    if (colConfig.drafts) {
      data._status = 'draft';
    }

    const duplicate = await Model.create(data);
    res.status(201).json(createResponse(duplicate));
  } catch (err) { next(err); }
});

export default router;
