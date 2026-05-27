import { Request, Response, NextFunction } from 'express'
import { createErrorResponse } from '../api/utils'

/**
 * Request Timeout Middleware
 * ──────────────────────────
 * Terminates requests that exceed the specified time limit.
 * Prevents resource exhaustion from slow or hanging client connections.
 */
export function requestTimeout(ms: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      res.status(408).json(
        createErrorResponse(408, 'Request timed out', undefined, 'TimeoutError')
      )
    }, ms)

    res.on('finish', () => clearTimeout(timer))
    res.on('close', () => clearTimeout(timer))

    next()
  }
}
