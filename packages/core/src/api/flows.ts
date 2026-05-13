import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { FlowModel } from '../database/flow-model';
import { createResponse } from './utils';
import { NotFoundError } from '../errors';

const router: Router = Router();

// ── GET /api/v1/flows ────────────────────────────────────────────────────────
router.get('/', requireAuth, async (_req: Request, res: Response, next) => {
  try {
    const flows = await FlowModel.find().sort({ createdAt: -1 }).lean();
    res.json(createResponse(flows));
  } catch (err) { next(err); }
});

// ── GET /api/v1/flows/:id ────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const flow = await FlowModel.findById(req.params.id).lean();
    if (!flow) throw new NotFoundError('Flow', req.params.id);
    res.json(createResponse(flow));
  } catch (err) { next(err); }
});

// ── POST /api/v1/flows ───────────────────────────────────────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const flow = await FlowModel.create(req.body);
    res.status(201).json(createResponse(flow));
  } catch (err) { next(err); }
});

// ── PATCH /api/v1/flows/:id ──────────────────────────────────────────────────
router.patch('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const flow = await FlowModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!flow) throw new NotFoundError('Flow', req.params.id);
    res.json(createResponse(flow));
  } catch (err) { next(err); }
});

// ── DELETE /api/v1/flows/:id ─────────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const flow = await FlowModel.findByIdAndDelete(req.params.id);
    if (!flow) throw new NotFoundError('Flow', req.params.id);
    res.json(createResponse({ success: true }));
  } catch (err) { next(err); }
});

export default router;
