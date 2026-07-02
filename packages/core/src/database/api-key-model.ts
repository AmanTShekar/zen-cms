import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  expiresAt: { type: Date },
  siteId: { type: String, required: true, index: true },
  revoked: { type: Boolean, default: false },
  revokedAt: { type: Date },
  lastUsed: { type: Date },
  allowedCollections: { type: [String], default: [] },
}, { strict: true, timestamps: true })
export const ApiKeyModel = mongoose.models.z_api_keys || mongoose.model('z_api_keys', schema)
