import jwt from 'jsonwebtoken'
import { CollectionConfig } from '@zenith-open/zenithcms-types'
import { env } from '../config/env';


const PREVIEW_SECRET = env.PREVIEW_SECRET || 'zenith_preview_secret_v1'

if (env.NODE_ENV === 'production' && PREVIEW_SECRET === 'zenith_preview_secret_v1') {
  throw new Error('[Zenith] FATAL: PREVIEW_SECRET must be configured in production for security.')
}

export class PreviewService {
  /**
   * Generates a signed preview token for a document.
   * Short-lived (e.g. 1 hour).
   */
  static generatePreviewToken(collection: string, id: string): string {
    // Hardened: Reduced TTL to 15m to minimize risk of token leakage via URL/Referer
    return jwt.sign({ collection, id, mode: 'preview' }, PREVIEW_SECRET, { expiresIn: '15m' })
  }

  /** Alias for backward-compat with system.ts caller */
  static generateToken(collection: string, id: string): string {
    return this.generatePreviewToken(collection, id)
  }

  /**
   * Verifies a preview token and returns the payload.
   */
  static verifyPreviewToken(token: string): { collection: string; id: string } | null {
    try {
      const decoded = jwt.verify(token, PREVIEW_SECRET, { algorithms: ['HS256'] }) as any
      if (decoded.mode !== 'preview') return null
      return { collection: decoded.collection, id: decoded.id }
    } catch (_err) {
      return null
    }
  }

  /**
   * Formats the preview URL based on collection config.
   */
  static getPreviewUrl(config: CollectionConfig, doc: any): string | null {
    if (!config.admin?.previewUrl) return null

    const baseUrl =
      typeof config.admin.previewUrl === 'function'
        ? config.admin.previewUrl(doc)
        : config.admin.previewUrl

    if (!baseUrl) return null

    const token = this.generatePreviewToken(
      config.slug,
      doc._id ? doc._id.toString() : doc.id?.toString()
    )
    const url = new URL(baseUrl)
    url.searchParams.set('preview', 'true')
    url.searchParams.set('token', token)

    return url.toString()
  }
}
