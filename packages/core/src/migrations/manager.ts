import mongoose from 'mongoose';
import { logger } from '../services/logger';

export interface Migration {
  name: string;
  up: (db: mongoose.Connection) => Promise<void>;
  down: (db: mongoose.Connection) => Promise<void>;
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
