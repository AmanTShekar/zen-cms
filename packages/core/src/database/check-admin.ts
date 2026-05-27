/**
 * Check admin user credentials in MongoDB
 * Run: npx tsx packages/core/src/database/check-admin.ts
 */
import mongoose from 'mongoose'
import '../database/user-model'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith'

async function checkAdmin() {
  await mongoose.connect(MONGODB_URI)
  const User = mongoose.model('User')

  const admin = (await User.findOne({ role: 'admin' }).lean()) as any
  if (!admin) {
    console.log('No admin user found!')
    await mongoose.disconnect()
    return
  }

  console.log('Admin user found:')
  console.log(`  Email: ${admin.email}`)
  console.log(`  Role: ${admin.role}`)
  console.log(`  failedLoginAttempts: ${admin.failedLoginAttempts}`)
  console.log(`  lockUntil: ${admin.lockUntil}`)
  // NOTE: intentionally NOT logging password hash or running plaintext password comparisons
  // to avoid leaking credentials into console/CI logs

  await mongoose.disconnect()
}

checkAdmin().catch(console.error)