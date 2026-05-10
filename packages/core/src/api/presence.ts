import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { createResponse } from './utils';
import { PresenceService } from '../services/presence';
import { InvalidPayloadError } from '../errors';

const router: Router = Router();
router.use(requireAuth);

/**
 * Zenith Presence / Content Locking API
 * ──────────────────────────────────────────────────────────────────
 * Tells editors who else is viewing or editing the same document.
 * Prevents conflicting edits ("Sarah is editing this").
 *
 * POST /api/v1/presence/heartbeat   — "I'm still editing this doc"
 * GET  /api/v1/presence/:collection/:id — Who else is here?
 * DELETE /api/v1/presence/:collection/:id — I'm done editing
 */

router.post('/heartbeat', async (req: Request, res: Response, next) => {
  try {
    const { collection, documentId } = req.body;
    if (!collection || !documentId) {
      throw new InvalidPayloadError('"collection" and "documentId" are required');
    }

    const user = (req as any).user;
    await PresenceService.heartbeat(user.id, user.email, collection, documentId);
    res.json(createResponse({ ok: true }));
  } catch (err) { next(err); }
});

router.get('/:collection/:id', async (req: Request, res: Response, next) => {
  try {
    const users = await PresenceService.getActiveUsers(req.params.collection, req.params.id);
    const currentUserId = (req as any).user.id;

    // Filter out the current user from the response (they know they're here)
    const others = users.filter(u => u.id !== currentUserId);

    res.json(createResponse({
      isLocked: others.length > 0,
      activeUsers: others,
      message: others.length > 0
        ? `${others.map(u => u.email?.split('@')[0]).join(', ')} ${others.length === 1 ? 'is' : 'are'} also editing this document`
        : null,
    }));
  } catch (err) { next(err); }
});

router.delete('/:collection/:id', async (req: Request, res: Response, next) => {
  try {
    // The NodeCache TTL will expire the presence automatically,
    // but we can call leave immediately for a snappier UX
    const user = (req as any).user;
    await PresenceService.leave(user.id, req.params.collection, req.params.id);
    res.json(createResponse({ ok: true }));
  } catch (err) { next(err); }
});

export default router;
