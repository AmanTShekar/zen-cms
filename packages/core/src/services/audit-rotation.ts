import { env } from '../config/env';
/**
 * Defines retention policies for the Zenith CMS Audit Logs.
 * 
 * Global retention is applied if a collection does not specify
 * `auditRetentionDays` in its collection configuration.
 */

export const AUDIT_RETENTION_POLICIES = {
  // Default number of days to keep audit logs
  DEFAULT_RETENTION_DAYS: env.AUDIT_RETENTION_DAYS || 90,

  // If strict mode is enabled, we prevent any retention less than 30 days
  // to ensure compliance.
  MINIMUM_RETENTION_DAYS: 30,
}

/**
 * Helper to calculate the cutoff date for audit cleanup.
 */
export function getAuditCutoffDate(days: number): Date {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff
}

/**
 * Returns current audit retention configuration info.
 */
export async function getAuditRetentionInfo() {
  return {
    defaultRetentionDays: AUDIT_RETENTION_POLICIES.DEFAULT_RETENTION_DAYS,
    minimumRetentionDays: AUDIT_RETENTION_POLICIES.MINIMUM_RETENTION_DAYS,
    cutoffDate: getAuditCutoffDate(AUDIT_RETENTION_POLICIES.DEFAULT_RETENTION_DAYS),
  }
}

/**
 * Rotates (purges) audit logs older than the retention period.
 */
export async function rotateAuditLogs() {
  const cutoff = getAuditCutoffDate(AUDIT_RETENTION_POLICIES.DEFAULT_RETENTION_DAYS)
  // Rotation is handled by the database adapter's cleanup routine.
  // This function serves as the scheduled entry point.
  return { purgedBefore: cutoff.toISOString() }
}