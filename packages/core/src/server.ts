/**
 * Zenith CMS — Server Entry Point
 * ─────────────────────────────────
 * Run in development: npx pnpm --filter @zenithcms/core dev
 * Run in production:  node dist/server.js
 */
import 'dotenv/config'
import { ZenithEngine } from './index'
import { logger } from './services/logger'

// ── Global Process Error Handlers ────────────────────────────────────────────
// These must be registered before any other code to catch every unhandled error.

process.on('uncaughtException', (err) => {
  logger.error({ err: err.message, stack: err.stack }, 'UNCAUGHT EXCEPTION — shutting down')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
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
