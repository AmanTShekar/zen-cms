/**
 * Zenith CMS — Server Entry Point
 * ─────────────────────────────────
 * Run in development: npx pnpm --filter @zenithcms/core dev
 * Run in production:  node dist/server.js
 */
import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { ZenithEngine } from './index'
import { logger } from './services/logger'

if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  logger.fatal('REDIS_URL is strictly required in production for horizontal scaling. Failing boot.')
  process.exit(1)
}

import { initTelemetry } from './services/telemetry'

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  })
}

initTelemetry()

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

const engine = new ZenithEngine({
  config,
  cors: {
    origins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'http://localhost:5176',
        ],
  },
})
engine.start()
