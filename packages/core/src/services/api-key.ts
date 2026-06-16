import crypto from 'crypto'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from './logger'

/**
 * Zenith API Key Service
 * ──────────────────────
 * Security note: we store a SHA-256 hash of the key in the DB,
 * and return the raw key ONCE to the caller. This way a DB breach
 * does not expose usable credentials.
 */
export class ApiKeyService {
  private static hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex')
  }

  static async generateKey(
    name: string,
    role: 'admin' | 'editor' | 'viewer' = 'viewer',
    expiresInDays?: number,
    siteId?: string
  ): Promise<{ id: string; name: string; key: string; role: string; expiresAt?: Date }> {
    const rawKey = `zn_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = this.hash(rawKey)

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined

    const adapter = AdapterFactory.getActiveAdapter()
    const doc = (await adapter.create('z_api_keys', { name, key: keyHash, role, expiresAt, siteId })) as any
    logger.info({ name, role, expiresAt, siteId }, 'New API Key generated')

    // Return the raw key ONCE — never stored in DB
    return { id: doc._id || doc.id, name, key: rawKey, role, expiresAt }
  }

  static async validateKey(rawKey: string) {
    const keyHash = this.hash(rawKey)
    const adapter = AdapterFactory.getActiveAdapter()
    const apiKeys = await adapter.find<Record<string, any>>('z_api_keys', { key: keyHash, revoked: false })
    const apiKey = apiKeys[0] || null
    if (!apiKey) return null

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      logger.warn({ name: apiKey.name }, 'Expired API key used')
      return null
    }

    // Non-blocking last-used update
    const id = (apiKey.id || apiKey._id).toString()
    adapter.update('z_api_keys', id, { lastUsed: new Date() }).catch(() => {})

    return {
      id: `key_${id}`,
      email: `apikey:${apiKey.name}`,
      role: apiKey.role as 'admin' | 'editor' | 'viewer',
      allowedCollections: apiKey.allowedCollections || [],
      isApiKey: true,
    }
  }

  static async revokeKey(id: string): Promise<boolean> {
    const adapter = AdapterFactory.getActiveAdapter()
    const result = await adapter.update('z_api_keys', id, { revoked: true })
    return !!result
  }
}
