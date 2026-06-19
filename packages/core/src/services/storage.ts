import { LocalStorageProvider } from './storage/local'
import { S3StorageProvider } from './storage/s3'
import { StorageProvider } from './storage/base'
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

let activeProvider: StorageProvider
let lastSettingsHash: string = ''

async function resolveActiveProviderAsync(): Promise<StorageProvider> {
  const adapter = AdapterFactory.getActiveAdapter()
  let settings: any = {}
  
  if (adapter) {
    try {
      settings = await adapter.findOne('z_settings', {}) || {}
    } catch {
      // z_settings may not be initialized yet
    }
  }

  const providerType = settings.mediaProvider || process.env.STORAGE_PROVIDER || 'local'
  const s3Bucket = settings.s3Bucket || process.env.S3_BUCKET
  
  // Create a hash of the current settings to detect changes
  const currentHash = `${providerType}-${s3Bucket}-${settings.s3Region}-${settings.s3Endpoint}-${settings.s3AccessKey}-${settings.s3SecretKey}`

  // If we already have an active provider and settings haven't changed, reuse it
  if (activeProvider && lastSettingsHash === currentHash) {
    return activeProvider
  }

  lastSettingsHash = currentHash

  if (providerType === 's3' || s3Bucket) {
    try {
      const config = {
        bucket: s3Bucket,
        region: settings.s3Region || process.env.S3_REGION || 'us-east-1',
        endpoint: settings.s3Endpoint || process.env.S3_ENDPOINT,
        accessKeyId: settings.s3AccessKey || process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: settings.s3SecretKey || process.env.S3_SECRET_ACCESS_KEY,
        publicUrl: settings.s3PublicUrl || process.env.S3_PUBLIC_URL
      }
      activeProvider = new S3StorageProvider(config)
      logger.info('Zenith Storage Engine: AWS S3 / Cloudflare R2 active provider loaded')
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to load S3 Storage Provider. Falling back to Local Filesystem.')
      activeProvider = new LocalStorageProvider()
    }
  } else {
    activeProvider = new LocalStorageProvider()
    logger.info('Zenith Storage Engine: Local Filesystem active provider loaded')
  }

  return activeProvider
}

export const StorageService = {
  async getProvider(): Promise<StorageProvider> {
    return await resolveActiveProviderAsync()
  },

  async saveFile(
    fileInput: Buffer | string,
    filename: string,
    options: { mimetype?: string } = {}
  ): Promise<{ url: string; id: string }> {
    const provider = await resolveActiveProviderAsync()
    const result = await provider.upload(fileInput, {
      filename,
      mimetype: options.mimetype || 'application/octet-stream',
    })
    return {
      url: result.url,
      id: result.id,
    }
  },

  async deleteFile(fileId: string): Promise<void> {
    const provider = await resolveActiveProviderAsync()
    await provider.delete(fileId)
  },
}
