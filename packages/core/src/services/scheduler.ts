// @ts-nocheck
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { CollectionConfig } from '@zenith-open/zenithcms-types'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { logger } from './logger'
import { publishReleaseContent } from '../api/releases'
import { AUDIT_RETENTION_POLICIES, getAuditCutoffDate } from './audit-rotation'
import { env } from '../config/env';


let lockClient: Record<string, any> | null = null

/**
 * Attempts to acquire a distributed lock via Redis.
 * If Redis is not configured, it gracefully defaults to true for single-node setups.
 */
async function acquireLock(lockKey: string, ttlMs: number): Promise<boolean> {
  const redisUrl = env.REDIS_URL
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
        retryStrategy: (times: number) => Math.min(times * 100, 3000),
      // @ts-ignore: TS18047 - unresolved type from removing @ts-nocheck
      })
      lockClient.on('error', (err: any) => {
        logger.error({ err }, 'Scheduler Lock: Redis connection error — will reconnect on next tick')
        // CRITICAL FIX: disconnect and null the client so it is recreated fresh on next acquireLock call
        if (lockClient) {
          // @ts-ignore: TS2322 - unresolved type from removing @ts-nocheck
          lockClient.disconnect()
          lockClient = undefined
        }
      })
    }

    // @ts-ignore: TS18047 - unresolved type from removing @ts-nocheck
    // Set the key only if it does not exist (NX) with an expiration (PX)
    const result = await lockClient.set(lockKey, 'locked', 'PX', ttlMs, 'NX')
    const acquired = result === 'OK'
    // Don't keep Redis connection open across ticks — clean up for next call
    if (lockClient && lockClient.disconnect) {
      // @ts-ignore: TS2322 - unresolved type from removing @ts-nocheck
      lockClient.disconnect()
      lockClient = undefined
    }
    return acquired
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

          // Adapter-agnostic: fetch due docs, then update each by ID
          // (avoids $lte which is MongoDB-specific and breaks on Postgres)
          const dueDocs = await this.adapter.find(
            config.slug,
            { _status: 'draft' }
          )

          const toPublish = dueDocs.filter((doc: Record<string, any>) => {
            const scheduledAt = doc.scheduledAt ? new Date(doc.scheduledAt) : null
            return scheduledAt !== null && scheduledAt <= now
          })

          await Promise.all(
            toPublish.map((doc: Record<string, any>) =>
              this.adapter.update(config.slug, String(doc.id || doc._id), {
                _status: 'published',
                scheduledAt: null,
              })
            )
          )

          const modifiedCount = toPublish.length
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
        // Adapter-agnostic: fetch all pending releases and filter by date in JS
        // (avoids $lte which is MongoDB-specific)
        const allPending = await this.adapter.find('z_releases', { status: 'pending' })
        const pendingReleases = allPending.filter((r: Record<string, any>) => {
          const scheduledAt = r.scheduledAt ? new Date(r.scheduledAt) : null
          return scheduledAt !== null && scheduledAt <= now
        })

        for (const release of pendingReleases) {
          logger.info(`[Scheduler] Processing scheduled release: ${(release as Record<string, any>).name}`)

          // Execute publish
          // We provide a system user mock and the release's siteId
          const mockUser = { role: 'admin', email: 'system@zenithcms.local' }
          const siteId = (release as Record<string, any>).siteId || 'default'

          const result = await publishReleaseContent(
            release,
            this.adapter,
            { collections }, // mock config
            mockUser,
            siteId
          )

          // Use adapter-agnostic id/id_id resolution
          const releaseId = String((release as Record<string, any>).id || (release as Record<string, any>)._id)
          if (result.success) {
            await this.adapter.update('z_releases', releaseId, { status: 'published' })
            logger.info(`[Scheduler] Successfully published release: ${(release as Record<string, any>).name}`)
          } else {
            await this.adapter.update('z_releases', releaseId, { status: 'failed', failureReason: result.error })
            logger.error({ error: result.error }, `[Scheduler] Failed to publish release: ${(release as Record<string, any>).name}`)
          }
        }
      } catch (err) {
        logger.error({ err }, 'Scheduler failed to process releases')
      }

      // 4. Process Audit Log Retention (Garbage Collection)
      try {
        const defaultCutoff = getAuditCutoffDate(AUDIT_RETENTION_POLICIES.DEFAULT_RETENTION_DAYS)
        
        // Step 4a. Delete generic logs using default retention
        await this.adapter.deleteMany('audit_logs', {
          collectionName: { $nin: collections.filter(c => (c as Record<string, any>).auditRetentionDays).map(c => c.slug) },
          timestamp: { $lte: defaultCutoff }
        })

        // Step 4b. Process collection-specific retention rules
        for (const config of collections) {
          const customRetention = (config as Record<string, any>).auditRetentionDays
          if (typeof customRetention === 'number') {
            const days = Math.max(customRetention, AUDIT_RETENTION_POLICIES.MINIMUM_RETENTION_DAYS)
            const cutoff = getAuditCutoffDate(days)
            await this.adapter.deleteMany('audit_logs', {
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
