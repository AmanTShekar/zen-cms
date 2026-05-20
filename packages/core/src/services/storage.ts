import { LocalStorageProvider } from './storage/local'
import { S3StorageProvider } from './storage/s3'
import { StorageProvider } from './storage/base'
import { logger } from './logger'

let activeProvider: StorageProvider

function resolveActiveProvider(): StorageProvider {
  if (activeProvider) return activeProvider

  const providerType = process.env.STORAGE_PROVIDER || 'local'

  if (providerType === 's3' || process.env.S3_BUCKET) {
    try {
      activeProvider = new S3StorageProvider()
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
  getProvider(): StorageProvider {
    return resolveActiveProvider()
  },

  async saveFile(
    fileInput: Buffer | string,
    filename: string,
    options: { mimetype?: string } = {}
  ): Promise<{ url: string; id: string }> {
    const provider = resolveActiveProvider()
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
    const provider = resolveActiveProvider()
    await provider.delete(fileId)
  },
}
