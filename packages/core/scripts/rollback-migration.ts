import 'dotenv/config'
import { Migrator } from '../src/database/migrator'
import { AdapterFactory } from '../src/database/adapters/AdapterFactory'
import { logger } from '../src/services/logger'

async function main() {
  try {
    logger.info('Migration Rollback Script Started')
    // Initialize adapter based on env
    const adapter = AdapterFactory.getActiveAdapter()
    await adapter.connect()
    
    // Roll back the last executed migration
    await Migrator.rollback()

    await adapter.disconnect()
    
    logger.info('Migration Rollback Script Completed Successfully')
    process.exit(0)
  } catch (err: any) {
    logger.fatal({ err: err.message }, 'Migration Rollback Script Failed')
    process.exit(1)
  }
}

main()
