import 'dotenv/config'
import { Migrator } from '../src/database/migrator'
import { AdapterFactory } from '../src/database/adapters/AdapterFactory'
import { logger } from '../src/services/logger'

async function main() {
  try {
    logger.info('Migration Script Started')
    // Initialize adapter based on env
    const adapter = AdapterFactory.getActiveAdapter()
    await adapter.connect()
    
    // Run all pending migrations
    await Migrator.run()
    
    await adapter.disconnect()
    
    logger.info('Migration Script Completed Successfully')
    process.exit(0)
  } catch (err: any) {
    logger.fatal({ err: err.message }, 'Migration Script Failed')
    process.exit(1)
  }
}

main()
