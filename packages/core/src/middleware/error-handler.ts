import { NextFunction, Request, Response } from 'express'
import { isZenithError } from '../errors'
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
      logger.error(
        { err: err.message, stack: err.stack, url: req.url, method: req.method },
        `${err.code}: ${err.message}`
      )
    } else {
      logger.warn(
        { code: err.code, url: req.url, details: (err as any).details || (err as any).errors },
        err.message
      )
    }
    return res.status(err.status).json(err.toJSON())
  }

  // Mongoose validation error
  if ((err as any)?.name === 'ValidationError') {
    const errors = Object.values((err as any).errors || {}).map((e: any) => ({
      field: e.path,
      message: e.message,
    }))
    logger.warn({ errors }, 'Validation Error')
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors,
      status: 400,
    })
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
  const error = err as Error
  logger.error(
    { err: error.message, stack: error.stack, url: req.url, method: req.method },
    'Unhandled error'
  )
  return res
    .status(500)
    .json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred', status: 500 })
}
