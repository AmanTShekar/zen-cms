import path from 'path'
import { createRequire } from 'module'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const require = createRequire(import.meta.url)
const { AdapterFactory } = require('../../../packages/core/src/database/adapters/AdapterFactory')
require('../../../packages/core/src/database/site-model')

async function setup() {
  console.log('🚀 Booting Template Setup Engine for [Storefront Editorial]...')
  const adapter = AdapterFactory.getActiveAdapter()
  await adapter.connect()

  const site = await adapter.findOne<any>('z_sites', { slug: 'storefront-editorial' })
  if (!site) {
    console.error('❌ Could not find site "storefront-editorial". Did you run `pnpm seed` in the root?')
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

  // Register Posts Collection for Editorial Articles
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
    title: `Welcome to Zenith Editorial Storefront`,
    slug: 'home',
    heroDescription: 'High-impact typography and visual grid layouts for digital publications.',
    siteId,
    sections: [
      {
        blockType: 'navbar',
        blockData: {
          logo: { url: 'https://images.unsplash.com/photo-1635332305373-c60368149806?auto=format&fit=crop&q=80&w=200' },
          links: [
            { label: 'Home', url: '/' },
            { label: 'Magazine', url: '/magazine' },
            { label: 'About', url: '/about' },
          ],
          ctaText: 'Subscribe',
          ctaUrl: '/subscribe',
        },
      },
      {
        blockType: 'hero',
        blockData: {
          headline: 'The Voice of Modern Digital Media',
          subheadline: 'Zenith CMS gives you the tools to build, manage, and scale your content with zero friction.',
          callToAction: 'Read Latest',
          backgroundImage: {
            url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000',
          },
        },
      },
      {
        blockType: 'features',
        heading: 'Why Writers Love Zenith',
        featureList: [
          {
            title: 'Distraction Free Editor',
            description: 'Optimized typography and clean interface for flow state.',
            icon: { url: 'https://images.unsplash.com/photo-1635332305373-c60368149806?auto=format&fit=crop&q=80&w=200' },
          },
          {
            title: 'Dynamic Grids',
            description: 'Asymmetrical masonry grids automatically format your long-form pieces.',
            icon: { url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=200' },
          },
        ],
      }
    ],
    _status: 'published',
  })

  console.log('🌱 Seeding Editorial Posts...')
  await adapter.create('posts', {
    siteId,
    title: 'The Future of Decentralized Media',
    slug: 'the-future-of-decentralized-media-' + siteId,
    description: 'How headless architectures are reshaping the digital publication landscape.',
    content: '<h1>Content is King</h1><p>But architecture is the kingdom. Decoupled frameworks allow publications to push content globally in milliseconds.</p>',
    tags: 'media',
    _status: 'published'
  })
  
  await adapter.create('posts', {
    siteId,
    title: 'The Art of Typography on the Web',
    slug: 'the-art-of-typography-' + siteId,
    description: 'Mastering baseline grids, fluid typography, and optical kerning in CSS.',
    content: '<h1>Typography Matters</h1><p>Good typography is invisible. It allows the reader to seamlessly absorb the message without friction.</p>',
    tags: 'design',
    _status: 'published'
  })

  console.log('🎉 Setup Complete for [Storefront Editorial]!')
  await adapter.disconnect()
  process.exit(0)
}

setup().catch(console.error)
