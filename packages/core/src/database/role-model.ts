import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  roleName: { type: String, required: true },
  description: { type: String },
  isSystem: { type: Boolean, default: false },
  permissions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  hasWildcard: { type: Boolean, default: false },
  siteId: { type: String, required: true, index: true },
}, { strict: true, timestamps: true })

schema.index({ roleName: 1, siteId: 1 }, { unique: true })

export const RoleModel = mongoose.models.z_roles || mongoose.model('z_roles', schema)
