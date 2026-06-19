import fs from 'fs/promises'
import path from 'path'
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter'
import { StorageService } from '../storage'
import { logger } from '../logger'

/**
 * Sweeps the storage target to identify and prune orphaned files.
 * Orphaned files are defined as files present in the physical storage provider (local or S3)
 * that have no corresponding database record in the "media" collection.
 * 
 * Optionally, if `pruneUnreferencedMedia` is set to true, it also checks if those
 * "media" database records are actually referenced in any other collection's media/upload fields,
 * and deletes them if they are not used anywhere.
 */
export async function pruneOrphanedMedia(
  adapter: DatabaseAdapter,
  options: { pruneUnreferencedMedia?: boolean } = {}
): Promise<{ prunedCount: number; errors: string[] }> {
  const errors: string[] = []
  let prunedCount = 0

  try {
    logger.info('[MediaSweeper] Beginning media storage sweep...')

    // 1. Fetch all media records from the database
    const dbMediaRecords = await adapter.find<Record<string, any>>('media', {})
    const dbMediaIds = new Set(dbMediaRecords.map((m) => m.id))

    // 2. Identify physical files (for local storage)
    const provider = await StorageService.getProvider()
    const providerType = process.env.STORAGE_PROVIDER || 'local'

    if (providerType === 'local') {
      const uploadDir = path.resolve(process.cwd(), 'media')
      const physicalFiles = await fs.readdir(uploadDir).catch(() => [])

      for (const file of physicalFiles) {
        // Ignore dotfiles / system files
        if (file.startsWith('.')) continue

        // If the file is not registered in the database, it's orphaned
        if (!dbMediaIds.has(file)) {
          logger.info({ file }, '[MediaSweeper] Pruning orphaned local file (not in database media collection)')
          const filePath = path.join(uploadDir, file)
          await fs.unlink(filePath).catch((err) => {
            errors.push(`Failed to delete local file ${file}: ${err.message}`)
          })
          prunedCount++
        }
      }
    } else {
      logger.info('[MediaSweeper] Non-local storage provider active. Sweeping local directory as fallback.')
      const uploadDir = path.resolve(process.cwd(), 'media')
      const physicalFiles = await fs.readdir(uploadDir).catch(() => [])
      for (const file of physicalFiles) {
        if (file.startsWith('.')) continue
        if (!dbMediaIds.has(file)) {
          const filePath = path.join(uploadDir, file)
          await fs.unlink(filePath).catch(() => {})
          prunedCount++
        }
      }
    }

    // 3. Optional: prune media records and files that are not referenced in any collection schema
    if (options.pruneUnreferencedMedia) {
      let collections: any[] = []
      try {
        collections = await adapter.find<Record<string, any>>('z_collections', {})
      } catch {
        // Ignore if z_collections table is empty or missing
      }

      const referencedUrls = new Set<string>()

      // Helper to recursively collect string URLs/IDs from object payloads
      const extractReferences = (val: any) => {
        if (!val) return
        if (typeof val === 'string') {
          if (val.includes('/media/') || val.match(/^[a-fA-F0-9-]{36}-/)) {
            referencedUrls.add(val)
          }
        } else if (Array.isArray(val)) {
          val.forEach(extractReferences)
        } else if (typeof val === 'object') {
          Object.values(val).forEach(extractReferences)
        }
      }

      // Query records from all user collections
      for (const col of collections) {
        try {
          const records = await adapter.find<Record<string, any>>(col.slug, {})
          for (const doc of records) {
            extractReferences(doc)
          }
        } catch (err: any) {
          logger.warn({ slug: col.slug, err: err.message }, '[MediaSweeper] Failed to read collection records')
        }
      }

      // Check the seeded defaults as well
      const knownCollections = ['products', 'categories', 'authors', 'posts']
      for (const slug of knownCollections) {
        try {
          const records = await adapter.find<Record<string, any>>(slug, {})
          for (const doc of records) {
            extractReferences(doc)
          }
        } catch {
          // Ignore if collection not active
        }
      }

      // Now, delete any media DB record (and physical file) that is not referenced in the system
      for (const mediaDoc of dbMediaRecords) {
        const isReferenced =
          referencedUrls.has(mediaDoc.url) ||
          referencedUrls.has(mediaDoc.id) ||
          referencedUrls.has(`/media/${mediaDoc.id}`)

        if (!isReferenced) {
          logger.info({ id: mediaDoc.id, url: mediaDoc.url }, '[MediaSweeper] Deleting unreferenced media database record and file')
          
          try {
            await adapter.delete('media', mediaDoc.id)
          } catch (err: any) {
            errors.push(`Failed to delete media DB record ${mediaDoc.id}: ${err.message}`)
          }

          try {
            await provider.delete(mediaDoc.id)
          } catch (err: any) {
            errors.push(`Failed to delete media physical asset ${mediaDoc.id}: ${err.message}`)
          }
          
          prunedCount++
        }
      }
    }

    logger.info({ prunedCount, errorCount: errors.length }, '[MediaSweeper] Media sweep completed successfully')
  } catch (err: any) {
    logger.error({ err: err.message }, '[MediaSweeper] Critical failure in media sweeper execution')
    errors.push(err.message)
  }

  return { prunedCount, errors }
}
