import { Request, Response, NextFunction } from 'express'
import { ZenithError, isZenithError } from '../errors'
import { logger } from '../services/logger'

/**
 * Global Error Handler Middleware
 * ────────────────────────────────
 * Catches all errors, maps ZenithErrors to their HTTP shapes,
 * and masks internal errors from public consumers.
 */
export function globalErrorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Known domain errors — safe to return structured response
  if (isZenithError(err)) {
    if (err.status >= 500) {
      logger.error({ err, url: req.url, method: req.method }, `${err.code}: ${err.message}`)
    } else {
      logger.warn({ code: err.code, url: req.url }, err.message)
    }
    return res.status(err.status).json(err.toJSON())
  }

  // Mongoose duplicate key error
  if ((err as any)?.code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0]
    logger.warn({ field }, 'Duplicate key violation')
    return res.status(409).json({
      error: 'RECORD_NOT_UNIQUE',
      message: `A record with this "${field}" already exists`,
      status: 409,
    })
  }

  // Unknown / Internal errors — never expose details
  logger.error({ err, url: req.url, method: req.method }, 'Unhandled error')
  return res
    .status(500)
    .json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', status: 500 })
}
