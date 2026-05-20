import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  role: 'admin' | 'editor' | 'viewer'
  // ── Account lockout ────────────────────────────────────────────────────────
  failedLoginAttempts: number
  lockUntil: Date | null
  // ── Email verification ─────────────────────────────────────────────────────
  emailVerified: boolean
  verificationToken: string | null
  verificationTokenExpiry: Date | null
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'],
      default: 'editor',
    },
    // ── Account lockout ──────────────────────────────────────────────────────
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    // ── Email verification ───────────────────────────────────────────────────
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
      index: { sparse: true },
    },
    verificationTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
