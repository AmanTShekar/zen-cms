import fs from 'fs'
import path from 'path'
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
  private static async ensureMigrationTable(adapter: any) {
    if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
      try {
        await adapter.db.execute(`
          CREATE TABLE IF NOT EXISTS z_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `)
      } catch (err) {
        // Fallback for limited adapters
      }
    }
  }

  private static async getExecutedMigrations(adapter: any): Promise<string[]> {
    try {
      if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
        const res = await adapter.db.execute(`SELECT name FROM z_migrations`)
        return res.rows.map((r: any) => r.name)
      } else {
        const migrations = await adapter.find('z_migrations', {})
        return migrations.map((m: any) => m.name)
      }
    } catch (err) {
      return []
    }
  }

  private static async markMigrationExecuted(adapter: any, name: string) {
    if (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle') {
      await adapter.db.execute(sql`INSERT INTO z_migrations (name) VALUES (${name})`)
    } else {
      await adapter.create('z_migrations', { name, executedAt: new Date() })
    }
  }

  /**
   * Discovers and runs pending migrations in order.
   * @param continueOnError If true, halts on individual migration failures and keeps going.
   */
  public static async run(continueOnError = false) {
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
        const migration = await import(migrationPath)

        if (typeof migration.up === 'function') {
          await migration.up(adapter)
          await this.markMigrationExecuted(adapter, file)
          logger.info(`Migrator: Successfully applied ${file}.`)
        } else {
          logger.warn(`Migrator: Skipping ${file} (no 'up' function exported)`)
        }
      } catch (err: any) {
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
  }
}
