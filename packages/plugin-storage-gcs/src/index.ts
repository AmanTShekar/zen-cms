import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export const gcsStoragePlugin = (): ZenithPlugin => {
  return {
    id: 'storage-gcs',
    name: 'GCS Storage Adapter',
    description: 'Google Cloud Storage Adapter',
    onReady: async (ctx: PluginContext) => {
      ctx.logger.info('[GCS Plugin] Registering GCS Storage Provider...')
      const core = require('@zenith-open/zenithcms-core')
      if (core && core.registerStorageProvider) {
        class GCSStorageProvider {
          constructor(config: any) {}
          async upload(file: any, options: any) { return { url: '', id: '' } }
          async delete(id: string) {}
        }
        core.registerStorageProvider('gcs', GCSStorageProvider)
      }
    }
  }
}