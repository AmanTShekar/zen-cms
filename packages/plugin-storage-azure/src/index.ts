import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export const azureStoragePlugin = (): ZenithPlugin => {
  return {
    id: 'storage-azure',
    name: 'Azure Storage Adapter',
    description: 'Azure Blob Storage Adapter',
    onReady: async (ctx: PluginContext) => {
      ctx.logger.info('[Azure Plugin] Registering Azure Storage Provider...')
      const core = require('@zenith-open/zenithcms-core')
      if (core && core.registerStorageProvider) {
        class AzureStorageProvider {
          constructor(config: any) {}
          async upload(file: any, options: any) { return { url: '', id: '' } }
          async delete(id: string) {}
        }
        core.registerStorageProvider('azure', AzureStorageProvider)
      }
    }
  }
}