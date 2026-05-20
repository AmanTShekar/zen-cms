import { DatabaseAdapter } from './BaseAdapter'
import { MongooseAdapter } from '@zenithcms/db-mongodb'
import { PostgresDrizzleAdapter } from '@zenithcms/db-postgres'
import { logger } from '../../services/logger'

/**
 * Zenith Database Adapter Factory
 * ──────────────────────────────
 * Solves the critical multi-database hybrid requirements.
 * Dynamically resolves, instantiates, and loads the appropriate database engine.
 */
export class AdapterFactory {
  private static activeAdapterInstance: DatabaseAdapter | null = null

  /**
   * Retrieves the globally active database adapter instance.
   * If none is registered, it lazily creates a default instance.
   */
  public static getActiveAdapter(): DatabaseAdapter {
    if (!this.activeAdapterInstance) {
      this.activeAdapterInstance = this.create()
    }
    return this.activeAdapterInstance
  }

  /**
   * Explicitly sets the active database adapter.
   */
  public static setActiveAdapter(adapter: DatabaseAdapter): void {
    this.activeAdapterInstance = adapter
  }

  /**
   * Creates the database adapter based on the environment uri or configuration
   */
  public static create(customUri?: string, customType?: 'mongodb' | 'postgres'): DatabaseAdapter {
    const mongoUri = process.env.MONGODB_URI
    const postgresUri = process.env.POSTGRES_URI || process.env.DATABASE_URL
    const dbType = customType || process.env.DATABASE_TYPE
    let adapter: DatabaseAdapter

    // Direct explicit selection
    if (dbType === 'postgres') {
      const uri = customUri || postgresUri || 'postgres://localhost:5432/zenith'
      logger.info({ adapter: 'postgres-drizzle' }, 'AdapterFactory: Selected PostgreSQL.')
      adapter = new PostgresDrizzleAdapter(uri)
    } else if (dbType === 'mongodb') {
      const uri = customUri || mongoUri || 'mongodb://localhost:27017/zenith'
      logger.info({ adapter: 'mongoose' }, 'AdapterFactory: Selected MongoDB.')
      adapter = new MongooseAdapter(uri)
    } else if (customUri) {
      // Auto-detection based on custom uri prefix
      if (customUri.startsWith('postgres://') || customUri.startsWith('postgresql://')) {
        logger.info(
          { adapter: 'postgres-drizzle' },
          'AdapterFactory: Auto-detected PostgreSQL URI.'
        )
        adapter = new PostgresDrizzleAdapter(customUri)
      } else {
        logger.info({ adapter: 'mongoose' }, 'AdapterFactory: Fallback to MongoDB URI.')
        adapter = new MongooseAdapter(customUri)
      }
    } else if (postgresUri && !mongoUri) {
      // Auto-detection based on environment variables presence
      logger.info({ adapter: 'postgres-drizzle' }, 'AdapterFactory: Auto-detected POSTGRES_URI.')
      adapter = new PostgresDrizzleAdapter(postgresUri)
    } else {
      // Fallback to default mongodb uri
      if (!mongoUri && !postgresUri) {
        console.warn('\x1b[33m%s\x1b[0m', `
┌────────────────────────────────────────────────────────────┐
│                  ⚠️  ZENITH STARTUP WARNING  ⚠️             │
├────────────────────────────────────────────────────────────┤
│ No active database environment variables were detected.    │
│ Please check that you have created a .env file from the    │
│ .env.example template.                                    │
│                                                            │
│ Expected: MONGODB_URI or POSTGRES_URI / DATABASE_URL       │
│ Defaulting to local MongoDB: mongodb://localhost:27017     │
└────────────────────────────────────────────────────────────┘
        `)
      }
      const uri = mongoUri || 'mongodb://localhost:27017/zenith'
      logger.info({ adapter: 'mongoose' }, 'AdapterFactory: Default Mongoose Adapter Selected.')
      adapter = new MongooseAdapter(uri)
    }

    if (!this.activeAdapterInstance) {
      this.activeAdapterInstance = adapter
    }
    return adapter
  }
}
