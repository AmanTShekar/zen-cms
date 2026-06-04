import path from 'path'
import { createRequire } from 'module'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const require = createRequire(import.meta.url)
const { AdapterFactory } = require('../../../packages/core/src/database/adapters/AdapterFactory')
require('../../../packages/core/src/database/site-model')

async function setup() {
  console.log('🚀 Booting Template Setup Engine for [Storefront Glass]...')
  const adapter = AdapterFactory.getActiveAdapter()
  await adapter.connect()

  const site = await adapter.findOne<any>('z_sites', { slug: 'storefront-glass' })
  if (!site) {
    console.error('❌ Could not find site "storefront-glass". Did you run `pnpm seed` in the root?')
    process.exit(1)
  }
  const siteId = (site.id || site._id).toString()
  console.log(`✅ Found Site ID: ${siteId}`)

  // Register Pages Collection
  await adapter.create('z_collections', {
    name: 'Pages',
    slug: 'pages',
    labels: { singular: 'Page', plural: 'Pages' },
    drafts: true,
    timestamps: true,
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'slug', type: 'text', label: 'Slug', required: true },
      { name: 'heroDescription', type: 'textarea', label: 'Hero Description' },
      { name: 'sections', type: 'blocks', label: 'Sections' }
    ]
  }).catch(() => console.log('⚠️ Pages collection config already exists'))

  // Register Posts Collection for Projects
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
    ]
  }).catch(() => console.log('⚠️ Posts collection config already exists'))

  await adapter.registerCollection({ slug: 'pages', fields: [] } as any)
  await adapter.registerCollection({ slug: 'posts', fields: [] } as any)

  await adapter.deleteMany('pages', { siteId }).catch(() => {})
  await adapter.deleteMany('posts', { siteId }).catch(() => {})

  console.log('🌱 Seeding Home Page...')
  await adapter.create('pages', {
    title: `Welcome to Zenith Glassmorphism Storefront`,
    slug: 'home',
    heroDescription: 'Experience sleek glassmorphism aesthetic built on Zenith CMS.',
    siteId,
    sections: [
      {
        blockType: 'navbar',
        blockData: {
          logo: { url: 'https://images.unsplash.com/photo-1635332305373-c60368149806?auto=format&fit=crop&q=80&w=200' },
          links: [
            { label: 'Home', url: '/' },
            { label: 'Products', url: '/products' },
            { label: 'About', url: '/about' },
          ],
          ctaText: 'Get Started',
          ctaUrl: '/signup',
        },
      },
      {
        blockType: 'hero',
        blockData: {
          headline: 'Translucent Aesthetics. Hardened Performance.',
          subheadline: 'Zenith CMS gives you the tools to build, manage, and scale your content with zero friction.',
          callToAction: 'Get Started Now',
          backgroundImage: {
            url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000',
          },
        },
      },
      {
        blockType: 'stats',
        blockData: {
          items: [
            { value: '100ms', label: 'API Response Time' },
            { value: '99.9%', label: 'System Uptime' },
            { value: '24/7', label: 'AI Assistance' },
            { value: '∞', label: 'Scalability' },
          ],
        },
      },
      {
        blockType: 'cta',
        blockData: {
          title: 'Ready to build the future?',
          description: 'Join the Zenith community today and experience the power of modern headless content management.',
          buttonText: 'Start Your Project',
          link: '/admin',
        },
      },
    ],
    _status: 'published',
  })

  console.log('🌱 Seeding Portfolio Posts...')
  await adapter.create('posts', {
    siteId,
    title: 'Zenith Design System',
    slug: 'zenith-design-system-' + siteId,
    description: 'A dark-mode glassmorphic component library featuring 60FPS fluid UI transitions.',
    content: '<h1>Lead Designer</h1><p>Designed the core Zenith CMS visual system.</p>',
    tags: 'design',
    _status: 'published'
  })
  
  await adapter.create('posts', {
    siteId,
    title: 'Hyperion Analytics Platform',
    slug: 'hyperion-analytics-' + siteId,
    description: 'Horizontally scalable event ingest pipeline handling 100K requests per second.',
    content: '<h1>Backend Architect</h1><p>Built highly scalable data pipelines.</p>',
    tags: 'tech',
    _status: 'published'
  })

  console.log('🎉 Setup Complete for [Storefront Glass]!')
  await adapter.disconnect()
  process.exit(0)
}

setup().catch(console.error)
