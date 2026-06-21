import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from '../services/logger'
import fs from 'fs'
import path from 'path'
import type { AuditLogData } from '@zenith-open/zenithcms-types'
import { env } from '../config/env';


// ── Sensitive field patterns to redact from audit logs ────────────────────
const SENSITIVE_FIELDS = new Set([
  'password', 'newPassword', 'confirmPassword', 'currentPassword',
  'token', 'refreshToken', 'accessToken', 'apiKey', 'secret',
  'stripeSecretKey', 'stripePublicKey', 'stripeWebhookSecret',
  'authorization', 'x-api-key', 'x-csrf-token',
])

function redactSensitive(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(redactSensitive)
  const cleaned: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_FIELDS.has(key)) {
      cleaned[key] = '[REDACTED]'
    } else if (typeof val === 'object' && val !== null) {
      cleaned[key] = redactSensitive(val)
    } else {
      cleaned[key] = val
    }
  }
  return cleaned
}

// ── Extract document ID from URL path ────────────────────────────────────
// Matches patterns like /api/v1/posts/abc123 or /api/v1/posts/abc123/relations
function extractDocumentId(url: string): string | undefined {
  const match = url.match(/\/api\/v1\/[^/]+\/([a-f0-9]{24}|[a-f0-9-]{36}|[A-Za-z0-9_-]{20,})/i)
  return match ? match[1] : undefined
}

// ── Extract clean collection name from URL ───────────────────────────────
function extractCollectionName(url: string): string {
  const match = url.match(/\/api\/v1\/([^/?]+)/)
  return match ? match[1] : url
}

// ── Audit hash chain ─────────────────────────────────────────────────────
let lastAuditHash: string | null = null

async function getLastAuditHash(): Promise<string | null> {
  if (lastAuditHash) return lastAuditHash
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    if (adapter?.name === 'mongoose') {
      const { default: mongoose } = await import('mongoose')
      const last = await mongoose.models['AuditLog']?.findOne({}).sort({ timestamp: -1 }).select('hash').lean().exec()
      if (last) lastAuditHash = (last as any).hash
    } else {
      // For Postgres, read from the audit_logs table directly
      const { sql, desc, eq } = await import('drizzle-orm')
      if ((adapter as any).db && (adapter as any).systemTables?.auditLog) {
        try {
          const result = await (adapter as any).db.select({ h: (adapter as any).systemTables.auditLog.hash })
            .from((adapter as any).systemTables.auditLog)
            .orderBy(desc((adapter as any).systemTables.auditLog.timestamp))
            .limit(1)
          if (result.length > 0 && result[0].h) lastAuditHash = result[0].h
        } catch {
          // Table may not exist yet
        }
      }
    }
  } catch {
    // Ignore errors — hash chain starts from genesis
  }
  return lastAuditHash
}

function computeAuditHash(entry: AuditLogData, previousHash: string | null): string {
  const secret = process.env.AUDIT_HASH_SECRET
  if (!secret) {
    if (env.NODE_ENV === 'production') {
      logger.error('AUDIT_HASH_SECRET is required in production. Audit chain integrity is compromised. Failing fast.')
      throw new Error('AUDIT_HASH_SECRET must be set in production.')
    }
    logger.warn('AUDIT_HASH_SECRET is not set — audit chain integrity is compromised. Set this environment variable in production.')
  }
  const payload = JSON.stringify({ ...entry, previousHash }) + (secret || '')
  return crypto.createHash('sha256').update(payload).digest('hex')
}

// ── Webhook forwarder with retry ─────────────────────────────────────────
const WEBHOOK_RETRY_MAX = 3
const WEBHOOK_RETRY_DELAY_MS = 1000

async function forwardToWebhook(logEntry: AuditLogData, attempt = 1): Promise<boolean> {
  const forwardUrl = process.env.AUDIT_FORWARD_WEBHOOK_URL
  if (!forwardUrl) return true
  try {
    const res = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zenith-Audit-Secret': process.env.AUDIT_FORWARD_SECRET || '',
      },
      body: JSON.stringify(logEntry),
    })
    if (!res.ok && attempt < WEBHOOK_RETRY_MAX) {
      await new Promise((r) => setTimeout(r, WEBHOOK_RETRY_DELAY_MS * attempt))
      return forwardToWebhook(logEntry, attempt + 1)
    }
    return res.ok
  } catch (err: any) {
    if (attempt < WEBHOOK_RETRY_MAX) {
      await new Promise((r) => setTimeout(r, WEBHOOK_RETRY_DELAY_MS * attempt))
      return forwardToWebhook(logEntry, attempt + 1)
    }
    logger.warn({ err: err.message, forwardUrl, attempts: attempt }, 'Failed to forward audit log to external logging service after retries')
    return false
  }
}

/**
 * Forward audit log to append-only file system log.
 */
function forwardToFileSystem(logEntry: AuditLogData) {
  try {
    const logDir = path.resolve(process.cwd(), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logPath = path.join(logDir, 'audit.log')
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf8')
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to append to local audit.log')
  }
}

/**
 * Zenith Audit Middleware — Hardened Edition
 * ─────────────────────────────────────────
 * Captures all mutating actions (POST/PUT/PATCH/DELETE) and logs them with:
 * - User identity (id, email, name)
 * - Document ID extraction from URL
 * - Sensitive field redaction
 * - Tamper-evident SHA-256 hash chain
 * - Multi-tenant siteId scoping
 * - File system + webhook forwarding with retry
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') return next()

  const originalSend = res.send
  res.send = function (body) {
    res.send = originalSend
    const response = res.send(body)

    try {
      const user = (req as any).user
      if (!user) return response

      const actionMap: Record<string, string> = {
        POST: 'create',
        PUT: 'update',
        PATCH: 'update',
        DELETE: 'delete',
      }
      const action = actionMap[req.method] || 'update'
      const collectionName = extractCollectionName(req.originalUrl)
      const documentId = extractDocumentId(req.originalUrl)
      const siteId = (req as any).siteId || req.headers['x-zenith-site-id'] as string

      const logEntry: AuditLogData = {
        userId: user.id || user._id,
        userEmail: user.email || '',
        userName: user.name || user.username || '',
        action,
        collectionName,
        documentId,
        changes: req.method !== 'DELETE' ? redactSensitive(req.body) : undefined,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        status: res.statusCode >= 400 ? 'failed' : 'success',
        resource: req.originalUrl,
        siteId,
      }

      // Compute tamper-evident hash chain (fire-and-forget to keep latency low)
      getLastAuditHash().then((prevHash) => {
        logEntry.previousHash = prevHash || undefined
        logEntry.hash = computeAuditHash(logEntry, prevHash)
        lastAuditHash = logEntry.hash

        const adapter = AdapterFactory.getActiveAdapter()
        adapter.createAuditLog(logEntry).catch((err) => logger.error({ err }, 'Failed to save audit log'))

        forwardToFileSystem(logEntry)
        forwardToWebhook(logEntry)
      })
    } catch (err) {
      logger.error({ err }, 'Audit middleware error')
    }

    return response
  }

  next()
}