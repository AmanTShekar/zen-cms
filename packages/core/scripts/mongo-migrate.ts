import 'dotenv/config'
import { Migrator } from '../src/database/migrator'
import { AdapterFactory } from '../src/database/adapters/AdapterFactory'
import { logger } from '../src/services/logger'

/**
 * Zenith CMS - MongoDB Migration Runner
 * ──────────────────────────────────────
 * Since Zenith's `Migrator` class is natively adapter-agnostic (using `adapter.find` and `adapter.create`),
 * this script serves as the explicit entry point for running data/schema migrations on MongoDB clusters.
 * 
 * To write a MongoDB migration:
 * 1. Create a file in `scripts/migrations/YYYYMMDD-my-mongo-migration.ts`
 * 2. Export an `async function up(adapter: DatabaseAdapter)`
 * 3. Use `adapter.getNativeClient<MongoClient>()` or standard `adapter.updateMany` inside it.
 */
async function main() {
  try {
    logger.info('MongoDB Migration Script Started')
    const adapter = AdapterFactory.getActiveAdapter()
    
    // Explicit guard to ensure this is only run when intending to migrate Mongo.
    // Drizzle has its own schema sync, but this runner will work on both for data migrations.
    if (adapter.name !== 'mongodb' && adapter.name !== 'MongoDB') {
      logger.warn(`You are running mongo-migrate on a ${adapter.name} adapter. Data migrations will still execute safely.`)
    }

    await adapter.connect()
    
    // Run all pending migrations
    await Migrator.run()
    
    await adapter.disconnect()
    
    logger.info('MongoDB Migration Script Completed Successfully')
    process.exit(0)
  } catch (err: any) {
    logger.fatal({ err: err.message }, 'MongoDB Migration Script Failed')
    process.exit(1)
  }
}

main()
