import { Router, Request, Response } from 'express';
import { UserPreferenceModel } from '../database/preference-model';
import { requireAuth } from '../middleware/auth';
import { createResponse } from './utils';
import { NotFoundError, InvalidPayloadError } from '../errors';

const router: Router = Router();
router.use(requireAuth);

/**
 * User Preferences API
 * ─────────────────────
 * Lets the admin UI persist per-user settings (column order, sort, theme, etc.)
 *
 * GET  /api/v1/preferences/:key      — get one preference
 * POST /api/v1/preferences/:key      — upsert a preference
 * DELETE /api/v1/preferences/:key    — delete a preference
 */

router.get('/:key', async (req: Request, res: Response, next) => {
  try {
    const pref = await UserPreferenceModel.findOne({
      userId: (req as any).user.id,
      key: req.params.key,
    });
    if (!pref) throw new NotFoundError('Preference', req.params.key);
    res.json(createResponse({ key: pref.key, value: pref.value }));
  } catch (err) { next(err); }
});

router.post('/:key', async (req: Request, res: Response, next) => {
  try {
    const { value } = req.body;
    if (value === undefined) throw new InvalidPayloadError('"value" is required');

    const pref = await UserPreferenceModel.findOneAndUpdate(
      { userId: (req as any).user.id, key: req.params.key },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(createResponse({ key: pref.key, value: pref.value }));
  } catch (err) { next(err); }
});

router.delete('/:key', async (req: Request, res: Response, next) => {
  try {
    await UserPreferenceModel.deleteOne({
      userId: (req as any).user.id,
      key: req.params.key,
    });
    res.json(createResponse({ success: true }));
  } catch (err) { next(err); }
});

export default router;
