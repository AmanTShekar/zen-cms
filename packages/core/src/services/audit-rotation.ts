/**
 * Audit Log Rotation Service
 * ──────────────────────────
 * Periodically purges audit log entries older than a configurable TTL.
 * Runs on a configurable cron schedule. Can be disabled via env var.
 */
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

export interface AuditRotationConfig {
  /** How long (in days) to retain audit logs. Default: 90 */
  retentionDays: number
  /** Cron expression for the rotation schedule. Default: '0 3 * * 0' (3am every Sunday) */
  schedule: string
}

const DEFAULT_CONFIG: AuditRotationConfig = {
  retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
  schedule: process.env.AUDIT_ROTATION_SCHEDULE || '0 3 * * 0',
}

/**
 * Purge audit log entries older than the configured retention period.
 */
export async function rotateAuditLogs(config: AuditRotationConfig = DEFAULT_CONFIG): Promise<number> {
  const cutoff = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000)

  try {
    const adapter = AdapterFactory.getActiveAdapter()
    if (!adapter) {
      logger.warn('AuditRotation: No active adapter — skipping rotation')
      return 0
    }

    let deleted = 0
    if (adapter.name === 'mongoose') {
      const { default: mongoose } = await import('mongoose')
      const model = mongoose.models['AuditLog']
      if (model) {
        const result = await model.deleteMany({ timestamp: { $lt: cutoff } }).exec()
        deleted = result.deletedCount
      }
    } else {
      // Postgres — use deleteMany with timestamp filter
      deleted = await adapter.deleteMany('audit_logs', { timestamp: { $lt: cutoff.toISOString() } })
    }

    if (deleted > 0) {
      logger.info({ deleted, retentionDays: config.retentionDays }, 'AuditRotation: Purged expired audit log entries')
    }

    return deleted
  } catch (err: any) {
    logger.error({ err: err.message }, 'AuditRotation: Failed to rotate audit logs')
    return 0
  }
}

/**
 * Get current audit log retention stats.
 */
export async function getAuditRetentionInfo(): Promise<{
  retentionDays: number
  oldestEntry: Date | null
  newestEntry: Date | null
  totalEntries: number
  estimatedPurgeCount: number
}> {
  const retentionDays = DEFAULT_CONFIG.retentionDays
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  let oldestEntry: Date | null = null
  let newestEntry: Date | null = null
  let totalEntries = 0
  let estimatedPurgeCount = 0

  try {
    const adapter = AdapterFactory.getActiveAdapter()
    if (adapter?.name === 'mongoose') {
      const { default: mongoose } = await import('mongoose')
      const model = mongoose.models['AuditLog']
      if (model) {
        totalEntries = await model.countDocuments({})
        estimatedPurgeCount = await model.countDocuments({ timestamp: { $lt: cutoff } })
        const oldest = await model.findOne({}).sort({ timestamp: 1 }).select('timestamp').lean().exec()
        const newest = await model.findOne({}).sort({ timestamp: -1 }).select('timestamp').lean().exec()
        if (oldest) oldestEntry = (oldest as any).timestamp
        if (newest) newestEntry = (newest as any).timestamp
      }
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'AuditRotation: Failed to get retention info')
  }

  return { retentionDays, oldestEntry, newestEntry, totalEntries, estimatedPurgeCount }
}

export default { rotateAuditLogs, getAuditRetentionInfo }