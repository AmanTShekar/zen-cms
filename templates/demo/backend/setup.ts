import path from 'path'
import { createRequire } from 'module'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

const require = createRequire(import.meta.url)
const { AdapterFactory } = require('../../../packages/core/src/database/adapters/AdapterFactory')
require('../../../packages/core/src/database/site-model')

async function setup() {
  console.log('🚀 Booting Template Setup Engine for [Demo - Ecommerce]...')
  const adapter = AdapterFactory.getActiveAdapter()
  await adapter.connect()

  const site = await adapter.findOne<any>('z_sites', { slug: 'demo' })
  if (!site) {
    console.error('❌ Could not find site "demo". Did you run `pnpm seed` in the root?')
    process.exit(1)
  }
  const siteId = (site.id || site._id).toString()
  console.log(`✅ Found Site ID: ${siteId}`)

  // Register Products Collection
  await adapter.create('z_collections', {
    name: 'Products',
    slug: 'products',
    labels: { singular: 'Product', plural: 'Products' },
    drafts: true,
    timestamps: true,
    fields: [
      { name: 'title', type: 'text', label: 'Title', required: true },
      { name: 'price', type: 'number', label: 'Price', required: true },
      { name: 'category', type: 'select', label: 'Category', options: [
        { label: 'Electronics', value: 'electronics' },
        { label: 'Apparel', value: 'apparel' },
        { label: 'Home', value: 'home' }
      ]},
      { name: 'description', type: 'richtext', label: 'Description' },
      { name: 'inStock', type: 'checkbox', label: 'In Stock' }
    ]
  }).catch(() => console.log('⚠️ Products collection config already exists'))

  // Wait for collections to be registered internally in adapter
  await adapter.registerCollection({ slug: 'products', fields: [] } as any)

  // Clear existing mock data for this site to avoid duplicates
  await adapter.deleteMany('products', { siteId }).catch(() => {})

  console.log('🌱 Seeding Products...')
  await adapter.create('products', {
    siteId,
    title: 'Zenith Studio Monitor Pro',
    price: 899,
    category: 'electronics',
    description: '<p>Ultra-wide color gamut screen optimized for terminal readability and interface design.</p>',
    inStock: true,
    _status: 'published'
  })
  
  await adapter.create('products', {
    siteId,
    title: 'Quantum Mechanical Keyboard',
    price: 199,
    category: 'electronics',
    description: '<p>Pre-lubed linear switches in a solid anodized obsidian-dark housing.</p>',
    inStock: true,
    _status: 'published'
  })

  console.log('🎉 Setup Complete for [Demo - Ecommerce]!')
  await adapter.disconnect()
  process.exit(0)
}

setup().catch(console.error)
