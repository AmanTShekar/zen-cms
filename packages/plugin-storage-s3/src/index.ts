import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export const s3StoragePlugin = (): ZenithPlugin => {
  return {
    id: 'storage-s3',
    name: 'S3 Storage Adapter',
    description: 'AWS S3 & Cloudflare R2 Storage Adapter',
    onReady: async (ctx: PluginContext) => {
      ctx.logger.info('[S3 Plugin] Registering S3 Storage Provider...')
      const core = require('@zenith-open/zenithcms-core')
      if (core && core.registerStorageProvider) {
        // Here you would define the class that implements StorageProvider
        class S3StorageProvider {
          constructor(config: any) {}
          async upload(file: any, options: any) { return { url: '', id: '' } }
          async delete(id: string) {}
        }
        core.registerStorageProvider('s3', S3StorageProvider)
      }
    }
  }
}