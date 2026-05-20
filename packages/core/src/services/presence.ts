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
    documentId: string
  ): Promise<void> {
    if (!this.adapter) return

    const query = { userId, collectionName: collection, documentId }
    
    // Simulating upsert by deleting and recreating to avoid adapter-specific upsert gaps
    await this.adapter.deleteMany('z_presence', query).catch(() => {})
    
    await this.adapter.create('z_presence', {
      userId,
      email,
      collectionName: collection,
      documentId,
      lastActive: Date.now(),
    })
  }

  static async leave(userId: string, collection: string, documentId: string): Promise<void> {
    if (!this.adapter) return
    const query = { userId, collectionName: collection, documentId }
    await this.adapter.deleteMany('z_presence', query).catch(() => {})
  }

  static async getActiveUsers(
    collection: string,
    documentId: string
  ): Promise<{ id: string; email: string }[]> {
    if (!this.adapter) return []

    const minLastActive = Date.now() - this.TTL
    const query = {
      collectionName: collection,
      documentId,
      lastActive: { $gt: minLastActive }
    }

    const records = await this.adapter.find<ActiveUser>('z_presence', query)
    
    return records.map((r) => ({
      id: r.userId,
      email: r.email
    }))
  }

  static async getAllActiveUsers(): Promise<{ id: string; email: string }[]> {
    if (!this.adapter) return []

    const minLastActive = Date.now() - this.TTL
    const query = {
      lastActive: { $gt: minLastActive }
    }

    const records = await this.adapter.find<ActiveUser>('z_presence', query)
    
    // Deduplicate by user ID
    const users: { id: string; email: string }[] = []
    const seenIds = new Set<string>()

    for (const r of records) {
      if (!seenIds.has(r.userId)) {
        seenIds.add(r.userId)
        users.push({ id: r.userId, email: r.email })
      }
    }
    return users
  }
}
