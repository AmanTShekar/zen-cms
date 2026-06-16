import type { CMSConfig } from '@zenith-open/zenithcms-types'
/**
 * Zenith CMS Configuration
 * ───────────────────────
 * Refactored to follow feature-based modularity (Colocation Principle).
 *
 * Add your custom Collections and Globals here, or use the Schema Builder in the Admin UI.
 */
const config: CMSConfig = {
  collections: [],

  globals: [],

  plugins: [],

  // Optional: register webhooks to fire on collection events
  webhooks: [
    // {
    //   url: 'https://your-site.com/api/revalidate',
    //   secret: process.env.WEBHOOK_SECRET || '',
    //   events: ['posts.published', 'posts.updated'],
    // },
  ],
}

export default config
