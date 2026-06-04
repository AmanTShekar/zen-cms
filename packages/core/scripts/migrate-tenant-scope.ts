import { resolve } from 'path'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { AdapterFactory } from '../src/database/adapters/AdapterFactory'
import '../src/database/site-model'
import '../src/database/settings-model'
import '../src/database/preference-model'

dotenv.config({ path: resolve(__dirname, '../../../.env') })

async function runMigration() {
  console.log('--- Zenith CMS Migration: Tenant Scoping ---')

  const uri = process.env.DATABASE_URL
  if (!uri) {
    throw new Error('DATABASE_URL is not set in the environment')
  }

  const adapter = AdapterFactory.create(uri, 'mongoose')
  await adapter.connect()

  try {
    const sites = await adapter.find<any>('z_sites', {})
    console.log(`Found ${sites.length} sites to migrate.`)

    // 1. Settings Migration
    const globalSettings = await adapter.findOne<any>('z_settings', { siteId: null })
    if (globalSettings) {
      console.log('Global settings found. Cloning for each site...')
      for (const site of sites) {
        const siteId = (site.id || site._id).toString()
        const existingSiteSettings = await adapter.findOne<any>('z_settings', { siteId })
        if (!existingSiteSettings) {
          const { _id, id, siteId: _, createdAt, updatedAt, ...clonedData } = globalSettings
          await adapter.create('z_settings', { ...clonedData, siteId })
          console.log(`Migrated settings for site: ${siteId}`)
        }
      }
    } else {
      console.log('No global settings found to migrate.')
    }

    // 2. Preferences Migration
    const globalPreferences = await adapter.find<any>('z_preferences', { siteId: null })
    if (globalPreferences.length > 0) {
      console.log(`Found ${globalPreferences.length} global preferences. Cloning for each site...`)
      for (const pref of globalPreferences) {
        for (const site of sites) {
          const siteId = (site.id || site._id).toString()
          // Check if this user is an owner or member of the site
          const userId = pref.userId.toString()
          const isOwner = site.ownerId === userId
          const isMember = Array.isArray(site.members) && site.members.some((m: any) => m.userId === userId)

          if (isOwner || isMember) {
            const existingPref = await adapter.findOne<any>('z_preferences', { userId, key: pref.key, siteId })
            if (!existingPref) {
              const { _id, id, siteId: _, createdAt, updatedAt, ...clonedPref } = pref
              await adapter.create('z_preferences', { ...clonedPref, siteId })
              console.log(`Migrated preference '${pref.key}' for user ${userId} to site ${siteId}`)
            }
          }
        }
      }
    } else {
      console.log('No global preferences found to migrate.')
    }

    console.log('Migration complete.')
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await adapter.disconnect()
    process.exit(0)
  }
}

runMigration()
