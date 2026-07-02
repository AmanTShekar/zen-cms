/* eslint-disable @typescript-eslint/ban-ts-comment */

/**
 * Check admin user credentials
 * Run: npx tsx packages/core/src/database/check-admin.ts
 */
import { AdapterFactory } from './adapters/AdapterFactory'

async function checkAdmin() {
  const adapter = AdapterFactory.create()
  await adapter.connect()
  
  adapter.registerCollection({
    slug: 'users',
    fields: [
      { name: 'email', type: 'text' },
      { name: 'role', type: 'text' },
      { name: 'failedLoginAttempts', type: 'number' },
      { name: 'lockUntil', type: 'date' }
    ]
  // @ts-ignore: TS2694 - unresolved type from removing @ts-nocheck
  } as import('@zenith-open/zenithcms-types').CollectionSchema)

  const admins = await adapter.find<{ email: string, role: string, failedLoginAttempts: number, lockUntil: string }>('users', { role: 'admin' }, { limit: 1 })
  const admin = admins[0]
  
  if (!admin) {
    console.log('No admin user found!')
    await adapter.disconnect()
    return
  }

  console.log('Admin user found:')
  console.log(`  Email: ${admin.email}`)
  console.log(`  Role: ${admin.role}`)
  console.log(`  failedLoginAttempts: ${admin.failedLoginAttempts}`)
  console.log(`  lockUntil: ${admin.lockUntil}`)

  await adapter.disconnect()
}

checkAdmin().catch(console.error)
