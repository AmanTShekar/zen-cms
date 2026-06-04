import { Request, Response, NextFunction } from 'express'
import { extractTraceContext, runWithContext } from '../services/tracer'

/**
 * Middleware that wraps incoming requests in a trace context and sets response correlation headers.
 */
export function tracerMiddleware(req: Request, res: Response, next: NextFunction) {
  const context = extractTraceContext(req.headers)
  
  res.setHeader('x-trace-id', context.traceId)
  res.setHeader('traceparent', `00-${context.traceId}-${context.spanId}-01`)

  runWithContext(context, `${req.method} ${req.path}`, async () => {
    next()
  })
}
