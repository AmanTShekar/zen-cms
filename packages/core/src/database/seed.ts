import { AdapterFactory } from './adapters/AdapterFactory'
import { AuthService } from '../services/auth'
import { logger } from '../services/logger'
import { DatabaseAdapter } from './adapters/BaseAdapter'

import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import chokidar from 'chokidar'

const TenantConfigSchema = z.object({
  dependsOn: z.array(z.string()).optional().default([]),
  site: z.object({
    name: z.string(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    domain: z.string(),
    tenantId: z.string(),
    icon: z.string().optional(),
    description: z.string().optional(),
  }),
  collections: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    fields: z.array(z.any()),
    isGlobal: z.boolean().optional().default(false),
    publicRead: z.boolean().optional().default(false),
  })).optional().default([]),
  blocks: z.array(z.any()).optional().default([]),
  globals: z.array(z.any()).optional().default([]),
  data: z.record(z.array(z.any())).optional().default({}),
})

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
import './schema-model'

/**
 * Tenant Config Synchronisation
 */
export async function syncTenantFiles(adapter: DatabaseAdapter, defaultWorkspace: any, adminId: string) {
  const rootDir = path.resolve(__dirname, '../../../../')
  const tenantsDir = path.resolve(rootDir, 'config', 'tenants')
  const env = process.env.NODE_ENV || 'development'
  let tenantConfigs: any[] = []
  
  if (!fs.existsSync(tenantsDir)) return

  try {
    const files = fs.readdirSync(tenantsDir)
    const baseFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.dev.json') && !f.endsWith('.prod.json') && !f.endsWith('.local.json'))

    for (const file of baseFiles) {
      const content = fs.readFileSync(path.join(tenantsDir, file), 'utf-8')
      try {
        const config = TenantConfigSchema.parse(JSON.parse(content))
        
        // Merge env-specific data
        const baseName = file.replace(/\.example\.json$/, '').replace(/\.json$/, '')
        const ext = file.endsWith('.example.json') ? '.example.json' : '.json'
        
        const envFile = `${baseName}.${env}${ext}`
        const justEnvFile = `${baseName}.${env}.json`
        
        let envDataFileToLoad = null
        if (files.includes(envFile)) envDataFileToLoad = envFile
        else if (files.includes(justEnvFile)) envDataFileToLoad = justEnvFile

        if (envDataFileToLoad) {
           const envContent = fs.readFileSync(path.join(tenantsDir, envDataFileToLoad), 'utf-8')
           const envData = JSON.parse(envContent)
           if (envData.data) {
              // Deep merge data arrays
              for (const [col, docs] of Object.entries(envData.data)) {
                 if (!config.data[col]) config.data[col] = []
                 config.data[col].push(...(docs as any[]))
              }
           }
        }
        
        tenantConfigs.push({ filename: file, config })
      } catch (err: any) {
        logger.error(`Validation failed for tenant file ${file}:`, err)
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Could not load tenant configurations from config/tenants')
    return
  }

  // Topological Sort (Dependency Ordering)
  const sortedConfigs: typeof tenantConfigs = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  
  const visit = (item: any) => {
    const slug = item.config.site.slug
    if (visited.has(slug)) return
    if (visiting.has(slug)) {
      throw new Error(`[Seed] Circular dependency detected: ${[...visiting, slug].join(' → ')}`)
    }
    visiting.add(slug)
    
    for (const dep of item.config.dependsOn || []) {
      const depItem = tenantConfigs.find(c => c.config.site.slug === dep)
      if (depItem) visit(depItem)
    }
    
    visiting.delete(slug)
    visited.add(slug)
    sortedConfigs.push(item)
  }
  
  for (const item of tenantConfigs) {
    visit(item)
  }

  // Seeding Process
  for (const { filename, config } of sortedConfigs) {
    const siteData = config.site
    let finalSiteId: string = ''

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
      finalSiteId = (existingBySlug.id || existingBySlug._id).toString()
      logger.info(`Site ${siteData.name} updated by slug`)
    } else {
      const newSite = await adapter.create<any>('z_sites', {
        ...siteData,
        workspaceId: (defaultWorkspace.id || defaultWorkspace._id).toString(),
        ownerId: adminId.toString(),
        members: [{ userId: adminId.toString(), role: 'admin', addedAt: new Date() }]
      })
      finalSiteId = (newSite.id || newSite._id).toString()
      logger.info(`Site ${siteData.name} created and linked to default workspace`)
    }

    // Sync tenant schemas
    const allSchemas = [
      ...(config.collections || []),
      ...(config.globals || []).map((g: any) => ({ ...g, isGlobal: true }))
    ]

    for (const col of allSchemas) {
      await adapter.registerCollection(col as any)
      
      const existingSchema = await adapter.findOne<any>('z_schemas', { slug: col.slug, siteId: finalSiteId })
      const schemaPayload = {
        title: col.name,
        slug: col.slug,
        type: col.isGlobal ? 'global' : 'collection',
        isGlobal: col.isGlobal || false,
        fields: col.fields || [],
        siteId: finalSiteId,
        publicRead: (col as any).publicRead || false
      }
      if (existingSchema) {
        await adapter.update('z_schemas', (existingSchema.id || existingSchema._id).toString(), schemaPayload)
      } else {
        await adapter.create<any>('z_schemas', schemaPayload)
      }

      const existingGlobal = await adapter.findOne<any>('z_collections', { slug: col.slug })
      const globalPayload = {
        name: col.name,
        slug: col.slug,
        isGlobal: col.isGlobal || false,
        fields: col.fields || [],
        drafts: (col as any).drafts || false,
        timestamps: (col as any).timestamps || true,
        publicRead: (col as any).publicRead || false,
        labels: (col as any).labels || { singular: col.name, plural: col.name + 's' }
      }
      if (existingGlobal) {
        await adapter.update('z_collections', (existingGlobal.id || existingGlobal._id).toString(), globalPayload)
      } else {
        await adapter.create<any>('z_collections', globalPayload)
      }
    }

    // Sync tenant blocks
    const allBlocks = config.blocks || []
    for (const block of allBlocks) {
      const existingBlock = await adapter.findOne<any>('z_schemas', { slug: block.slug, siteId: finalSiteId })
      const blockPayload = {
        title: block.labels?.singular || block.title || block.name || block.slug,
        slug: block.slug,
        type: 'block',
        isGlobal: false,
        fields: block.fields || [],
        siteId: finalSiteId,
        admin: block.admin || { category: 'General', icon: 'Box' }
      }
      if (existingBlock) {
        await adapter.update('z_schemas', (existingBlock.id || existingBlock._id).toString(), blockPayload)
      } else {
        await adapter.create<any>('z_schemas', blockPayload)
      }
    }
    
    // Sync dummy data
    if (config.data) {
      for (const [colSlug, docs] of Object.entries(config.data)) {
        const docsArray = Array.isArray(docs) ? docs : [docs]
        for (const doc of (docsArray as any[])) {
          if (!doc.slug) {
            logger.warn(`Skipping seeding doc in ${colSlug} for site ${siteData.name}: No slug provided.`)
            continue
          }
          const query: any = { siteId: finalSiteId, slug: doc.slug }
          
          const payload = {
            ...doc,
            siteId: finalSiteId,
            _seed_meta: {
              source: filename,
              seededAt: new Date().toISOString(),
              version: 1
            }
          }

          const existingDoc = await adapter.findOne<any>(colSlug, query)
          if (existingDoc) {
            await adapter.update<any>(colSlug, (existingDoc.id || existingDoc._id).toString(), payload)
          } else {
            await adapter.create<any>(colSlug, payload)
          }
        }
      }
    }
  }
}

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

    await syncTenantFiles(adapter, defaultWorkspace, adminId)

    if (process.env.NODE_ENV === 'development') {
      const rootDir = path.resolve(__dirname, '../../../../')
      const tenantsDir = path.resolve(rootDir, 'config', 'tenants')
      if (fs.existsSync(tenantsDir)) {
        // Run watcher only once per process
        if (!(global as any).__zenithTenantWatcher) {
          (global as any).__zenithTenantWatcher = true
          
          let debounceTimeout: NodeJS.Timeout | null = null
          
          chokidar.watch(tenantsDir, { ignoreInitial: true })
            .on('change', (filename: string) => {
              if (filename && filename.endsWith('.json')) {
                if (debounceTimeout) clearTimeout(debounceTimeout)
                debounceTimeout = setTimeout(async () => {
                  logger.info(`[Tenant Watcher] Detected change in ${filename}, re-syncing...`)
                  try {
                    await syncTenantFiles(adapter, defaultWorkspace, adminId)
                  } catch (err: any) {
                    logger.error({ err: err.message }, 'Tenant hot-reload failed')
                  }
                }, 300) // 300ms debounce
              }
            })
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

    // Mark onboarding as complete since we are seeding data
    try {
      const onboarding = await adapter.findOne<any>('z_onboarding', {})
      if (!onboarding) {
        await adapter.create('z_onboarding', {
          currentStep: 7, // Must be a number to satisfy Mongoose schema
          completed: true,
          skipped: true,
          answers: {}
        })
        logger.info('[SeedEngine] Marked onboarding as complete')
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, '[SeedEngine] Failed to mark onboarding as complete')
    }

  } catch (error: any) {
    logger.error({ err: error.message, stack: error.stack }, 'Seeding failed')
  }
}

async function registerConfigCollections(adapter: DatabaseAdapter) {
  let config: any
  /* eslint-disable @typescript-eslint/no-require-imports */
  try {
    const path = require('path')
    const rootDir = path.resolve(__dirname, '../../../../')
    config = require(path.join(rootDir, 'cms.config')).default || require(path.join(rootDir, 'cms.config'))
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

