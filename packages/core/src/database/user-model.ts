import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  role: { type: String },
  siteId: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
}, { strict: true, timestamps: true })

schema.index({ email: 1, siteId: 1 }, { unique: true })
export const UserModel = mongoose.models.User || mongoose.model('User', schema)
