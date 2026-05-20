import type { CMSConfig } from '@zenithcms/types'
import { Post } from './config/collections/posts'
import { Author } from './config/collections/authors'
import { Product } from './config/collections/products'
import { Page } from './config/collections/pages'
import { Member } from './config/collections/members'
import { LandingPage } from './config/globals/landing-page'

// Plugins
import { seoPlugin, slugPlugin } from './packages/core/src/plugins'

/**
 * Zenith CMS Configuration
 * ───────────────────────
 * Refactored to follow feature-based modularity (Colocation Principle).
 *
 * Collections are imported from ./config/collections
 * Globals are imported from ./config/globals
 */
const config: CMSConfig = {
  collections: [Post, Author, Product, Page, Member],

  globals: [LandingPage],

  plugins: [seoPlugin, slugPlugin({ from: 'title' })],

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
