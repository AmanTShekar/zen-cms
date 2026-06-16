import mongoose from 'mongoose'
const schema = new mongoose.Schema({}, { strict: false, timestamps: true })
export const UserModel = mongoose.models.User || mongoose.model('User', schema)
