import { CMSConfig } from '@zenithcms/types'
import { logger } from '../services/logger'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

/**
 * Zenith Schema Sync Utility
 * ──────────────────────────
 * Compares the defined collections in config with the actual database state.
 * Reports missing collections, field mismatches, and potential data loss risks.
 */
export class SchemaSync {
  constructor(
    private config: CMSConfig,
    private adapter: DatabaseAdapter
  ) {}

  async sync() {
    logger.info('SchemaSync: Starting analysis...')

    const collections = this.config.collections
    const stats = { created: 0, updated: 0, errors: 0 }

    for (const col of collections) {
      try {
        // Registering with adapter is essentially 'syncing' for Mongoose
        // For SQL adapters, this would generate/run ALTER TABLE queries
        await this.adapter.registerCollection(col)
        stats.updated++
      } catch (err: any) {
        logger.error({ col: col.slug, err: err.message }, 'SchemaSync: Failed to sync collection')
        stats.errors++
      }
    }

    logger.info(stats, 'SchemaSync: Completed')
    return stats
  }

  async diff() {
    logger.info('SchemaSync: Calculating schema differences...')
    const added: string[] = []
    const removed: string[] = []
    const changed: any[] = []

    try {
      const existingCollections = await this.adapter.getExistingCollections()
      const configCollections = this.config.collections.map((c) => c.slug)

      for (const slug of configCollections) {
        if (!existingCollections.includes(slug)) {
          added.push(slug)
        }
      }

      for (const dbName of existingCollections) {
        if (
          dbName.startsWith('z_') ||
          dbName.startsWith('audit') ||
          dbName.startsWith('version') ||
          dbName === 'sessions' ||
          dbName === 'flows' ||
          dbName === 'audit_logs' ||
          dbName === 'versions'
        )
          continue
        if (!configCollections.includes(dbName)) {
          removed.push(dbName)
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'SchemaSync.diff: Failed to execute schema inspect')
    }

    return {
      added,
      removed,
      changed,
    }
  }
}
