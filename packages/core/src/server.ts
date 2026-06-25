/**
 * Zenith CMS — Server Entry Point
 * ─────────────────────────────────
 * Run in development: npx pnpm --filter @zenith-open/zenithcms-core dev
 * Run in production:  node dist/server.js
 */
import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { ZenithEngine } from './index'
import { logger } from './services/logger'

if (env.NODE_ENV === 'production' && !env.REDIS_URL && process.env.ALLOW_IN_MEMORY_PRODUCTION !== 'true') {
  logger.fatal('REDIS_URL is strictly required in production for horizontal scaling. Failing boot. Set ALLOW_IN_MEMORY_PRODUCTION=true to bypass for single-node deployments.')
  process.exit(1)
}

import './services/telemetry'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { env } from './config/env';


if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: env.NODE_ENV || 'development',
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0, 
    profilesSampleRate: 1.0,
  })
}

// ── Global Process Error Handlers ────────────────────────────────────────────
// These must be registered before any other code to catch every unhandled error.

process.on('uncaughtException', (err) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err)
  logger.error({ err: err.message, stack: err.stack }, 'UNCAUGHT EXCEPTION — shutting down')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(reason)
  const msg = reason instanceof Error ? reason.message : String(reason)
  const stack = reason instanceof Error ? reason.stack : undefined
  logger.error({ err: msg, stack }, 'UNHANDLED REJECTION — shutting down')
  process.exit(1)
})

// Import your config file (adjust path as needed)
let config: any
/* eslint-disable @typescript-eslint/no-require-imports */
try {
  config = require('../../../cms.config').default || require('../../../cms.config')
} catch {
  try {
    const path = require('path')
    config = require(path.join(process.cwd(), 'cms.config')).default || require(path.join(process.cwd(), 'cms.config'))
  } catch {
    // Fallback: minimal config so the engine boots even without a config file
    config = { collections: [], webhooks: [] }
    console.warn(
      '[Zenith] No cms.config.ts found — starting with empty config. Create cms.config.ts in project root.'
    )
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */

// eslint-disable-next-line prefer-const
let engine: any

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Graceful shutdown initiated — stopping engine...')
  if (engine?.stop) {
    await engine.stop(signal)
  }
  logger.info('Shutdown complete.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

engine = new ZenithEngine({
  config,
  cors: {
    origins: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'http://localhost:5176',
        ],
  },
})
engine.start()
