import 'dotenv/config'
import { Migrator } from '../src/database/migrator'
import { AdapterFactory } from '../src/database/adapters/AdapterFactory'
import { logger } from '../src/services/logger'

async function main() {
  try {
    logger.info('Migration Script Started')
    // Initialize adapter based on env
    AdapterFactory.getActiveAdapter()
    
    // Run all pending migrations
    await Migrator.run()
    
    logger.info('Migration Script Completed Successfully')
    process.exit(0)
  } catch (err: any) {
    logger.fatal({ err: err.message }, 'Migration Script Failed')
    process.exit(1)
  }
}

main()
