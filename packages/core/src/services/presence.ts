import NodeCache from 'node-cache';

interface ActiveUser {
  id: string;
  email: string;
  collection: string;
  documentId: string;
  lastActive: number;
}

/**
 * Zenith Presence Service
 * ─────────────────────────────────────────────────────────────────
 * Tracks who is actively editing which document.
 * Auto-expires after 60 seconds of inactivity.
 *
 * The Admin UI should call POST /api/v1/presence/heartbeat every 30s
 * while the document editor is open, and DELETE when they leave.
 */
export class PresenceService {
  private static store = new NodeCache({ stdTTL: 60 }); // auto-expire after 60s

  private static key(userId: string, collection: string, documentId: string): string {
    return `p:${collection}:${documentId}:${userId}`;
  }

  static async heartbeat(userId: string, email: string, collection: string, documentId: string): Promise<void> {
    this.store.set(this.key(userId, collection, documentId), {
      id: userId,
      email,
      collection,
      documentId,
      lastActive: Date.now(),
    } as ActiveUser);
  }

  static async leave(userId: string, collection: string, documentId: string): Promise<void> {
    this.store.del(this.key(userId, collection, documentId));
  }

  static async getActiveUsers(collection: string, documentId: string): Promise<Pick<ActiveUser, 'id' | 'email'>[]> {
    const prefix = `p:${collection}:${documentId}:`;
    return this.store
      .keys()
      .filter(k => k.startsWith(prefix))
      .map(k => {
        const u = this.store.get<ActiveUser>(k);
        return u ? { id: u.id, email: u.email } : null;
      })
      .filter((u): u is Pick<ActiveUser, 'id' | 'email'> => u !== null);
  }
}
