import { Request, Response, NextFunction } from 'express'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from '../services/logger'

/**
 * Zenith Maintenance Mode Middleware
 * ──────────────────────────────────
 * Checks the active settings collection to see if maintenance mode is enabled.
 * If active, rejects requests to all endpoints (except auth and system settings paths)
 * with a 503 Service Unavailable error.
 */
export const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Allow system check/health paths, auth paths, and settings modification paths (so admins can login/disable maintenance mode)
  const isExcluded =
    req.path.startsWith('/api/v1/auth') ||
    req.path.startsWith('/api/v1/system/settings') ||
    req.path === '/api/v1/health' ||
    req.path === '/health'

  if (isExcluded) {
    return next()
  }

  try {
    const adapter = AdapterFactory.getActiveAdapter()
    if (adapter) {
      const settingsList = await adapter.find<Record<string, any>>('z_settings', {})
      const settings = settingsList[0] || null

      if (settings && (settings.maintenanceMode === true || settings.maintenance_mode === true)) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Zenith CMS is currently undergoing scheduled maintenance. Please try again later.',
          statusCode: 503,
        })
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Maintenance middleware error querying settings')
  }

  next()
}
