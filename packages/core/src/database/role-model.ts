import mongoose from 'mongoose'
const schema = new mongoose.Schema({}, { strict: false, timestamps: true })
export const RoleModel = mongoose.models.z_roles || mongoose.model('z_roles', schema)
