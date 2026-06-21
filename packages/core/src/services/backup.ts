import fs from 'fs/promises'
import path from 'path'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from './logger'

export interface BackupManifest {
  version: string
  createdAt: string
  collections: string[]
  recordCount: number
}

export interface BackupData {
  manifest: BackupManifest
  records: Record<string, unknown[]>
}

export const BackupService = {
  /**
   * Exports all data from registered collections into a portable JSON backup.
   * Skips system collections (z_ prefix) unless explicitly included.
   */
  async export(collections: string[], outputDir?: string, includeSystem = false, siteId?: string): Promise<BackupData> {
    const adapter = AdapterFactory.getActiveAdapter()
    const targetCollections = collections.filter((c) => includeSystem || !c.startsWith('z_'))

    const records: Record<string, unknown[]> = {}
    let total = 0

    for (const col of targetCollections) {
      try {
        const filter: any = {}
        if (siteId) filter.siteId = siteId
        const docs = await adapter.find<unknown>(col, filter)
        records[col] = docs
        total += docs.length
        logger.info(`[Backup] Exported ${docs.length} records from "${col}"`)
      } catch (err: any) {
        logger.warn({ err: err.message }, `[Backup] Skipping "${col}" — not found or inaccessible`)
      }
    }

    const backup: BackupData = {
      manifest: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        collections: Object.keys(records),
        recordCount: total,
      },
      records,
    }

    if (outputDir) {
      await fs.mkdir(outputDir, { recursive: true })
      const prefix = siteId ? `zenith-backup-${siteId}` : `zenith-backup-global`
      const filename = `${prefix}-${Date.now()}.json`
      const filePath = path.join(outputDir, filename)
      // Safe stringify: convert circular references to marker strings instead of crashing
      const seen = new WeakSet()
      const json = JSON.stringify(backup, (_, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]'
          seen.add(value)
        }
        return value
      }, 2)
      await fs.writeFile(filePath, json)
      logger.info(`[Backup] Written to ${filePath} (${total} records across ${Object.keys(records).length} collections)`)
    }

    return backup
  },

  /**
   * Imports data from a backup file into the database.
   */
  async import(filePath: string, adapter?: DatabaseAdapter, siteId?: string): Promise<{ restored: number }> {
    const db = adapter || AdapterFactory.getActiveAdapter()

    // Validate file size before reading (limit: 100MB)
    const stat = await fs.stat(filePath)
    const MAX_SIZE = 100 * 1024 * 1024
    if (stat.size > MAX_SIZE) {
      throw new Error(`Backup file too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB (max 100MB)`)
    }

    const content = await fs.readFile(filePath, 'utf-8')
    const backup: BackupData = JSON.parse(content)

    if (!backup.manifest || !backup.records) {
      throw new Error('Invalid backup file: missing manifest or records')
    }

    logger.info(`[Backup] Starting restore from ${path.basename(filePath)} (${backup.manifest.recordCount} records)`)

    let restored = 0
    for (const [collection, docs] of Object.entries(backup.records)) {
      if (!Array.isArray(docs) || docs.length === 0) continue
      for (const doc of docs) {
        try {
          const { _id, ...data } = doc as any
          // Preserve id (Postgres) or convert _id → id (MongoDB) so cross-doc references remain valid
          if (!data.id && _id) data.id = _id
          
          if (siteId) data.siteId = siteId

          await db.create(collection, data)
          restored++
        } catch (err: any) {
          logger.warn({ err: err.message, collection }, `[Backup] Skipping record in "${collection}"`)
        }
      }
      logger.info(`[Backup] Restored ${docs.length} records to "${collection}"`)
    }

    logger.info(`[Backup] Restore complete. Restored ${restored} records.`)
    return { restored }
  },

  /**
   * Lists backup files in the given directory.
   */
  async list(dir: string, siteId?: string): Promise<{ name: string; size: number; createdAt: Date }[]> {
    await fs.mkdir(dir, { recursive: true })
    const files = await fs.readdir(dir)
    const backups: { name: string; size: number; createdAt: Date }[] = []

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      if (siteId && !file.includes(`-${siteId}-`)) continue
      
      try {
        const stat = await fs.stat(path.join(dir, file))
        backups.push({ name: file, size: stat.size, createdAt: stat.mtime })
      } catch {
        // skip unreadable files
      }
    }

    return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  },
}
