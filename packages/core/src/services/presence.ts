import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

interface ActiveUser {
  userId: string
  email: string
  collectionName: string
  documentId: string
  lastActive: number
}

/**
 * Zenith Presence Service (Distributed via Database)
 * ─────────────────────────────────────────────────────────────────
 * Tracks who is actively editing which document.
 * Auto-expires after 60 seconds of inactivity.
 * 
 * Replaced NodeCache with DatabaseAdapter to support multi-instance deployments.
 */
export class PresenceService {
  private static adapter: DatabaseAdapter
  private static TTL = 60000 // 60 seconds

  static init(adapter: DatabaseAdapter) {
    this.adapter = adapter
  }

  static async heartbeat(
    userId: string,
    email: string,
    collection: string,
    documentId: string,
    siteId?: string
  ): Promise<void> {
    if (!this.adapter) return

    try {
      const query: any = { userId, collectionName: collection, documentId }
      if (siteId) query.siteId = siteId

      // Simulating upsert by deleting and recreating to avoid adapter-specific upsert gaps
      await this.adapter.deleteMany('z_presence', query).catch(() => {})

      await this.adapter.create('z_presence', {
        userId,
        email,
        collectionName: collection,
        documentId,
        siteId,
        lastActive: Date.now(),
      })
    } catch {
      // Presence is non-critical — don't let heartbeat failures crash requests
    }
  }

  static async leave(userId: string, collection: string, documentId: string, siteId?: string): Promise<void> {
    if (!this.adapter) return
    try {
      const query: any = { userId, collectionName: collection, documentId }
      if (siteId) query.siteId = siteId
      await this.adapter.deleteMany('z_presence', query).catch(() => {})
    } catch {
      // ignore
    }
  }

  static async getActiveUsers(
    collection: string,
    documentId: string,
    siteId?: string
  ): Promise<{ id: string; email: string }[]> {
    if (!this.adapter) return []

    try {
      // Fetch all presence records for this document, filter by TTL in JS
      // (avoids MongoDB-specific $gt operator that breaks on Postgres adapter)
      const minLastActive = Date.now() - this.TTL
      const query: any = { collectionName: collection, documentId }
      if (siteId) query.siteId = siteId
      const records = await this.adapter.find<ActiveUser>('z_presence', query)

      return records
        .filter((r) => (r.lastActive as unknown as number) > minLastActive)
        .map((r) => ({ id: r.userId, email: r.email }))
    } catch {
      return []
    }
  }

  static async getAllActiveUsers(siteId?: string): Promise<{ id: string; email: string }[]> {
    if (!this.adapter) return []

    try {
      // Fetch all presence records and filter by TTL in JS
      // (avoids MongoDB-specific $gt operator that breaks on Postgres adapter)
      const minLastActive = Date.now() - this.TTL
      const query: any = {}
      if (siteId) query.siteId = siteId
      const records = await this.adapter.find<ActiveUser>('z_presence', query)

      // Deduplicate by user ID and apply TTL filter
      const users: { id: string; email: string }[] = []
      const seenIds = new Set<string>()

      for (const r of records) {
        if ((r.lastActive as unknown as number) > minLastActive && !seenIds.has(r.userId)) {
          seenIds.add(r.userId)
          users.push({ id: r.userId, email: r.email })
        }
      }
      return users
    } catch {
      return []
    }
  }
}
