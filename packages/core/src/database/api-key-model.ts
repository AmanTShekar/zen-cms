import mongoose from 'mongoose'
const schema = new mongoose.Schema({}, { strict: false, timestamps: true })
export const ApiKeyModel = mongoose.models.z_api_keys || mongoose.model('z_api_keys', schema)
