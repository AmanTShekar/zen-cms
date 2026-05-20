import { logger } from '../services/logger'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

export interface Migration {
  name: string
  up: (adapter: DatabaseAdapter, session?: any) => Promise<void>
  down: (adapter: DatabaseAdapter, session?: any) => Promise<void>
}

/**
 * ZENITH MIGRATION ENGINE
 * ───────────────────────
 * Orchestrates database schema evolution and transactional data transformations.
 *
 * DESIGN PRINCIPLES:
 * 1. Idempotency: Every migration must check if the change is already applied before executing.
 * 2. Reversibility: The 'down' method must accurately revert all changes made by 'up'.
 * 3. Atomic Handshakes: Failures should trigger a halt to prevent corrupt registry states.
 */
export class MigrationManager {
  static async run(migrations: Migration[]) {
    const adapter = AdapterFactory.getActiveAdapter()
    if (!adapter) {
      logger.warn('[MigrationManager] No active database adapter found. Skipping migrations.')
      return
    }

    logger.info(`[MigrationManager] Checking ${migrations.length} registered migrations...`)

    // Fetch already executed migrations
    let executedDocs: any[] = []
    const existingCollections = await adapter.getExistingCollections()
    
    if (existingCollections.includes('z_migrations')) {
      try {
        executedDocs = await adapter.find<any>('z_migrations', {})
      } catch (err: any) {
        logger.error({ err: err.message }, '[MigrationManager] Failed to read z_migrations table despite it existing. Aborting to prevent corruption.')
        throw err
      }
    } else {
      logger.info('[MigrationManager] z_migrations table not found. It will be initialized on first write.')
    }

    const executedNames = new Set<string>(executedDocs.map((d: any) => d.name))
    const currentBatch = Math.max(0, ...executedDocs.map((d: any) => d.batch || 0))
    const nextBatch = currentBatch + 1

    for (const m of migrations) {
      if (executedNames.has(m.name)) {
        logger.debug(`[MigrationManager] Migration "${m.name}" already executed. Skipping.`)
        continue
      }

      try {
        logger.info(`[MigrationManager] Applying migration: "${m.name}" (Batch ${nextBatch})`)
        
        // Execute migration inside atomic transaction
        await adapter.transaction(async (session) => {
          await m.up(adapter, session)
          await adapter.create(
            'z_migrations',
            {
              name: m.name,
              batch: nextBatch,
              executedAt: new Date(),
            },
            { session }
          )
        })

        logger.info(`[MigrationManager] Migration "${m.name}" completed successfully.`)
      } catch (err: any) {
        logger.error({ err: err.message }, `[MigrationManager] Migration failed: "${m.name}". Rolling back.`)
        throw err
      }
    }
  }
}
