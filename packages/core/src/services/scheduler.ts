import { CollectionConfig } from '@zenithcms/types'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { logger } from './logger'
import { publishReleaseContent } from '../api/releases'
import { AuditLogModel } from '../database/audit-model'
import { AUDIT_RETENTION_POLICIES, getAuditCutoffDate } from './audit-rotation'

let lockClient: any = null

/**
 * Attempts to acquire a distributed lock via Redis.
 * If Redis is not configured, it gracefully defaults to true for single-node setups.
 */
async function acquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    // Single node setup: lock is always acquired locally
    return true
  }

  try {
    if (!lockClient) {
      /* eslint-disable-next-line @typescript-eslint/no-require-imports */
      const RedisClass = require('ioredis')
      lockClient = new RedisClass(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
      })
      lockClient.on('error', (err: any) => {
        logger.error({ err }, 'Scheduler Lock: Redis connection error')
      })
    }

    // Set the key only if it does not exist (NX) with an expiration (PX)
    const result = await lockClient.set(lockKey, 'locked', 'PX', ttlMs, 'NX')
    return result === 'OK'
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Scheduler Lock: Failed to contact Redis. Defaulting to local execution.')
    return true
  }
}

/**
 * Zenith Scheduler Service
 * ───────────────────────
 * Background worker that handles post scheduling.
 * Periodically checks for 'draft' posts with 'scheduledAt' <= now and publishes them.
 */
export class SchedulerService {
  private static interval: NodeJS.Timeout | null = null
  private static adapter: DatabaseAdapter

  /** Alias start as init to match engine bootstrap call */
  static init(collections: CollectionConfig[], adapter: DatabaseAdapter) {
    this.adapter = adapter
    return this.start(collections)
  }

  static start(collections: CollectionConfig[]) {
    if (this.interval) return

    logger.info('Scheduler service: started')

    this.interval = setInterval(async () => {
      // 1. Attempt to acquire distributed lock for this tick (expires in 45s)
      const hasLock = await acquireLock('zenith_scheduler_publish_lock', 45000)
      if (!hasLock) {
        return
      }

      for (const config of collections) {
        if (!config.scheduling || !config.drafts) continue

        try {
          const now = new Date()

          const modifiedCount = await this.adapter.updateMany(
            config.slug,
            {
              _status: 'draft',
              scheduledAt: { $lte: now },
            },
            {
              _status: 'published',
              scheduledAt: null,
            }
          )

          if (modifiedCount > 0) {
            logger.info(
              { collection: config.slug, count: modifiedCount },
              'Scheduled content published'
            )
          }
        } catch (err) {
          logger.error({ err, collection: config.slug }, 'Scheduler failed for collection')
        }
      }

      // 3. Process Scheduled Releases
      try {
        const now = new Date()
        const pendingReleases = await this.adapter.find('z_releases', {
          status: 'pending',
          scheduledAt: { $lte: now.toISOString() },
        })

        for (const release of pendingReleases) {
          logger.info(`[Scheduler] Processing scheduled release: ${(release as any).name}`)

          // Execute publish
          // We provide a system user mock and the release's siteId
          const mockUser = { role: 'admin', email: 'system@zenithcms.local' }
          const siteId = (release as any).siteId || 'default'

          const result = await publishReleaseContent(
            release,
            this.adapter,
            { collections }, // mock config
            mockUser,
            siteId
          )

          if (result.success) {
            await this.adapter.update('z_releases', (release as any)._id, { status: 'published' })
            logger.info(`[Scheduler] Successfully published release: ${(release as any).name}`)
          } else {
            await this.adapter.update('z_releases', (release as any)._id, { status: 'failed', failureReason: result.error })
            logger.error({ error: result.error }, `[Scheduler] Failed to publish release: ${(release as any).name}`)
          }
        }
      } catch (err) {
        logger.error({ err }, 'Scheduler failed to process releases')
      }

      // 4. Process Audit Log Retention (Garbage Collection)
      try {
        const defaultCutoff = getAuditCutoffDate(AUDIT_RETENTION_POLICIES.DEFAULT_RETENTION_DAYS)
        
        // Step 4a. Delete generic logs using default retention
        await AuditLogModel.deleteMany({
          collectionName: { $nin: collections.filter(c => (c as any).auditRetentionDays).map(c => c.slug) },
          timestamp: { $lte: defaultCutoff }
        })

        // Step 4b. Process collection-specific retention rules
        for (const config of collections) {
          const customRetention = (config as any).auditRetentionDays
          if (typeof customRetention === 'number') {
            const days = Math.max(customRetention, AUDIT_RETENTION_POLICIES.MINIMUM_RETENTION_DAYS)
            const cutoff = getAuditCutoffDate(days)
            await AuditLogModel.deleteMany({
              collectionName: config.slug,
              timestamp: { $lte: cutoff }
            })
          }
        }
      } catch (err) {
        logger.error({ err }, 'Scheduler failed to clean up audit logs')
      }

    }, 60000) // Check every minute
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    if (lockClient) {
      lockClient.quit().catch(() => {})
      lockClient = null
    }
  }
}
