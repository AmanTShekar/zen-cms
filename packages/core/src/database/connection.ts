import mongoose from 'mongoose'
import { logger } from '../services/logger'

const MAX_RETRIES = parseInt(process.env.DB_CONNECT_MAX_RETRIES || '5', 10)
const RETRY_DELAY_MS = parseInt(process.env.DB_CONNECT_RETRY_DELAY_MS || '3000', 10)

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith'

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '100', 10),
        serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
        socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT_MS || '45000', 10),
      })
      logger.info({ attempt }, 'Connected to MongoDB')
      return mongoose
    } catch (error: any) {
      logger.error({ attempt, error: error.message }, `MongoDB connection failed`)
      if (attempt < MAX_RETRIES) {
        logger.info({ nextAttemptIn: RETRY_DELAY_MS }, 'Retrying database connection...')
        await sleep(RETRY_DELAY_MS)
      } else {
        logger.fatal('Could not connect to MongoDB after all retries. Exiting.')
        process.exit(1)
      }
    }
  }

  // TypeScript requires a return — never reached
  throw new Error('Failed to connect to database')
}

export async function closeDatabaseConnection(): Promise<void> {
  await mongoose.disconnect()
  logger.info('Disconnected from MongoDB')
}

export function getHealthStatus(): 'ok' | 'connecting' | 'disconnected' | 'error' {
  const state = mongoose.connection.readyState
  switch (state) {
    case 0:
      return 'disconnected'
    case 1:
      return 'ok'
    case 2:
      return 'connecting'
    case 3:
      return 'disconnected'
    default:
      return 'error'
  }
}

// Graceful shutdown — called on SIGTERM/SIGINT
export function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal')
    await closeDatabaseConnection()
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
