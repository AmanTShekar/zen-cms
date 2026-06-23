import crypto from 'crypto'

interface StoredSession {
  userId: string
  jti: string
  email: string
  createdAt: number
  expiresAt: number
  userAgent?: string
  ip?: string
}

/**
 * Token revocation and session store.
 *
 * Uses Redis when available (via passed client), falls back to in-memory Maps
 * for development/testing. In production with multiple instances you MUST
 * configure Redis so all nodes share the same blacklist.
 */
export class SessionStore {
  private activeSessions: Map<string, StoredSession> = new Map()
  private revokedTokens: Map<string, number> = new Map()
  private userSessions: Map<string, Set<string>> = new Map()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private redisClient: Record<string, unknown> | null = null

  constructor(redisClient?: Record<string, unknown>) {
    this.redisClient = redisClient ?? null
  }

  /** Start periodic cleanup of expired tokens (call on boot). */
  startCleanup(intervalMs = 60_000): void {
    if (this.cleanupTimer) return
    this.cleanupTimer = setInterval(() => this.cleanup(), intervalMs)
  }

  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /** Register a new session / token. */
  async add(userId: string, jti: string, email: string, ttlSeconds: number, meta?: { userAgent?: string; ip?: string }): Promise<void> {
    const now = Date.now()
    const session: StoredSession = {
      userId,
      jti,
      email,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      userAgent: meta?.userAgent,
      ip: meta?.ip,
    }

    if (this.redisClient) {
      await this.redisClient.set(`zenith:session:${jti}`, JSON.stringify(session), 'EX', ttlSeconds)
      await this.redisClient.sadd(`zenith:user:${userId}:sessions`, jti)
      await this.redisClient.expire(`zenith:user:${userId}:sessions`, Math.max(ttlSeconds, 86400))
    } else {
      this.activeSessions.set(jti, session)
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set())
      }
      this.userSessions.get(userId)!.add(jti)
    }
  }

  /** Check whether a token has been revoked. */
  async isRevoked(jti: string): Promise<boolean> {
    if (this.redisClient) {
      const exists = await this.redisClient.exists(`zenith:session:revoked:${jti}`)
      return exists === 1
    }
    return this.revokedTokens.has(jti)
  }

  /** Revoke a single token / session. */
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.set(`zenith:session:revoked:${jti}`, '1', 'EX', ttlSeconds)
    } else {
      this.revokedTokens.set(jti, Date.now() + ttlSeconds * 1000)
      
      const session = this.activeSessions.get(jti)
      if (session) {
        this.activeSessions.delete(jti)
        const userSet = this.userSessions.get(session.userId)
        if (userSet) {
          userSet.delete(jti)
          if (userSet.size === 0) this.userSessions.delete(session.userId)
        }
      }
    }
  }

  /** Revoke all sessions for a user (forces re-login on all devices). */
  async revokeAllForUser(userId: string): Promise<number> {
    if (this.redisClient) {
      const jtis = await this.redisClient.smembers(`zenith:user:${userId}:sessions`)
      for (const jti of jtis) {
        await this.redisClient.set(`zenith:session:revoked:${jti}`, '1', 'EX', 86400 * 7)
      }
      await this.redisClient.del(`zenith:user:${userId}:sessions`)
      return jtis.length
    }

    const sessions = this.userSessions.get(userId)
    if (!sessions) return 0
    const count = sessions.size
    for (const jti of sessions) {
      this.revokedTokens.set(jti, Date.now() + 86400 * 7 * 1000)
      this.activeSessions.delete(jti)
    }
    this.userSessions.delete(userId)
    return count
  }

  /** List active sessions for a user (metadata only, no blacklist tokens). */
  async listSessions(userId: string): Promise<StoredSession[]> {
    if (this.redisClient) {
      const jtis = await this.redisClient.smembers(`zenith:user:${userId}:sessions`)
      const sessions: StoredSession[] = []
      for (const jti of jtis) {
        const raw = await this.redisClient.get(`zenith:session:${jti}`)
        if (raw) {
          const s = JSON.parse(raw) as StoredSession
          if (Date.now() < s.expiresAt) sessions.push(s)
        }
      }
      return sessions
    }

    const jtis = this.userSessions.get(userId)
    if (!jtis) return []
    const sessions: StoredSession[] = []
    for (const jti of jtis) {
      const s = this.activeSessions.get(jti)
      if (s && Date.now() < s.expiresAt) sessions.push(s)
    }
    return sessions
  }

  /** Remove expired in-memory entries. */
  private cleanup(): void {
    if (this.redisClient) return
    const now = Date.now()
    
    // Clean up expired revoked tokens
    for (const [jti, expiry] of this.revokedTokens) {
      if (now > expiry) {
        this.revokedTokens.delete(jti)
      }
    }
    
    // Clean up expired active sessions
    for (const [jti, session] of this.activeSessions) {
      if (now > session.expiresAt) {
        this.activeSessions.delete(jti)
        const userSet = this.userSessions.get(session.userId)
        if (userSet) {
          userSet.delete(jti)
          if (userSet.size === 0) this.userSessions.delete(session.userId)
        }
      }
    }
  }

  /** Generate a unique JWT ID. */
  static generateJti(): string {
    return crypto.randomBytes(24).toString('hex')
  }
}

/** Singleton instance used across the app. */
export const sessionStore = new SessionStore()
