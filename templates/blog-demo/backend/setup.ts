import path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { AdapterFactory } = require('../../../packages/core/src/database/adapters/AdapterFactory')
require('../../../packages/core/src/database/site-model')

async function setup() {
  console.log('🚀 Booting Template Setup Engine for [Blog Demo]...')
  const adapter = AdapterFactory.getActiveAdapter()
  await adapter.connect()

  const site = await adapter.findOne<any>('z_sites', { slug: 'blog-demo' })
  if (!site) {
    console.error('❌ Could not find site "blog-demo". Did you run `pnpm seed` in the root?')
    process.exit(1)
  }
  const siteId = (site.id || site._id).toString()
  console.log(`✅ Found Site ID: ${siteId}`)

  // Register Authors Collection
  await adapter.create('z_collections', {
    name: 'Authors',
    slug: 'authors',
    labels: { singular: 'Author', plural: 'Authors' },
    drafts: true,
    timestamps: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'bio', type: 'textarea', label: 'Bio' },
      { name: 'role', type: 'select', label: 'Role', options: [{ label: 'Admin', value: 'Admin' }, { label: 'Editor', value: 'Editor' }] }
    ]
  }).catch(() => console.log('⚠️ Authors collection config already exists'))

  // Register Posts Collection
  await adapter.create('z_collections', {
    name: 'Posts',
    slug: 'posts',
    labels: { singular: 'Post', plural: 'Posts' },
    drafts: true,
    timestamps: true,
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'content', type: 'richtext', label: 'Content' },
      { name: 'coverImage', type: 'media', label: 'Cover Image' },
      { name: 'tags', type: 'text', label: 'Tags' },
      { name: 'publishedAt', type: 'date', label: 'Published At' },
    ]
  }).catch(() => console.log('⚠️ Posts collection config already exists'))

  // Wait for collections to be registered internally in adapter
  await adapter.registerCollection({ slug: 'authors', fields: [] } as any)
  await adapter.registerCollection({ slug: 'posts', fields: [] } as any)

  // Clear existing mock data for this site to avoid duplicates
  await adapter.deleteMany('authors', { siteId }).catch(() => {})
  await adapter.deleteMany('posts', { siteId }).catch(() => {})

  console.log('🌱 Seeding Authors...')
  await adapter.create('authors', { siteId, name: 'Sarah Zenith', email: 'sarah@zenith.ai', bio: 'Founder and Lead Architect of Zenith CMS.', role: 'Admin', _status: 'published' })
  await adapter.create('authors', { siteId, name: 'Marcus Aurelius', email: 'marcus@zenith.ai', bio: 'Content strategist focused on high-performance APIs.', role: 'Editor', _status: 'published' })

  console.log('🌱 Seeding Posts...')
  await adapter.create('posts', {
    siteId,
    title: 'The Architecture of Zenith CMS',
    slug: 'architecture-of-zenith-cms-' + siteId,
    description: 'A deep dive into zero-dependency data structures, dynamic schemas, and high-performance caching.',
    content: '<h1>Decoupled & Fast</h1><p>Zenith CMS is designed from the ground up to be database-agnostic. By utilizing a clean DatabaseAdapter interface, it supports both MongoDB and SQL-based Backends with zero runtime translation overhead.</p>',
    tags: 'tech, design',
    publishedAt: '2025-12-01',
    _status: 'published'
  })
  
  await adapter.create('posts', {
    siteId,
    title: 'Building Beautiful Interfaces with Glassmorphism',
    slug: 'building-interfaces-with-glassmorphism-' + siteId,
    description: 'How to implement glassmorphic containers using HSL tailwind colors and hardware-accelerated filters.',
    content: '<h1>Premium UI Aesthetics</h1><p>Aesthetics drive user engagement. Modern interfaces leverage translucency, subtle borders, and smooth spring-scaling keyframes to establish depth and focus.</p>',
    tags: 'design',
    publishedAt: '2025-11-15',
    _status: 'published'
  })

  console.log('🎉 Setup Complete for [Blog Demo]!')
  await adapter.disconnect()
  process.exit(0)
}

setup().catch(console.error)
