import { AsyncLocalStorage } from 'async_hooks'
import crypto from 'crypto'

export interface TraceContext {
  traceId: string
  spanId: string
}

export const traceContextStorage = new AsyncLocalStorage<TraceContext>()

/**
 * Runs a callback within the specified trace context.
 */
export function runWithContext<T>(context: TraceContext, fn: () => T): T {
  return traceContextStorage.run(context, fn)
}

/**
 * Retrieves the current active trace context from AsyncLocalStorage.
 */
export function getActiveContext(): TraceContext | undefined {
  return traceContextStorage.getStore()
}

/**
 * Formats trace context into a standard W3C traceparent header value.
 */
export function getTraceparentHeader(): string | undefined {
  const ctx = getActiveContext()
  if (!ctx) return undefined
  // W3C traceparent format: version-traceId-spanId-flags
  return `00-${ctx.traceId}-${ctx.spanId}-01`
}

/**
 * Extracts W3C traceparent or falls back to creating a new trace context.
 */
export function extractTraceContext(headers: Record<string, any>): TraceContext {
  const traceparent = headers['traceparent'] || headers['x-traceparent']
  if (typeof traceparent === 'string') {
    const parts = traceparent.split('-')
    if (parts.length >= 3 && parts[1].length === 32 && parts[2].length === 16) {
      return {
        traceId: parts[1],
        spanId: crypto.randomBytes(8).toString('hex'),
      }
    }
  }

  return {
    traceId: crypto.randomBytes(16).toString('hex'),
    spanId: crypto.randomBytes(8).toString('hex'),
  }
}
