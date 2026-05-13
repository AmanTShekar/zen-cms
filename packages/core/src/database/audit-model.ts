import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  action: 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'login';
  collectionName?: string;
  documentId?: string;
  changes?: unknown;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String, required: true },
  action: { type: String, required: true, enum: ['create', 'update', 'delete', 'publish', 'unpublish', 'login'] },
  collectionName: { type: String },
  documentId: { type: String },
  changes: { type: Schema.Types.Mixed },
  ip: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Use a separate collection for audit logs to avoid cluttering main collections
export const AuditLogModel = mongoose.model<IAuditLog>('z_audit_logs', AuditLogSchema);
