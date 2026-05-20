import { logger } from '../packages/core/src/services/logger'
import { seedInitialData } from '../packages/core/src/database/seed'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Zenith Setup Script
 * ───────────────────
 * Prepares the environment, checks DB connectivity, and seeds data.
 */
async function setup() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith'
    await mongoose.connect(mongoUri)
    logger.info('Database connected for setup')

    await seedInitialData()

    logger.info('Zenith Setup Complete! You can now run "pnpm dev"')
    process.exit(0)
  } catch (err) {
    logger.error('Setup failed', err)
    process.exit(1)
  }
}

setup()
