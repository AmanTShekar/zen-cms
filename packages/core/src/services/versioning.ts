import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { logger } from './logger'

export class VersioningService {
  constructor(private adapter: DatabaseAdapter, private config: Record<string, unknown>) {}

  async createVersion(doc: Record<string, unknown>, options: Record<string, unknown>, delta?: Record<string, unknown>) {
    try {
      const isGlobal = this.config.singleton || !(doc as unknown as { _id?: { toString(): string } })._id
      const documentId = isGlobal ? this.config.slug : (doc as unknown as { _id?: { toString(): string } })._id?.toString() || 'singleton'
      await this.adapter.createVersion({
        collectionName: isGlobal ? 'globals' : this.config.name || this.config.slug,
        collectionSlug: isGlobal ? 'globals' : this.config.slug,
        documentId,
        snapshot: doc,
        delta,
        createdBy: (options as unknown as { user?: { id?: string } }).user?.id || 'system',
        timestamp: new Date(),
      }, { session: options?.session })

      // Prune old versions beyond the max limit (default 50)
      const maxVersions = this.config.maxVersions ?? 50
      await this.enforceMaxVersions(documentId, maxVersions)
    } catch (err) {
      logger.error({ err }, 'Versioning failed')
    }
  }

  /**
   * Prunes oldest versions beyond `maxVersions` for a given document.
   * Keeps the most recent N versions and deletes the rest.
   */
  async enforceMaxVersions(documentId: string, maxVersions: number): Promise<void> {
    try {
      const allVersions = await this.adapter.getVersions(this.config.slug, documentId)
      if (allVersions.length <= maxVersions) return

      const toDelete = allVersions
        .sort((a: unknown, b: unknown) => new Date((b as { timestamp: string | Date }).timestamp).getTime() - new Date((a as { timestamp: string | Date }).timestamp).getTime())
        .slice(maxVersions)

      await Promise.all(
        toDelete.map(async (version: unknown) => {
          const vid = (version as { _id?: { toString(): string } })._id?.toString() || (version as { id?: string }).id
          if (vid) await this.adapter.delete('versions', vid)
        })
      )
    } catch (err) {
      logger.warn({ err, collection: this.config.slug, documentId }, 'Version pruning failed')
    }
  }
}
