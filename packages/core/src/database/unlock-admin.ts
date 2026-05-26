/**
 * Unlock Admin Account Script
 * ────────────────────────────
 * Clears the brute-force lockout on the admin user in MongoDB.
 * Run: npx tsx packages/core/src/database/unlock-admin.ts
 */
import mongoose from 'mongoose'
import '../database/user-model'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith'

async function unlockAdmin() {
  await mongoose.connect(MONGODB_URI)
  const User = mongoose.model('User')

  const result = await User.updateMany(
    { role: 'admin', lockUntil: { $ne: null } },
    { $set: { failedLoginAttempts: 0, lockUntil: null } }
  )

  console.log(`Unlocked ${result.modifiedCount} admin account(s)`)

  const admin = (await User.findOne({ role: 'admin' }).lean()) as any
  if (admin) {
    console.log(`Admin: ${admin.email}, failedLoginAttempts: ${admin.failedLoginAttempts}, lockUntil: ${admin.lockUntil}`)
  } else {
    console.log('No admin user found.')
  }

  await mongoose.disconnect()
}

unlockAdmin().catch(console.error)