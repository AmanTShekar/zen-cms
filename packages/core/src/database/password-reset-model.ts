import mongoose, { Schema, Document } from 'mongoose'

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId
  token: string
  expiresAt: Date
  used: boolean
}

const PasswordResetSchema = new Schema<IPasswordResetToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'z_users', required: true },
  token: { type: String, required: true, unique: true }, // Stores SHA-256 hash of the raw token
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
})

// Auto-expire documents via MongoDB TTL index
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const PasswordResetModel = mongoose.model<IPasswordResetToken>(
  'z_password_resets',
  PasswordResetSchema
)
