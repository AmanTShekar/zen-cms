import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { createResponse } from './utils';
import { _AuditLogModel } from '../database/audit-model';
import { VersionModel } from '../database/version-model';
import { NotFoundError } from '../errors';
import mongoose from 'mongoose';

const router: Router = Router();
router.use(requireAuth);

/**
 * Versions API
 * ─────────────
 * Exposes version history for any document, and allows rollback.
 * Inspired by Payload's versions system.
 *
 * GET    /api/v1/versions/:collection/:id        — list versions
 * GET    /api/v1/versions/:collection/:id/:versionId — get specific version
 * POST   /api/v1/versions/:collection/:id/:versionId/restore — restore a version
 */

router.get('/:collection/:id', async (req: Request, res: Response, next) => {
  try {
    const versions = await VersionModel.find({
      collectionName: req.params.collection,
      documentId: req.params.id,
    })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.json(createResponse(versions));
  } catch (err) { next(err); }
});

router.get('/:collection/:id/:versionId', async (req: Request, res: Response, next) => {
  try {
    const version = await VersionModel.findById(req.params.versionId).lean();
    if (!version) throw new NotFoundError('Version', req.params.versionId);
    res.json(createResponse(version));
  } catch (err) { next(err); }
});

router.post('/:collection/:id/:versionId/restore', async (req: Request, res: Response, next) => {
  try {
    const version = await VersionModel.findById(req.params.versionId).lean() as unknown;
    if (!version) throw new NotFoundError('Version', req.params.versionId);

    const isGlobal = req.params.collection === 'globals';
    const modelName = isGlobal ? req.params.id : req.params.collection;
    const documentId = req.params.id;

    // Get the model for this collection/global
    const Model = mongoose.models[modelName] || mongoose.model(modelName);

    // Restore the document to the version snapshot
    const query = isGlobal ? {} : { _id: documentId };
    const restored = await Model.findOneAndUpdate(
      query,
      { $set: version.snapshot },
      { new: true, upsert: isGlobal }
    );

    if (!restored) throw new NotFoundError(modelName, documentId);

    res.json(createResponse({ message: 'Version restored successfully', document: restored }));
  } catch (err) { next(err); }
});

export default router;
