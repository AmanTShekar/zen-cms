import mongoose, { Schema, Document } from 'mongoose'

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId
  userEmail: string
  userName?: string
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'login'
  collectionName?: string
  documentId?: string
  changes?: any
  ip?: string
  userAgent?: string
  timestamp: Date
  status?: 'success' | 'failed'
  resource?: string
  siteId?: string
  hash?: string
  previousHash?: string
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    userName: { type: String },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'publish', 'unpublish', 'login'],
    },
    collectionName: { type: String },
    documentId: { type: String },
    changes: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ['success', 'failed'] },
    resource: { type: String },
    siteId: { type: String, required: true },
    hash: { type: String },
    previousHash: { type: String },
  },
  { strict: true }
)

// High-performance indexing for rapid sorting and filtering
AuditLogSchema.index({ timestamp: -1 })
AuditLogSchema.index({ collectionName: 1 })
AuditLogSchema.index({ userId: 1 })
AuditLogSchema.index({ siteId: 1 })
AuditLogSchema.index({ action: 1 })
AuditLogSchema.index({ status: 1 })

// Use a separate collection for audit logs to avoid cluttering main collections
export const AuditLogModel = mongoose.models.z_audit_logs || mongoose.model<IAuditLog>('z_audit_logs', AuditLogSchema)
