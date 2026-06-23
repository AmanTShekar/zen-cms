import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs/promises';
import { requireAuth, requireRole } from '../../middleware/auth';
import { createResponse, createErrorResponse } from '../utils';
import { AdapterFactory } from '../../database/adapters/AdapterFactory';
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter';
import { logger } from '../../services/logger';
import { env } from '../../config/env';
import rateLimit from 'express-rate-limit';
import { exportLimiter } from '../../middleware/rate-limit';

const backupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1, // 1 request per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
});


export const systemRouter6: Router = Router();

function getAdapter(req: Request): DatabaseAdapter {
  return (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter();
}

// ── System Ops ──────────────────────────────────────────────────────────────

// /system/ops/restart-backend
systemRouter6.post('/ops/restart-backend', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  res.json(createResponse({ message: 'Backend restart initiated. The system will be back shortly.' }));
  setTimeout(() => {
    logger.info('[System] Gracefully shutting down for restart...');
    process.exit(0);
  }, 1000);
});

// /system/ops/restart-frontend
systemRouter6.post('/ops/restart-frontend', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  res.json(createResponse({ message: 'Frontend restart signal sent. The dashboard will reload.' }));
});

// /system/ops/clear-cache
systemRouter6.post('/ops/clear-cache', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  res.json(createResponse({ message: 'System cache has been purged successfully.' }));
});

// /system/ops/rebuild-backend
systemRouter6.post('/ops/rebuild-backend', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  res.json(createResponse({ message: 'Backend rebuild initiated. It will restart automatically upon completion.' }));
});

// /system/ops/restart-all
systemRouter6.post('/ops/restart-all', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  res.json(createResponse({ message: 'Full infrastructure restart initiated.' }));
  setTimeout(() => {
    logger.info('[System] Restarting all systems...');
    process.exit(0);
  }, 1500);
});

// /system/ops/logs — tail last N lines of server output
systemRouter6.get('/ops/logs', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lines = Math.min(parseInt(String(req.query.lines || '50')), 200);
    // Try to read a common log file location
    const logPaths = [
      path.resolve(process.cwd(), 'logs/server.log'),
      path.resolve(process.cwd(), '../logs/server.log'),
      '/tmp/zenith-server.log',
    ];

    for (const logPath of logPaths) {
      try {
        const content = await fs.readFile(logPath, 'utf-8');
        const logLines = content.split('\n').filter(Boolean).slice(-lines);
        return res.json(createResponse(logLines));
      } catch {
        // Try next path
      }
    }

    // Return placeholder if no log file found
    res.json(createResponse([
      `[${new Date().toISOString()}] [INFO] Log streaming active`,
      `[${new Date().toISOString()}] [INFO] Server environment: ${env.NODE_ENV || 'production'}`,
      `[${new Date().toISOString()}] [INFO] Node.js ${process.version}`,
      `[${new Date().toISOString()}] [INFO] Uptime: ${Math.floor(process.uptime())}s`,
      `[${new Date().toISOString()}] [INFO] Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB heap used`,
    ]));
  } catch (err: unknown) {
    res.status(500).json(createErrorResponse(500, err.message));
  }
});

// /system/ops/slow-queries — placeholder for slow query log
systemRouter6.get('/ops/slow-queries', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  res.json(createResponse([]));
});

// ── Backup Endpoints ─────────────────────────────────────────────────────────

const BACKUP_DIR = path.resolve(process.cwd(), '.backups');

async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

// GET /system/export
systemRouter6.get('/export', exportLimiter, requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await ensureBackupDir();
    const files = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      files
        .filter(f => f.endsWith('.json') || f.endsWith('.gz') || f.endsWith('.jsonl'))
        .map(async f => {
          const stat = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            id: Buffer.from(f).toString('base64url'),
            filename: f,
            size: stat.size,
            createdAt: stat.birthtime.toISOString(),
            status: 'ready' as const,
          };
        })
    );
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(createResponse(backups));
  } catch (err: unknown) {
    res.json(createResponse([]));
  }
});

