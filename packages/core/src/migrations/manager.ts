import mongoose from 'mongoose';
import { logger } from '../services/logger';

export interface Migration {
  name: string;
  up: (db: mongoose.Connection) => Promise<void>;
  down: (db: mongoose.Connection) => Promise<void>;
}

/**
 * Zenith Migration Manager
 * ────────────────────────
 * Handles database schema migrations and data transformations.
 */
export class MigrationManager {
  static async run(migrations: Migration[]) {
    const db = mongoose.connection;
    logger.info(`Checking ${migrations.length} migrations...`);
    
    // In a real system, we would check a 'z_migrations' collection here
    // to see which ones have already run.
    for (const m of migrations) {
      try {
        logger.info(`Running migration: ${m.name}`);
        await m.up(db);
      } catch (err) {
        logger.error({ err }, `Migration failed: ${m.name}`);
        throw err;
      }
    }
  }
}
