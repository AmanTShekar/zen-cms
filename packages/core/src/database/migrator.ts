import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import { AdapterFactory } from './adapters/AdapterFactory'
import { logger } from '../services/logger'
import { sql } from 'drizzle-orm'

/**
 * Zenith CMS — Database Migration Runner
 * ──────────────────────────────────────
 * Executes schema and data migrations programmatically across any supported database engine.
 * Ensures migrations run exactly once per environment by tracking state in `z_migrations`.
 */
export class Migrator {
  private static async ensureMigrationTable(adapter: import('@zenith-open/types').DatabaseAdapter) {
    if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
      try {
        await adapter.db.execute(`
          CREATE TABLE IF NOT EXISTS z_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            batch INTEGER NOT NULL DEFAULT 1,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `)
      } catch (err) {
        // Fallback for limited adapters
      }
    }
  }

  private static async getExecutedMigrations(adapter: import('@zenith-open/types').DatabaseAdapter): Promise<string[]> {
    try {
      if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
        const res = await adapter.db.execute(`SELECT name FROM z_migrations`)
        return res.rows.map((r: Record<string, unknown>) => r.name)
      } else {
        const migrations = await adapter.find('z_migrations', {})
        return migrations.map((m: Record<string, unknown>) => m.name)
      }
    } catch (err) {
      return []
    }
  }

  private static async markMigrationExecuted(adapter: import('@zenith-open/types').DatabaseAdapter, name: string) {
    if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
      await adapter.db.execute(sql`INSERT INTO z_migrations (name, batch) VALUES (${name}, 1)`)
    } else {
      await adapter.create('z_migrations', { name, batch: 1, executedAt: new Date() })
    }
  }

  private static async removeMigrationRecord(adapter: import('@zenith-open/types').DatabaseAdapter, name: string) {
    if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
      await adapter.db.execute(sql`DELETE FROM z_migrations WHERE name = ${name}`)
    } else {
      await adapter.deleteMany('z_migrations', { name })
    }
  }

  /**
   * Discovers and runs pending migrations in order.
   * @param continueOnError If true, halts on individual migration failures and keeps going.
   */
  public static async run(continueOnError = false) {
    const { withMigrationLock } = await import('../services/db-lock')

    await withMigrationLock('schema-migration', 60000, async () => {
      logger.info('Migrator: Initializing migration runner...')
      const adapter = AdapterFactory.getActiveAdapter()

      await this.ensureMigrationTable(adapter)
      const executed = await this.getExecutedMigrations(adapter)

      const migrationsDir = path.resolve(__dirname, 'migrations')
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true })
      }

      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.ts') || f.endsWith('.js'))
        .sort()

      const pending = files.filter((f) => !executed.includes(f))

      if (pending.length === 0) {
        logger.info('Migrator: Database is fully up-to-date. No pending migrations.')
        return
      }

      logger.info(`Migrator: Found ${pending.length} pending migrations.`)

      for (const file of pending) {
        try {
          logger.info(`Migrator: Executing ${file}...`)
          const migrationPath = path.join(migrationsDir, file)
          const migrationUrl = pathToFileURL(migrationPath).href
          const migration = await import(migrationUrl)

          if (typeof migration.up === 'function') {
            if (typeof migration.down !== 'function') {
              logger.warn(`Migrator: Migration ${file} does not export a 'down' function. Rollbacks will not be possible.`)
            }
            await migration.up(adapter)
            await this.markMigrationExecuted(adapter, file)
            logger.info(`Migrator: Successfully applied ${file}.`)
          } else {
            logger.warn(`Migrator: Skipping ${file} (no 'up' function exported)`)
          }
        } catch (err: unknown) {
          logger.error({ err }, `Migrator: Migration ${file} failed.`)
          if (continueOnError) {
            logger.warn(`Migrator: Continuing to next migration (continueOnError=true).`)
          } else {
            throw new Error(`Migration Failed: ${file} - ${err.message}`)
          }
        }
      }

      if (continueOnError) {
        logger.info('Migrator: All migrations processed with errors logged.')
      } else {
        logger.info('Migrator: All migrations applied successfully.')
      }
    })
  }

  /**
   * Rolls back the last executed migration.
   */
  public static async rollback() {
    const { withMigrationLock } = await import('../services/db-lock')

    await withMigrationLock('schema-migration', 60000, async () => {
      logger.info('Migrator: Initializing rollback...')
      const adapter = AdapterFactory.getActiveAdapter()

      await this.ensureMigrationTable(adapter)
      const executed = await this.getExecutedMigrations(adapter)

      if (executed.length === 0) {
        logger.info('Migrator: No migrations to roll back.')
        return
      }

      const lastExecuted = executed[executed.length - 1]
      const migrationsDir = path.resolve(__dirname, 'migrations')
      const migrationPath = path.join(migrationsDir, lastExecuted)

      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file ${lastExecuted} not found in ${migrationsDir}.`)
      }

      try {
        logger.info(`Migrator: Rolling back ${lastExecuted}...`)
        const migrationUrl = pathToFileURL(migrationPath).href
        const migration = await import(migrationUrl)

        if (typeof migration.down === 'function') {
          await migration.down(adapter)
          await this.removeMigrationRecord(adapter, lastExecuted)
          logger.info(`Migrator: Successfully rolled back ${lastExecuted}.`)
        } else {
          throw new Error(`Migration ${lastExecuted} does not export a 'down' function. Cannot rollback.`)
        }
      } catch (err: unknown) {
        logger.error({ err }, `Migrator: Rollback of ${lastExecuted} failed.`)
        throw new Error(`Rollback Failed: ${lastExecuted} - ${err.message}`)
      }
    })
  }
}
