/**
 * Check admin user credentials in MongoDB
 * Run: npx tsx packages/core/src/database/check-admin.ts
 */
import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
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
  console.log(`  Password hash: ${(admin as any).password ? (admin as any).password.substring(0, 20) + '...' : 'MISSING!'}`)

  // Verify the password matches Zenit2024!
  const testPasswords = ['Zenith2024!', 'admin123', 'password123']
  for (const pw of testPasswords) {
    const valid = await bcrypt.compare(pw, (admin as any).password)
    console.log(`  Password "${pw}" matches: ${valid}`)
  }

  await mongoose.disconnect()
}

checkAdmin().catch(console.error)