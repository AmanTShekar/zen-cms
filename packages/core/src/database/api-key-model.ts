import mongoose, { Schema, Document } from 'mongoose'

export interface IApiKey extends Document {
  name: string
  key: string
  role: 'admin' | 'editor' | 'viewer'
  /** If set, this key can only access the listed collection slugs. Empty = unrestricted. */
  allowedCollections: string[]
  lastUsed?: Date
  expiresAt?: Date
  revoked: boolean
  createdAt: Date
}

const ApiKeySchema = new Schema<IApiKey>({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
  allowedCollections: { type: [String], default: [] },
  lastUsed: { type: Date },
  expiresAt: { type: Date },
  revoked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

export const ApiKeyModel = mongoose.model<IApiKey>('z_api_keys', ApiKeySchema)
