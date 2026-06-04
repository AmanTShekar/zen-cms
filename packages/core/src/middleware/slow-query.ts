import { Request, Response, NextFunction } from 'express'
import { logger } from '../services/logger'

const THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10)

/**
 * Logs requests that exceed the slow-query threshold.
 * Wire into index.ts with: app.use(slowQueryMiddleware)
 */
export function slowQueryMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint()

  res.on('finish', () => {
    const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000
    if (elapsed >= THRESHOLD_MS) {
      logger.warn({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Math.round(elapsed),
      }, `Slow request: ${req.method} ${req.path} took ${Math.round(elapsed)}ms (threshold: ${THRESHOLD_MS}ms)`)
    }
  })

  next()
}