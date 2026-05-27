import pino from 'pino'
import { getActiveContext } from './tracer'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  mixin() {
    const ctx = getActiveContext()
    return ctx ? { traceId: ctx.traceId, spanId: ctx.spanId } : {}
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
