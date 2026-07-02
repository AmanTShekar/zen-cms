import { LocalStorageProvider } from './storage/local'
import { StorageProvider } from './storage/base'
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { env } from '../config/env';

const providerCache = new Map<string, { hash: string; provider: StorageProvider }>()

const customProviders = new Map<string, any>()

export function registerStorageProvider(providerType: string, providerClass: any) {
  customProviders.set(providerType, providerClass)
}

async function resolveActiveProviderAsync(siteId?: string): Promise<StorageProvider> {
  const adapter = AdapterFactory.getActiveAdapter()
  let settings: Record<string, any> = {}
  
  if (adapter) {
    try {
      const query = siteId ? { siteId } : {}
      settings = await adapter.findOne('z_settings', query) || {}
    } catch {
      // z_settings may not be initialized yet
    }
  }

  const providerType = settings.mediaProvider || env.STORAGE_PROVIDER || 'local'
  
  // Create a hash of the current settings to detect changes
  const currentHash = `${providerType}-${JSON.stringify(settings)}`

  const cacheKey = siteId || 'global'
  const cached = providerCache.get(cacheKey)
  if (cached && cached.hash === currentHash) {
    return cached.provider
  }

  let newProvider: StorageProvider

  if (providerType !== 'local' && customProviders.has(providerType)) {
    try {
      const ProviderClass = customProviders.get(providerType)
      const config = { ...env, ...settings }
      newProvider = new ProviderClass(config)
      logger.info(`Zenith Storage Engine: ${providerType} active provider loaded for ${cacheKey}`)
    } catch (err: any) {
      logger.error({ error: err.message }, `Failed to load ${providerType} Storage Provider. Falling back to Local.`)
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
