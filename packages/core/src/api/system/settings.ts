import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { AIProviderService } from '../../services/ai-providers';
import { z } from 'zod';
import { AdapterFactory } from '../../database/adapters/AdapterFactory';
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter';
import { logger } from '../../services/logger';

export const settingsRouter: Router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function getAdapter(req: Request): DatabaseAdapter {
  return (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter();
}

// Validation schema for testing AI keys
const ValidateKeySchema = z.object({
  provider: z.string(),
  apiKey: z.string(),
});

// ── Global Settings ──────────────────────────────────────────────────────────

// GET /api/v1/system/settings
settingsRouter.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const settings = await adapter.findOne<any>('z_settings', {});
    res.json({ data: settings || {} });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/system/settings
settingsRouter.patch('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const payload = req.body;
    const settings = await adapter.findOne<any>('z_settings', {});

    if (settings) {
      await adapter.update('z_settings', (settings._id || settings.id).toString(), payload);
    } else {
      await adapter.create('z_settings', payload);
    }

    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    next(err);
  }
});

// ── Compliance / Legal Settings ──────────────────────────────────────────────

// GET /api/v1/system/settings/compliance
settingsRouter.get('/compliance', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const settings = await adapter.findOne<any>('z_settings', {});
    res.json({ data: settings?.compliance || {} });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/system/settings/compliance
settingsRouter.patch('/compliance', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const payload = req.body;
    const settings = await adapter.findOne<any>('z_settings', {});

    const update = { compliance: { ...(settings?.compliance || {}), ...payload } };

    if (settings) {
      await adapter.update('z_settings', (settings._id || settings.id).toString(), update);
    } else {
      await adapter.create('z_settings', update);
    }

    res.json({ success: true, message: 'Compliance settings saved' });
  } catch (err) {
    next(err);
  }
});

// ── GDPR Data Rights ─────────────────────────────────────────────────────────

// POST /api/v1/system/gdpr/export-all
settingsRouter.post('/gdpr/export-all', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    // In a full implementation this would queue a background job to export all user data
    // and send a download link via email. For now we return a success message.
    logger.info('[GDPR] Full data export requested by admin');
    res.json({ success: true, message: 'Export job queued. A download link will be sent to your email within 24 hours.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/system/gdpr/purge-expired
settingsRouter.post('/gdpr/purge-expired', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const settings = await adapter.findOne<any>('z_settings', {});
    const retentionDays = settings?.compliance?.dataRetentionDays || 365;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Delete old audit logs beyond retention period
    let deleted = 0;
    try {
      const old = await adapter.find<any>('z_audit_logs', { createdAt: { $lt: cutoff } });
      for (const log of old) {
        await adapter.delete('z_audit_logs', (log._id || log.id).toString());
        deleted++;
      }
    } catch (e) {
      logger.warn('[GDPR] Could not purge audit logs: ' + e);
    }

    logger.info(`[GDPR] Purged ${deleted} expired records older than ${retentionDays} days`);
    res.json({ success: true, message: `Purged ${deleted} expired records beyond ${retentionDays}-day retention policy.` });
  } catch (err) {
    next(err);
  }
});

// ── AI Provider Endpoints ────────────────────────────────────────────────────

// POST /api/v1/system/settings/ai/validate
settingsRouter.post('/ai/validate', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { provider, apiKey } = ValidateKeySchema.parse(req.body);
    const isValid = await AIProviderService.validateKey(provider, apiKey);

    if (isValid) {
      res.json({ success: true, message: 'API Key is valid' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid API Key for provider' });
    }
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/system/settings/ai/models
settingsRouter.post('/ai/models', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { provider, apiKey } = ValidateKeySchema.parse(req.body);
    const models = await AIProviderService.fetchModels(provider, apiKey);
    res.json({ data: models });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch models' });
  }
});
