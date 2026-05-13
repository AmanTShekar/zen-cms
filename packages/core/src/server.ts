/**
 * Zenith CMS — Server Entry Point
 * ─────────────────────────────────
 * Run in development: npx pnpm --filter @zenith/core dev
 * Run in production:  node dist/server.js
 */
import 'dotenv/config';
import { ZenithEngine } from './index';

// Import your config file (adjust path as needed)
let config: unknown;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  config = require('../../../cms.config').default || require('../../../cms.config');
} catch {
  // Fallback: minimal config so the engine boots even without a config file
  config = { collections: [], webhooks: [] };
  console.warn('[Zenith] No cms.config.ts found — starting with empty config. Create cms.config.ts in project root.');
}

const engine = new ZenithEngine({ config });
engine.start();
