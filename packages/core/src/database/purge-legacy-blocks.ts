import { AdapterFactory } from './adapters/AdapterFactory'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Migration: Purge Legacy Blocks
 * ──────────────────────────────
 * Removes orphaned 'Main Content / Description', 'Inter', and 'Structure' blocks 
 * from the 'pages' collections.
 */
async function purgeLegacyBlocks() {
  console.log('Connecting to database...')
  const adapter = AdapterFactory.getActiveAdapter()
  await adapter.connect()

  const collections = ['pages']
  const targetBlocks = ['Main Content / Description', 'Inter', 'Structure']
  let totalPurged = 0

  for (const collectionName of collections) {
    console.log(`Scanning collection: ${collectionName}...`)
    try {
      const documents = await adapter.find<Record<string, unknown>>(collectionName, {})
      console.log(`Found ${documents.length} documents in ${collectionName}.`)

      for (const doc of documents) {
        if (!doc.sections || !Array.isArray(doc.sections)) continue

        const originalLength = doc.sections.length
        const sanitizedSections = doc.sections.filter(
          (section: any) => !targetBlocks.includes(section.blockType)
        )

        if (sanitizedSections.length < originalLength) {
          const removedCount = originalLength - sanitizedSections.length
          console.log(`Purging ${removedCount} legacy blocks from document ${doc.id || doc._id}...`)
          
          await adapter.update(collectionName, doc.id || doc._id, {
            sections: sanitizedSections
          })
          
          totalPurged += removedCount
        }
      }
    } catch (error) {
      console.log(`Collection ${collectionName} not found or error occurred:`, error)
    }
  }

  console.log(`\nMigration Complete: Purged ${totalPurged} legacy blocks.`)
  process.exit(0)
}

purgeLegacyBlocks().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