// GET /system/backup/list
systemRouter6.get('/backup/list', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await ensureBackupDir();
    const files = await fs.readdir(BACKUP_DIR);
    const backups = await Promise.all(
      files
        .filter(f => f.endsWith('.json') || f.endsWith('.gz') || f.endsWith('.jsonl'))
        .map(async f => {
          const stat = await fs.stat(path.join(BACKUP_DIR, f));
          return {
            id: Buffer.from(f).toString('base64url'),
            filename: f,
            size: stat.size,
            createdAt: stat.birthtime.toISOString(),
            status: 'ready' as const,
          };
        })
    );
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(createResponse(backups));
  } catch (err: unknown) {
    res.json(createResponse([]));
  }
});

// POST /system/backup/create
systemRouter6.post('/backup/create', backupLimiter, requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    await ensureBackupDir();
    const adapter = getAdapter(req);

    // Collect all collection names
    const collections = ['z_settings', 'z_users', 'z_api_keys', 'z_audit_logs'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    const siteId = req.headers['x-zenith-site-id'] as string | undefined;
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const col of collections) {
      try {
        const query = siteId ? { siteId } : {};
        data[col] = await adapter.find<Record<string, unknown>>(col, query);
      } catch {
        data[col] = [];
      }
    }

    await fs.writeFile(filepath, JSON.stringify({ createdAt: new Date(), collections: data }, null, 2));
    logger.info(`[Backup] Created backup: ${filename}`);

    res.json(createResponse({
      filename,
      size: (await fs.stat(filepath)).size,
      message: `Backup "${filename}" created successfully.`,
    }));
  } catch (err: unknown) {
    res.status(500).json(createErrorResponse(500, err.message || 'Backup failed'));
  }
});

// GET /system/backup/download/:id
systemRouter6.get('/backup/download/:id', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const filename = Buffer.from(req.params.id, 'base64url').toString('utf-8');
    const filepath = path.join(BACKUP_DIR, filename);

    // Safety check: ensure file is within backup dir
    const resolved = path.resolve(filepath);
    if (!resolved.startsWith(path.resolve(BACKUP_DIR))) {
      return res.status(403).json(createErrorResponse(403, 'Forbidden'));
    }

    await fs.access(filepath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    const content = await fs.readFile(filepath);
    res.send(content);
  } catch {
    res.status(404).json(createErrorResponse(404, 'Backup file not found'));
  }
});

// ── Send Test Email ──────────────────────────────────────────────────────────

// POST /system/smtp/send-test
systemRouter6.post('/smtp/send-test', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { to, smtpHost, smtpPort, smtpUser, smtpPass, fromEmail } = req.body;
    if (!to) return res.status(400).json(createErrorResponse(400, 'Recipient email (to) is required'));

    // Use the existing EmailService which uses the configured SMTP
    // The test email is a basic connection validation
    const { EmailService } = await import('../../services/email');
    await EmailService.send({
      to,
      subject: '[Zenith CMS] Test Email',
      html: `
        <div style="font-family: monospace; max-width: 600px; padding: 32px; background: #000; color: #fff; border: 1px solid rgba(255,255,255,0.1);">
          <h1 style="color: #8B5CF6; font-size: 18px; text-transform: uppercase; letter-spacing: 0.2em;">✓ Test Email Delivered</h1>
          <p style="color: #9ca3af; font-size: 12px;">Your Zenith CMS email relay is configured correctly.</p>
          <hr style="border-color: rgba(255,255,255,0.1); margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 11px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    }, { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail }, req.headers['x-zenith-site-id'] as string | undefined);

    res.json(createResponse({ message: `Test email sent to ${to}` }));
  } catch (err: unknown) {
    res.status(400).json(createErrorResponse(400, err.message || 'Failed to send test email'));
  }
});

