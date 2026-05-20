import { Request, Response, NextFunction } from 'express'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from '../services/logger'
import fs from 'fs'
import path from 'path'

/**
 * Forward audit log to external endpoints or write-once file system log.
 */
function forwardAuditLog(logEntry: any) {
  // 1. Append to local file system audit log (append-only target)
  try {
    const logDir = path.resolve(process.cwd(), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logPath = path.join(logDir, 'audit.log')
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf8')
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to append to local secure audit.log')
  }

  // 2. HTTP Webhook Forwarder (e.g. Datadog, Splunk)
  const forwardUrl = process.env.AUDIT_FORWARD_WEBHOOK_URL
  if (forwardUrl) {
    fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zenith-Audit-Secret': process.env.AUDIT_FORWARD_SECRET || '',
      },
      body: JSON.stringify(logEntry),
    }).catch((err: any) => {
      logger.warn({ err: err.message, forwardUrl }, 'Failed to forward audit log to external logging service')
    })
  }
}

/**
 * Zenith Audit Middleware
 * ───────────────────────
 * Automatically logs all non-GET administrative requests to the audit collection.
 * Tracks user, action, collection, and timestamp.
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only log mutating actions (POST, PATCH, DELETE, PUT)
  if (req.method === 'GET') return next()

  // Capture the original send to log after response is sent
  const originalSend = res.send
  res.send = function (body) {
    res.send = originalSend
    const response = res.send(body)

    // Perform logging in the background (fire and forget)
    try {
      const user = (req as any).user
      if (user) {
        const actionMap: Record<string, 'create' | 'update' | 'delete'> = {
          POST: 'create',
          PUT: 'update',
          PATCH: 'update',
          DELETE: 'delete',
        }

        const logEntry = {
          userId: user.id,
          userEmail: user.email,
          action: actionMap[req.method] || 'update',
          collectionName: req.originalUrl,
          changes: req.method !== 'DELETE' ? req.body : undefined,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
          status: res.statusCode >= 400 ? 'failed' : 'success',
          resource: req.originalUrl,
        }

        const adapter = AdapterFactory.getActiveAdapter()
        adapter.createAuditLog(logEntry)
          .catch((err) => logger.error({ err }, 'Failed to save audit log'))

        // Forward to external log shipper/append-only storage
        forwardAuditLog(logEntry)
      }
    } catch (err) {
      logger.error({ err }, 'Audit middleware error')
    }

    return response
  }

  next()
}
