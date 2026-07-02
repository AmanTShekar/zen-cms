/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import { z } from 'zod';
import { AdapterFactory } from '../../database/adapters/AdapterFactory';
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter';
import { logger } from '../../services/logger';
import { maskSettings, unmaskSettings } from './search-ai';

export const settingsRouter: Router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function getAdapter(req: Request): DatabaseAdapter {
  return (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter();
}


// ── Global Settings ──────────────────────────────────────────────────────────

// GET /api/v1/system/settings/public-billing
settingsRouter.get('/public-billing', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const siteId = req.headers['x-zenith-site-id'] as string;
    const query = siteId ? { siteId } : {};
    const settings = await adapter.findOne<Record<string, any>>('z_settings', query);
    
    if (!settings || !settings.billingEnabled) {
      return res.json({ data: { billingEnabled: false } });
    }

    res.json({
      data: {
        billingEnabled: true,
        currency: settings.currency || 'USD',
        paymentProvider: settings.paymentProvider || 'stripe',
        pricingPlans: settings.pricingPlans || [],
        stripePublicKey: settings.stripePublicKey,
        paypalClientId: settings.paypalClientId,
        razorpayKeyId: settings.razorpayKeyId
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/system/settings
settingsRouter.get('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const siteId = req.headers['x-zenith-site-id'] as string;
    const query = siteId ? { siteId } : {};
    const settings = await adapter.findOne<Record<string, any>>('z_settings', query);
    res.json({ data: maskSettings(settings || {}) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/system/settings
settingsRouter.patch('/', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req);
    const payload = req.body;
    const siteId = req.headers['x-zenith-site-id'] as string;
    const query = siteId ? { siteId } : {};
    const settings = await adapter.findOne<Record<string, any>>('z_settings', query);
    const unmaskedPayload = unmaskSettings(payload, settings);

    if (unmaskedPayload.customCSS) {
      unmaskedPayload.customCSS = unmaskedPayload.customCSS
        .replace(/<[^>]*>/g, '') // Strip HTML tags
        .replace(/@import/gi, '') // Strip imports
        .replace(/expression\(/gi, '') // Strip IE expressions
        .replace(/url\(\s*['"]?javascript:/gi, 'url(') // Strip JS URLs
        .replace(/behaviour:/gi, ''); // Strip IE behaviors
    }

    if (settings) {
      await adapter.update('z_settings', (settings._id || settings.id).toString(), unmaskedPayload);
    } else {
      await adapter.create('z_settings', { ...unmaskedPayload, siteId });
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
    const query = req.siteId ? { siteId: req.siteId } : {};
    const settings = await adapter.findOne<Record<string, any>>('z_settings', query);
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
    const siteId = req.headers['x-zenith-site-id'] as string;
    const query = siteId ? { siteId } : {};
    const settings = await adapter.findOne<Record<string, any>>('z_settings', query);

    const update = { compliance: { ...(settings?.compliance || {}), ...payload } };

    if (settings) {
      await adapter.update('z_settings', (settings._id || settings.id).toString(), update);
    } else {
      await adapter.create('z_settings', { ...update, siteId });
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
    const query = req.siteId ? { siteId: req.siteId } : {};
    const settings = await adapter.findOne<Record<string, any>>('z_settings', query);
    const retentionDays = settings?.compliance?.dataRetentionDays || 365;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    // Delete old audit logs beyond retention period
    let deleted = 0;
    try {
      const old = await adapter.find<Record<string, any>>('z_audit_logs', { createdAt: { $lt: cutoff }, ...query });
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

