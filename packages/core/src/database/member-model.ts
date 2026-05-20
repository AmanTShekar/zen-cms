import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcrypt'

export interface IMember extends Document {
  email: string
  password?: string
  name?: string
  avatar?: string
  isSubscribed: boolean
  subscriptionStatus: 'none' | 'trialing' | 'active' | 'canceled' | 'past_due'
  stripeCustomerId?: string
  metadata: Record<string, unknown>
  lastLogin?: Date
  comparePassword: (password: string) => Promise<boolean>
}

const MemberSchema = new Schema<IMember>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false,
    },
    name: { type: String },
    avatar: { type: String },
    isSubscribed: { type: Boolean, default: false },
    subscriptionStatus: {
      type: String,
      enum: ['none', 'trialing', 'active', 'canceled', 'past_due'],
      default: 'none',
    },
    stripeCustomerId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    lastLogin: { type: Date },
  },
  { timestamps: true }
)

MemberSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

MemberSchema.methods.comparePassword = async function (candidatePassword: string) {
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

export const MemberModel = mongoose.model<IMember>('z_members', MemberSchema)
