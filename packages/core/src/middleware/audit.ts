import { Request, Response, NextFunction } from 'express';
import { AuditLogModel } from '../database/audit-model';

/**
 * Zenith Audit Middleware
 * ───────────────────────
 * Automatically logs all non-GET administrative requests to the audit collection.
 * Tracks user, action, collection, and timestamp.
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only log mutating actions (POST, PATCH, DELETE, PUT)
  if (req.method === 'GET') return next();

  // Capture the original send to log after response is sent
  const originalSend = res.send;
  res.send = function(body) {
    res.send = originalSend;
    const response = res.send(body);

    // Perform logging in the background (fire and forget)
    try {
      const user = (req as any).user;
      if (user) {
        AuditLogModel.create({
          userId: user.id,
          userEmail: user.email,
          action: req.method,
          resource: req.originalUrl,
          payload: req.method !== 'DELETE' ? req.body : undefined,
          status: res.statusCode >= 400 ? 'failed' : 'success',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        }).catch(err => console.error('Failed to save audit log:', err));
      }
    } catch (err) {
      console.error('Audit middleware error:', err);
    }

    return response;
  };

  next();
};
