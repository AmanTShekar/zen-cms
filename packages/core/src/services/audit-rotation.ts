/**
 * Defines retention policies for the Zenith CMS Audit Logs.
 * 
 * Global retention is applied if a collection does not specify
 * `auditRetentionDays` in its collection configuration.
 */

export const AUDIT_RETENTION_POLICIES = {
  // Default number of days to keep audit logs
  DEFAULT_RETENTION_DAYS: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),

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