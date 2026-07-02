import mongoose, { Schema } from 'mongoose'

const lockSchema = new Schema(
  {
    collectionName: { type: String, required: true, index: true },
    documentId: { type: String, required: true, index: true },
    siteId: { type: String, required: true, index: true },
    lockedBy: { type: String, required: true },
    lockedByEmail: { type: String, required: true },
    lockedAt: { type: Date, default: Date.now },
    lockExpiresAt: { type: Date, required: true },
  }, { strict: true,  collection: 'z_locks', timestamps: false }
)

// Compound index for fast lock lookup
lockSchema.index({ collectionName: 1, documentId: 1, siteId: 1 }, { unique: true })

export const LockModel = mongoose.models.Lock || mongoose.model('Lock', lockSchema)