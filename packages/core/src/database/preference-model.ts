import mongoose, { Schema, Document } from 'mongoose'

export interface IUserPreference extends Document {
  userId: mongoose.Types.ObjectId
  key: string
  value: unknown
  siteId?: string
  updatedAt: Date
}

const UserPreferenceSchema = new Schema<IUserPreference>({
  userId: { type: Schema.Types.ObjectId, ref: 'z_users', required: true, index: true },
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  siteId: { type: String, index: true },
  updatedAt: { type: Date, default: Date.now },
})

// Compound index — one preference per user per key per site
UserPreferenceSchema.index({ userId: 1, key: 1, siteId: 1 }, { unique: true })

export const UserPreferenceModel = mongoose.model<IUserPreference>(
  'z_preferences',
  UserPreferenceSchema
)
