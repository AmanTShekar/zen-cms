import { DatabaseAdapter } from './BaseAdapter'
import { MongooseAdapter } from '@zenith-open/zenithcms-db-mongodb'
import { PostgresDrizzleAdapter } from '@zenith-open/zenithcms-db-postgres'
import { logger } from '../../services/logger'
import { resolveDatabaseConfig } from './resolver'

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
    const config = resolveDatabaseConfig(customUri, customType)
    let adapter: DatabaseAdapter

    if (config.type === 'postgres') {
      logger.info({ adapter: 'postgres-drizzle' }, 'AdapterFactory: Selected PostgreSQL.')
      adapter = new PostgresDrizzleAdapter(config.uri)
    } else {
      logger.info({ adapter: 'mongoose' }, 'AdapterFactory: Selected MongoDB.')
      adapter = new MongooseAdapter(config.uri)
    }

    if (!this.activeAdapterInstance) {
      this.activeAdapterInstance = adapter
    }
    return adapter
  }
}
