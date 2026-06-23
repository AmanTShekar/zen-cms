import Client from 'ioredis'
import Redlock from 'redlock'
import { logger } from './logger'
import { env } from '../config/env';


let redlock: Redlock | null = null

export function initRedlock(redisUrl?: string): Redlock | null {
  if (redlock) return redlock

  const url = redisUrl || env.REDIS_URL
  if (!url) {
    logger.warn('[Redlock] REDIS_URL not provided. Distributed DB locks will fall back to single-process mode.')
    return null
  }

  try {
    const client = new Client(url, { maxRetriesPerRequest: null })
    redlock = new Redlock(
      [client],
      {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 1000,
        retryJitter: 200,
        automaticExtensionThreshold: 500,
      }
    )
    
    redlock.on('error', (error) => {
      // Ignored: Redlock will handle retries internally.
    })

    return redlock
  } catch (err: unknown) {
    logger.error({ err: err.message }, '[Redlock] Failed to initialize distributed lock client.')
    return null
  }
}

/**
 * Acquires a distributed lock to prevent cross-tenant schema collisions during DDL operations.
 * If Redis is not available, executes the callback without a distributed lock (assumes single pod).
 */
export async function withMigrationLock<T>(resourceName: string, ttlMs: number, callback: () => Promise<T>): Promise<T> {
  const lockManager = initRedlock()

  if (!lockManager) {
    logger.info(`[Redlock] Executing ${resourceName} without distributed lock (Redis unavailable)`)
    return await callback()
  }

  logger.info(`[Redlock] Attempting to acquire lock on ${resourceName}...`)
  
  let lock: Record<string, unknown> | null = null
  try {
    lock = await lockManager.acquire([`zenith:lock:${resourceName}`], ttlMs)
    logger.info(`[Redlock] Acquired lock on ${resourceName}. Executing...`)
    const result = await callback()
    return result
  } catch (err: unknown) {
    logger.error({ err: err.message }, `[Redlock] Failed to acquire lock for ${resourceName} or callback threw error.`)
    throw err
  } finally {
    if (lock) {
      try {
        await lock.release()
        logger.info(`[Redlock] Released lock on ${resourceName}`)
      } catch (err: unknown) {
        logger.warn({ err: err.message }, `[Redlock] Failed to release lock on ${resourceName} cleanly.`)
      }
    }
  }
}
