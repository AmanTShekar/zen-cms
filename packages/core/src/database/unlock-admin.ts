/**
 * Unlock Admin Account Script
 * ────────────────────────────
 * Clears the brute-force lockout on the admin user.
 * Run: npx tsx packages/core/src/database/unlock-admin.ts
 */
import { AdapterFactory } from './adapters/AdapterFactory'

async function unlockAdmin() {
  const adapter = AdapterFactory.create()
  await adapter.connect()

  const admins = await adapter.find<{ id?: string, _id?: string, lockUntil?: string | null }>('users', { role: 'admin' })
  let count = 0
  for (const admin of admins) {
    if (admin.lockUntil) {
      await adapter.update('users', admin.id || admin._id, {
        failedLoginAttempts: 0,
        lockUntil: null
      })
      count++
    }
  }

  console.log(`Unlocked ${count} admin account(s)`)

  const updatedAdmins = await adapter.find<{ email: string, failedLoginAttempts: number, lockUntil: string | null }>('users', { role: 'admin' }, { limit: 1 })
  const admin = updatedAdmins[0]
  
  if (admin) {
    console.log(`Admin: ${admin.email}, failedLoginAttempts: ${admin.failedLoginAttempts}, lockUntil: ${admin.lockUntil}`)
  } else {
    console.log('No admin user found.')
  }

  await adapter.disconnect()
}

unlockAdmin().catch(console.error)