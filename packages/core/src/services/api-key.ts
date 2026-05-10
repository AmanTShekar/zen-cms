import crypto from 'crypto';
import { ApiKeyModel } from '../database/api-key-model';
import { logger } from './logger';

/**
 * Zenith API Key Service
 * ──────────────────────
 * Security note: we store a SHA-256 hash of the key in the DB,
 * and return the raw key ONCE to the caller. This way a DB breach
 * does not expose usable credentials.
 */
export class ApiKeyService {
  private static hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  static async generateKey(
    name: string,
    role: 'admin' | 'editor' | 'viewer' = 'viewer',
    expiresInDays?: number
  ): Promise<{ name: string; key: string; role: string; expiresAt?: Date }> {
    const rawKey = `zn_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = this.hash(rawKey);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    await ApiKeyModel.create({ name, key: keyHash, role, expiresAt });
    logger.info({ name, role, expiresAt }, 'New API Key generated');

    // Return the raw key ONCE — never stored in DB
    return { name, key: rawKey, role, expiresAt };
  }

  static async validateKey(rawKey: string) {
    const keyHash = this.hash(rawKey);
    const apiKey = await ApiKeyModel.findOne({ key: keyHash, revoked: false });
    if (!apiKey) return null;

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      logger.warn({ name: apiKey.name }, 'Expired API key used');
      return null;
    }

    // Non-blocking last-used update
    ApiKeyModel.updateOne({ _id: apiKey._id }, { $set: { lastUsed: new Date() } }).exec();

    return {
      id: `key_${apiKey._id}`,
      email: `apikey:${apiKey.name}`,
      role: apiKey.role as 'admin' | 'editor' | 'viewer',
      isApiKey: true,
    };
  }

  static async revokeKey(id: string): Promise<boolean> {
    const result = await ApiKeyModel.findByIdAndUpdate(id, { $set: { revoked: true } });
    return !!result;
  }
}
