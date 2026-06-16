import pino from 'pino'
import { trace } from '@opentelemetry/api'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  mixin() {
    const span = trace.getActiveSpan()
    if (span) {
      const spanContext = span.spanContext()
      return { 
        trace_id: spanContext.traceId, 
        span_id: spanContext.spanId,
        site_id: process.env.CURRENT_SITE_ID || 'global' // if using cls-hooked or similar
      }
    }
    return {}
  },
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})
