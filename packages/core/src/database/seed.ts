import { AdapterFactory } from './adapters/AdapterFactory'
import { AuthService } from '../services/auth'
import { logger } from '../services/logger'
import { DatabaseAdapter } from './adapters/BaseAdapter'

// Register Mongoose models
import './user-model'
import './api-key-model'
import './audit-model'
import './dashboard-layout-model'
import './flow-model'
import './member-model'
import './onboarding-state-model'
import './password-reset-model'
import './preference-model'
import './settings-model'
import './site-model'
import './workspace-model'
import './version-model'
import './webhook-model'
import './webhook-config-model'
import './release-model'
import './role-model'
import './template-model'


/**
 * Zenith Seeding Engine
 * ─────────────────────
 * Automates initial setup of the CMS (Admin creation, default settings).
 * 
 * Run with: pnpm run seed
 */
export async function seedInitialData() {
  try {
    const adapter = AdapterFactory.getActiveAdapter()
    if (!adapter) {
      logger.warn('[SeedEngine] No active database adapter found. Skipping seeding.')
      return
    }

    let admins = await adapter.find<any>('users', { role: 'admin' })

    if (admins.length === 0) {
      const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@zenith.com'
      const password = process.env.INITIAL_ADMIN_PASSWORD || 'Zenith2024!'

      const hashedPassword = await AuthService.hashPassword(password)

      const newAdmin = await adapter.create<any>('users', {
        email,
        password: hashedPassword,
        role: 'admin',
      })
      admins = [newAdmin]

      logger.info({ email }, 'Initial Admin user created automatically')
    }

    const adminUser = admins[0]
    const adminId = adminUser.id || adminUser._id

    // Seed default workspace if none exist
    const workspaces = await adapter.find<any>('z_workspaces', {})
    let defaultWorkspace: any
    if (workspaces.length === 0) {
      defaultWorkspace = await adapter.create<any>('z_workspaces', {
        name: 'My Workspace',
        slug: 'my-workspace',
        ownerId: adminId.toString(),
        members: [{ userId: adminId.toString(), role: 'admin', addedAt: new Date() }]
      })
      logger.info('Default workspace created')
    } else {
      defaultWorkspace = workspaces[0]
    }

    // Ensure Site collection exists and create standard sites if none
    const sitesToSeed = [
      {
        _id: '6a09ec05c7be2df302d01e8d',
        name: 'Default Site',
        slug: 'default',
        domain: process.env.DEFAULT_SITE_DOMAIN || 'localhost',
        tenantId: 'default',
        icon: '🌐',
        description: 'The default storefront platform instance of Zenith CMS.',
      },
      {
        _id: '6a09ec05c7be2df302d01e8e',
        name: 'Zenith Glassmorphism Storefront',
        slug: 'storefront-glass',
        domain: 'localhost:5173',
        tenantId: 'storefront-glass',
        icon: '💎',
        description: 'A luxury, dark-obsidian glassmorphic storefront template featuring fluid spring physics.',
      },
      {
        _id: '6a09ec05c7be2df302d01e8f',
        name: 'Zenith Editorial Storefront',
        slug: 'storefront-editorial',
        domain: 'localhost:5173',
        tenantId: 'storefront-editorial',
        icon: '📰',
        description: 'A typography-centric editorial magazine theme featuring asymmetrical masonry content grids.',
      },
      {
        _id: '6a09ec05c7be2df302d01e90',
        name: 'Zenith Blog Demo',
        slug: 'blog-demo',
        domain: 'localhost:5173',
        tenantId: 'blog-demo',
        icon: '📝',
        description: 'A clean developer blog layout demonstrating static SWR content ingestion and caching.',
      },
      {
        _id: '6a09ec05c7be2df302d01e91',
        name: 'Zenith Demo',
        slug: 'demo',
        domain: 'localhost:5173',
        tenantId: 'demo',
        icon: '🛒',
        description: 'The standard product storefront demonstrating cart flow, catalog filtering, and spatial live updates.',
      }
    ]

    for (const siteData of sitesToSeed) {
      const existingById = await adapter.findOne<any>('z_sites', { _id: siteData._id })
      if (existingById) {
        await adapter.update('z_sites', (existingById.id || existingById._id).toString(), {
          name: siteData.name,
          slug: siteData.slug,
          domain: siteData.domain,
          tenantId: siteData.tenantId,
          icon: siteData.icon,
          description: siteData.description,
          workspaceId: (defaultWorkspace.id || defaultWorkspace._id).toString(),
        })
        logger.info(`Site ${siteData.name} updated by ID`)
      } else {
        const existingBySlug = await adapter.findOne<any>('z_sites', { slug: siteData.slug })
        if (existingBySlug) {
          await adapter.update('z_sites', (existingBySlug.id || existingBySlug._id).toString(), {
            name: siteData.name,
            domain: siteData.domain,
            tenantId: siteData.tenantId,
            icon: siteData.icon,
            description: siteData.description,
            workspaceId: (defaultWorkspace.id || defaultWorkspace._id).toString(),
          })
          logger.info(`Site ${siteData.name} updated by slug`)
        } else {
          await adapter.create<any>('z_sites', {
            ...siteData,
            workspaceId: (defaultWorkspace.id || defaultWorkspace._id).toString(),
            ownerId: adminId.toString(),
            members: [{ userId: adminId.toString(), role: 'admin', addedAt: new Date() }]
          })
          logger.info(`Site ${siteData.name} created and linked to default workspace`)
        }
      }
    }

    // Keep only up to 10 sites, remove extras
    const currentSites = await adapter.find<any>('z_sites', {})
    if (currentSites.length > 10) {
      const toRemove = currentSites.slice(10)
      for (const site of toRemove) {
        await adapter.delete('z_sites', (site.id || site._id).toString())
      }
    }

    // Seed Real Data for each Site
    for (const siteData of sitesToSeed) {
      const siteId = siteData._id
      let landingCount = 0
      try {
        landingCount = await adapter.count('landing-page', { siteId })
      } catch {
        // If collection doesn't exist yet, we'll try to create it anyway
      }

      if (landingCount === 0) {
        try {
          await adapter.create('landing-page', {
            title: `Welcome to ${siteData.name}`,
            heroDescription:
              siteData.slug === 'storefront-glass'
                ? 'Experience sleek glassmorphism aesthetic built on Zenith CMS.'
                : siteData.slug === 'storefront-editorial'
                ? 'High-impact typography and visual grid layouts for digital publications.'
                : siteData.slug === 'blog-demo'
                ? 'A lightning fast developer blog showcasing Zenith content synchronization.'
                : 'Experience the fastest headless commerce backend designed for the modern web.',
            siteId,
            sections: [
              {
                blockType: 'hero',
                blockData: {
                  headline: siteData.slug === 'storefront-glass'
                    ? 'Translucent Aesthetics. Hardened Performance.'
                    : siteData.slug === 'storefront-editorial'
                    ? 'The Voice of Modern Digital Media'
                    : siteData.slug === 'blog-demo'
                    ? 'Developer Chronicles & Tech Manifests'
                    : 'The Future of Headless Commerce is Here',
                  subheadline:
                    'Zenith CMS gives you the tools to build, manage, and scale your content with zero friction.',
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
                blockType: 'features',
                heading: 'Why Developers Love Zenith',
                featureList: [
                  {
                    title: 'Lightning Fast API',
                    description:
                      'Optimized MongoDB queries and intelligent caching ensure sub-100ms response times.',
                    icon: {
                      url: 'https://images.unsplash.com/photo-1635332305373-c60368149806?auto=format&fit=crop&q=80&w=200',
                    },
                  },
                  {
                    title: 'AI Co-pilot',
                    description:
                      'Auto-generate SEO meta, alt text, and even entire blog posts using integrated AI tools.',
                    icon: {
                      url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=200',
                    },
                  },
                  {
                    title: 'Modular Design',
                    description:
                      'Use our Dynamic Blocks to build pages visually without touching a single line of code.',
                    icon: {
                      url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=200',
                    },
                  },
                ],
              },
              {
                blockType: 'testimonials',
                blockData: {
                  heading: 'Loved by Teams Worldwide',
                  items: [
                    {
                      quote:
                        'Zenith has completely transformed how we manage our global content pipeline. The UI is stunning and the API is incredibly fast.',
                      author: 'Sarah Chen',
                      role: 'CTO at TechFlow',
                      avatar: {
                        url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
                      },
                    },
                    {
                      quote:
                        'The block-based page builder is a game changer. Our marketing team can now launch pages in minutes instead of days.',
                      author: 'Marcus Aurelius',
                      role: 'Head of Marketing at Nexus',
                      avatar: {
                        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
                      },
                    },
                  ],
                },
              },
              {
                blockType: 'pricing',
                blockData: {
                  heading: 'Plans that Scale with You',
                  plans: [
                    {
                      name: 'Developer',
                      price: '$0',
                      features: 'Up to 3 users\n100GB Bandwidth\nCommunity Support',
                      buttonText: 'Get Started',
                    },
                    {
                      name: 'Pro',
                      price: '$49/mo',
                      features:
                        'Unlimited users\n1TB Bandwidth\nPriority Email Support\nAI Assistant',
                      buttonText: 'Upgrade Now',
                      isPopular: true,
                    },
                    {
                      name: 'Enterprise',
                      price: 'Custom',
                      features: 'White-labeling\nCustom Storage\n24/7 Dedicated Support',
                      buttonText: 'Contact Sales',
                    },
                  ],
                },
              },
              {
                blockType: 'faq',
                blockData: {
                  heading: 'Frequently Asked Questions',
                  questions: [
                    {
                      question: 'Is Zenith really headless?',
                      answer:
                        'Yes, Zenith is a fully headless CMS that provides a rich REST and GraphQL API to consume your content on any platform.',
                    },
                    {
                      question: 'Can I host it myself?',
                      answer:
                        'Absolutely. Zenith is open-core and designed to be easily deployed on any cloud provider or on-premise server.',
                    },
                  ],
                },
              },
              {
                blockType: 'cta',
                blockData: {
                  title: 'Ready to build the future?',
                  description:
                    'Join the Zenith community today and experience the power of modern headless content management.',
                  buttonText: 'Start Your Project',
                  link: '/admin',
                },
              },
            ],
            _status: 'published',
          })
          logger.info(`Seeded Landing Page with Dynamic Blocks for site: ${siteData.slug}`)
        } catch (err: any) {
          logger.warn({ err: err.message }, `Failed to seed landing-page collection for site: ${siteData.slug}`)
        }
      }
    }

    let productCount = 0
    try {
      productCount = await adapter.count('products', {})
    } catch {
      // If collection doesn't exist yet, we'll try to create it anyway
    }

    if (productCount === 0) {
      try {
        const productsToSeed = [
          {
            title: 'Sony WH-1000XM5',
            price: 349,
            category: 'electronics',
            description:
              '<p>Industry leading noise canceling headphones with superior sound quality.</p>',
            gallery: [
              {
                url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800',
                type: 'image',
              },
            ],
            inStock: true,
            _status: 'published',
          },
          {
            title: 'MacBook Pro M3',
            price: 1599,
            category: 'electronics',
            description: '<p>Mind-blowing performance with the new M3 chip.</p>',
            gallery: [
              {
                url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800',
                type: 'image',
              },
            ],
            inStock: true,
            _status: 'published',
          },
          {
            title: 'Minimalist Chair',
            price: 129,
            category: 'home',
            description: '<p>Ergonomic minimalist chair for your modern workspace.</p>',
            gallery: [
              {
                url: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=800',
                type: 'image',
              },
            ],
            inStock: true,
            _status: 'published',
          },
        ]

        for (const p of productsToSeed) {
          await adapter.create('products', p)
        }
        logger.info('Seeded 3 real Products')
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to seed products collection')
      }
    }

    // Seed media library records so images appear in the media picker
    let mediaCount = 0
    try {
      mediaCount = await adapter.count('media', {})
    } catch {
      // media collection may not exist yet
    }
    if (mediaCount === 0) {
      try {
        const mediaAssets = [
          { name: 'zenith-architecture', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200', alt: 'Zenith CMS Architecture', mimetype: 'image/jpeg', size: 0 },
          { name: 'glassmorphism-design', url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1200', alt: 'Glassmorphism Design', mimetype: 'image/jpeg', size: 0 },
          { name: 'ai-copilot', url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800', alt: 'AI Technology', mimetype: 'image/jpeg', size: 0 },
          { name: 'modular-design', url: 'https://images.unsplash.com/photo-1635332305373-c60368149806?auto=format&fit=crop&q=80&w=800', alt: 'Modular Design', mimetype: 'image/jpeg', size: 0 },
          { name: 'sarah-chen-avatar', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400', alt: 'Sarah Chen', mimetype: 'image/jpeg', size: 0 },
          { name: 'marcus-aurelius-avatar', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400', alt: 'Marcus Aurelius', mimetype: 'image/jpeg', size: 0 },
          { name: 'sony-headphones', url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800', alt: 'Sony WH-1000XM5', mimetype: 'image/jpeg', size: 0 },
          { name: 'macbook-pro', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800', alt: 'MacBook Pro M3', mimetype: 'image/jpeg', size: 0 },
          { name: 'minimalist-chair', url: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&q=80&w=800', alt: 'Minimalist Chair', mimetype: 'image/jpeg', size: 0 },
        ]
        for (const asset of mediaAssets) {
          await adapter.create('media', asset)
        }
        logger.info(`Seeded ${mediaAssets.length} media library assets`)
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to seed media library')
      }
    }
  } catch (error: any) {
    logger.error({ err: error.message, stack: error.stack }, 'Seeding failed')
  }
}

/**
 * Seeds high-fidelity domain-specific template data tailored to user intent
 */
export async function seedTailoredData(projectType: string, adapter: DatabaseAdapter, siteId?: string) {
  logger.info({ projectType, siteId }, '[SeedEngine] Seeding tailored vertical template')
  try {
    const withSite = <T extends Record<string, any>>(data: T): T & { siteId?: string } => {
      return siteId ? { ...data, siteId } : data
    }

    if (projectType === 'blog') {
      // Seed Categories
      const categories = [
        { name: 'Engineering', slug: 'engineering', description: 'Deep technical articles and architecture breakdowns.', _status: 'published' },
        { name: 'Design System', slug: 'design-system', description: 'UI/UX best practices and token design.', _status: 'published' },
        { name: 'Productivity', slug: 'productivity', description: 'Workflows, developer velocity, and automation strategies.', _status: 'published' }
      ]
      for (const cat of categories) {
        await adapter.create('categories', withSite(cat))
      }

      // Seed Authors
      const authors = [
        { name: 'Sarah Zenith', email: 'sarah@zenith.ai', bio: 'Founder and Lead Architect of Zenith CMS.', role: 'Admin', _status: 'published' },
        { name: 'Marcus Aurelius', email: 'marcus@zenith.ai', bio: 'Content strategist focused on high-performance APIs.', role: 'Editor', _status: 'published' }
      ]
      for (const aut of authors) {
        await adapter.create('authors', withSite(aut))
      }

      // Seed Posts
      const posts = [
        {
          title: 'The Architecture of Zenith CMS',
          slug: 'architecture-of-zenith-cms',
          description: 'A deep dive into zero-dependency data structures, dynamic schemas, and high-performance caching.',
          content: '<h1>Decoupled & Fast</h1><p>Zenith CMS is designed from the ground up to be database-agnostic. By utilizing a clean DatabaseAdapter interface, it supports both MongoDB and SQL-based Backends with zero runtime translation overhead.</p>',
          coverImage: { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=630', alt: 'Zenith CMS Architecture' },
          tags: ['tech', 'design'],
          publishedAt: '2025-12-01',
          _status: 'published'
        },
        {
          title: 'Building Beautiful Interfaces with Glassmorphism',
          slug: 'building-interfaces-with-glassmorphism',
          description: 'How to implement glassmorphic containers using HSL tailwind colors and hardware-accelerated filters.',
          content: '<h1>Premium UI Aesthetics</h1><p>Aesthetics drive user engagement. Modern interfaces leverage translucency, subtle borders, and smooth spring-scaling keyframes to establish depth and focus.</p>',
          coverImage: { url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1200&h=630', alt: 'Glassmorphism Design' },
          tags: ['design'],
          publishedAt: '2025-11-15',
          _status: 'published'
        }
      ]
      for (const post of posts) {
        await adapter.create('posts', withSite(post))
      }
      logger.info('[SeedEngine] Successfully seeded High-Fidelity Blog Template')

      // Seed media records for blog template
      try {
        const blogMedia = [
          { name: 'zenith-architecture-blog', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200&h=630', alt: 'Zenith CMS Architecture', mimetype: 'image/jpeg', size: 0, ...withSite({}) },
          { name: 'glassmorphism-design-blog', url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=1200&h=630', alt: 'Glassmorphism Design', mimetype: 'image/jpeg', size: 0, ...withSite({}) },
        ]
        for (const asset of blogMedia) {
          await adapter.create('media', asset)
        }
        logger.info('[SeedEngine] Seeded blog media assets')
      } catch (err: any) {
        logger.warn({ err: err.message }, '[SeedEngine] Failed to seed blog media')
      }
    } else if (projectType === 'ecommerce') {
      // Seed categories
      const categories = [
        { name: 'Electronics', slug: 'electronics', description: 'State-of-the-art developer hardware.', _status: 'published' },
        { name: 'Office Gear', slug: 'office-gear', description: 'Ergonomic tools for maximum flow state.', _status: 'published' }
      ]
      for (const cat of categories) {
        await adapter.create('categories', withSite(cat))
      }

      // Seed products
      const products = [
        {
          title: 'Zenith Studio Monitor Pro',
          price: 899,
          category: 'electronics',
          description: '<p>Ultra-wide color gamut screen optimized for terminal readability and interface design.</p>',
          inStock: true,
          _status: 'published'
        },
        {
          title: 'Quantum Mechanical Keyboard',
          price: 199,
          category: 'office-gear',
          description: '<p>Pre-lubed linear switches in a solid anodized obsidian-dark housing.</p>',
          inStock: true,
          _status: 'published'
        }
      ]
      for (const p of products) {
        await adapter.create('products', withSite(p))
      }
      logger.info('[SeedEngine] Successfully seeded High-Fidelity E-Commerce Template')
    } else if (projectType === 'portfolio') {
      // Seed projects
      const projects = [
        {
          title: 'Zenith Design System',
          slug: 'zenith-design-system',
          description: 'A dark-mode glassmorphic component library featuring 60FPS fluid UI transitions.',
          role: 'Lead Designer',
          _status: 'published'
        },
        {
          title: 'Hyperion Analytics Platform',
          slug: 'hyperion-analytics',
          description: 'Horizontally scalable event ingest pipeline handling 100K requests per second.',
          role: 'Backend Architect',
          _status: 'published'
        }
      ]
      for (const p of projects) {
        await adapter.create('projects', withSite(p))
      }

      // Seed skills
      const skills = [
        { name: 'TypeScript / React', proficiency: 'Expert', _status: 'published' },
        { name: 'Node.js / Express', proficiency: 'Expert', _status: 'published' },
        { name: 'GraphQL / REST APIs', proficiency: 'Expert', _status: 'published' }
      ]
      for (const s of skills) {
        await adapter.create('skills', withSite(s))
      }
      logger.info('[SeedEngine] Successfully seeded High-Fidelity Portfolio Template')
    } else if (projectType === 'saas') {
      // Seed pages
      const pages = [
        { title: 'Home', slug: 'home', content: '<p>Welcome to our Next-Gen platform. Scale your operations instantly.</p>', _status: 'published' },
        { title: 'Pricing', slug: 'pricing', content: '<p>Transparent plans for developers and enterprises alike.</p>', _status: 'published' }
      ]
      for (const p of pages) {
        await adapter.create('pages', withSite(p))
      }

      // Seed team members
      const team = [
        { name: 'Sarah Zenith', role: 'CEO & Founder', email: 'sarah@company.com', _status: 'published' },
        { name: 'Alex Developer', role: 'CTO', email: 'alex@company.com', _status: 'published' }
      ]
      for (const t of team) {
        await adapter.create('team', withSite(t))
      }
      logger.info('[SeedEngine] Successfully seeded High-Fidelity SaaS Template')
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, '[SeedEngine] Failed to seed tailored template data')
  }
}

async function registerConfigCollections(adapter: DatabaseAdapter) {
  let config: any
  /* eslint-disable @typescript-eslint/no-require-imports */
  try {
    const path = require('path')
    config = require(path.join(process.cwd(), 'cms.config')).default || require(path.join(process.cwd(), 'cms.config'))
  } catch (err: any) {
  /* eslint-enable @typescript-eslint/no-require-imports */
    console.warn('Could not load cms.config.ts for seeding:', err.message)
    return
  }

  const collections = [...(config.collections || [])]
  const globals = [...(config.globals || [])]

  // Add system collections if missing
  if (!collections.find((c) => c.slug === 'media')) {
    collections.push({
      slug: 'media',
      name: 'Media',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'url', type: 'text' },
        { name: 'alt', type: 'text' },
        { name: 'folder', type: 'text' },
        { name: 'mimetype', type: 'text' },
        { name: 'size', type: 'number' },
      ],
    } as any)
  }

  // Register dynamic collections
  for (const col of collections) {
    await adapter.registerCollection(col)
  }

  // Register globals
  for (const glob of globals) {
    await adapter.registerCollection(glob)
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  const adapter = AdapterFactory.getActiveAdapter()
  adapter.connect().then(async () => {
    await registerConfigCollections(adapter)
    await seedInitialData()
    process.exit(0)
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  })
} else if (typeof process !== 'undefined' && process.argv[1] && (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'))) {
  const adapter = AdapterFactory.getActiveAdapter()
  adapter.connect().then(async () => {
    await registerConfigCollections(adapter)
    await seedInitialData()
    process.exit(0)
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

