import { LocalStorageProvider } from './storage/local'
import { S3StorageProvider } from './storage/s3'
import { StorageProvider } from './storage/base'
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { env } from '../config/env';


const providerCache = new Map<string, { hash: string; provider: StorageProvider }>()

async function resolveActiveProviderAsync(siteId?: string): Promise<StorageProvider> {
  const adapter = AdapterFactory.getActiveAdapter()
  let settings: Record<string, unknown> = {}
  
  if (adapter) {
    try {
      const query = siteId ? { siteId } : {}
      settings = await adapter.findOne('z_settings', query) || {}
    } catch {
      // z_settings may not be initialized yet
    }
  }

  const providerType = settings.mediaProvider || env.STORAGE_PROVIDER || 'local'
  const s3Bucket = settings.s3Bucket || env.S3_BUCKET
  
  // Create a hash of the current settings to detect changes
  const currentHash = `${providerType}-${s3Bucket}-${settings.s3Region}-${settings.s3Endpoint}-${settings.s3AccessKey}-${settings.s3SecretKey}`

  // If we already have an active provider for this cache key and settings haven't changed, reuse it
  const cacheKey = siteId || 'global'
  const cached = providerCache.get(cacheKey)
  if (cached && cached.hash === currentHash) {
    return cached.provider
  }

  let newProvider: StorageProvider

  if (providerType === 's3' || s3Bucket) {
    try {
      const config = {
        bucket: s3Bucket,
        region: settings.s3Region || env.S3_REGION || 'us-east-1',
        endpoint: settings.s3Endpoint || env.S3_ENDPOINT,
        accessKeyId: settings.s3AccessKey || process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: settings.s3SecretKey || process.env.S3_SECRET_ACCESS_KEY,
        publicUrl: settings.s3PublicUrl || process.env.S3_PUBLIC_URL
      }
      newProvider = new S3StorageProvider(config)
      logger.info(`Zenith Storage Engine: AWS S3 / Cloudflare R2 active provider loaded for ${cacheKey}`)
    } catch (err: unknown) {
      logger.error({ error: err.message }, 'Failed to load S3 Storage Provider. Falling back to Local Filesystem.')
      newProvider = new LocalStorageProvider()
    }
  } else {
    newProvider = new LocalStorageProvider()
    logger.info(`Zenith Storage Engine: Local Filesystem active provider loaded for ${cacheKey}`)
  }

  providerCache.set(cacheKey, { hash: currentHash, provider: newProvider })
  return newProvider
}

export const StorageService = {
  async getProvider(siteId?: string): Promise<StorageProvider> {
    return await resolveActiveProviderAsync(siteId)
  },

  async saveFile(
    fileInput: Buffer | string,
    filename: string,
    options: { mimetype?: string; siteId?: string } = {}
  ): Promise<{ url: string; id: string }> {
    const provider = await resolveActiveProviderAsync(options.siteId)
    const result = await provider.upload(fileInput, {
      filename,
      mimetype: options.mimetype || 'application/octet-stream',
    })
    return {
      url: result.url,
      id: result.id,
    }
  },

  async deleteFile(fileId: string, siteId?: string): Promise<void> {
    const provider = await resolveActiveProviderAsync(siteId)
    await provider.delete(fileId)
  },
}
