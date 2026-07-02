import { DatabaseAdapter } from '../database/adapters/BaseAdapter';
import { logger } from '../services/logger';
import path from 'path';
import fs from 'fs/promises';

export async function runStartupReconciliation(adapter: DatabaseAdapter, config: any) {
  // Sync static configs to database registry
  let dbCollections: any[] = []
  try {
    dbCollections = await adapter.find<any>('z_collections', {})
    logger.info(`[Zenith Engine] Loaded ${dbCollections.length} dynamic collections from database registry`)
  } catch (err: any) {
    logger.info({ err: err.message }, '[Zenith Engine] No dynamic collections found or z_collections not yet initialized')
  }

  try {
    const hardcoded = [
      ...(config.collections || []).map((c: any) => ({ ...c, isGlobal: false })),
      ...(config.globals || []).map((g: any) => ({ ...g, isGlobal: true }))
    ]
    
    for (const hc of hardcoded) {
      if (hc.slug === 'z_users' || hc.slug === 'z_sites' || hc.slug === 'z_collections' || hc.slug === 'z_schemas' || hc.slug === 'z_webhook_configs') continue

      const existing = dbCollections.find(dbC => dbC.slug === hc.slug)
      const payload = {
        name: hc.name,
        slug: hc.slug,
        labels: hc.labels || { singular: hc.name, plural: hc.name.toLowerCase().endsWith('s') ? hc.name : hc.name + 's' },
        isGlobal: hc.isGlobal,
        drafts: hc.drafts ?? false,
        timestamps: hc.timestamps ?? true,
        publicRead: hc.publicRead ?? false,
        fields: hc.fields || []
      }
      if (!existing) {
        const newDoc = await adapter.create('z_collections', payload)
        dbCollections.push(newDoc)
        logger.info(`[Startup Reconciliation] Synced static schema ${hc.slug} to z_collections registry`)
      } else {
        await adapter.update('z_collections', existing.id || existing._id, payload)
        logger.info(`[Startup Reconciliation] Updated existing schema ${hc.slug} in z_collections registry`)
        Object.assign(existing, payload)
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, '[Zenith Engine] Failed to sync static collections to z_collections')
  }

  // Startup Reconciliation Check for Blocks
  try {
    const blocksDir = path.resolve(__dirname, '../../../../config/blocks')
    const jsonSlugs = new Set<string>()
    try {
      await fs.access(blocksDir)
      const files = await fs.readdir(blocksDir)
      files.filter(f => f.endsWith('.json')).forEach(f => jsonSlugs.add(f.replace(/\.json$/, '')))
    } catch (e) {
      // blocksDir does not exist, ignore
    }
    
    let dbSchemas: any[] = []
    try {
      dbSchemas = await adapter.find<any>('z_schemas', {})
    } catch (e) {
        // z_schemas might not exist yet
    }

    const dbSlugs = new Set(dbSchemas.map((s: any) => s.slug))
    
    // 1. Check for orphaned .json files (File exists, DB missing)
    for (const slug of jsonSlugs) {
      if (!dbSlugs.has(slug)) {
        logger.error(`[Startup Reconciliation] CRITICAL: Orphaned file ${slug}.json found in config/blocks without a corresponding z_schemas DB record. Action Required: Manually run a reconciliation command or re-generate the block via the builder.`)
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, '[Zenith Engine] Block reconciliation check failed or z_schemas not yet initialized')
  }

  return dbCollections;
}
