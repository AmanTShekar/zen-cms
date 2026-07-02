import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'
import { v2 as cloudinary } from 'cloudinary'

export interface CloudinaryConfig {
  cloudName?: string
  apiKey?: string
  apiSecret?: string
}

export const cloudinaryPlugin = (config?: CloudinaryConfig): ZenithPlugin => {
  return {
    id: 'cloudinary-storage',
    name: 'Cloudinary Storage',
    description: 'Handles media uploads and delivery via Cloudinary.',
    apply: () => {},
    onReady: async (ctx: PluginContext) => {
      
      const resolveConfig = async (overrideSettings?: Record<string, any>, siteId?: string) => {
        const activeConfig = {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME || config?.cloudName,
          apiKey: process.env.CLOUDINARY_API_KEY || config?.apiKey,
          apiSecret: process.env.CLOUDINARY_API_SECRET || config?.apiSecret
        }
        
        if (overrideSettings) {
          if (overrideSettings.cloudinaryCloudName) activeConfig.cloudName = overrideSettings.cloudinaryCloudName
          if (overrideSettings.cloudinaryApiKey) activeConfig.apiKey = overrideSettings.cloudinaryApiKey
          if (overrideSettings.cloudinaryApiSecret && overrideSettings.cloudinaryApiSecret !== '[MASKED_CREDENTIAL]') activeConfig.apiSecret = overrideSettings.cloudinaryApiSecret
          return activeConfig
        }

        try {
          const adapter = ctx.adapter as any
          if (adapter && adapter.findOne) {
            const query = siteId ? { siteId } : {}
            const settings = await adapter.findOne('z_settings', query)
            if (settings) {
              if (settings.cloudinaryCloudName) activeConfig.cloudName = settings.cloudinaryCloudName
              if (settings.cloudinaryApiKey) activeConfig.apiKey = settings.cloudinaryApiKey
              if (settings.cloudinaryApiSecret && settings.cloudinaryApiSecret !== '[MASKED_CREDENTIAL]') activeConfig.apiSecret = settings.cloudinaryApiSecret
            }
          }
        } catch (e) {
          ctx.logger.warn('[Cloudinary Plugin] Failed to load config from database settings')
        }
        return activeConfig
      }

      const mediaAdapter = {
        async testConnection(overrideSettings: Record<string, any>, siteId?: string): Promise<boolean> {
          const activeConfig = await resolveConfig(overrideSettings, siteId)
          if (!activeConfig.cloudName || !activeConfig.apiKey || !activeConfig.apiSecret) {
            throw new Error('Cloudinary credentials missing')
          }
          cloudinary.config({
            cloud_name: activeConfig.cloudName,
            api_key: activeConfig.apiKey,
            api_secret: activeConfig.apiSecret
          })
          const result = await cloudinary.api.ping()
          return result.status === 'ok'
        },

        async uploadFile(fileInput: Buffer | string, options: { folder?: string; filename?: string; mimetype?: string; siteId?: string } = {}): Promise<any> {
          const activeConfig = await resolveConfig(undefined, options.siteId)
          if (!activeConfig.cloudName || !activeConfig.apiKey || !activeConfig.apiSecret) {
            throw new Error('Cloudinary service is not configured')
          }

          cloudinary.config({
            cloud_name: activeConfig.cloudName,
            api_key: activeConfig.apiKey,
            api_secret: activeConfig.apiSecret
          })

          const sanitizedFilename = options.filename
            ? options.filename.replace(/[^a-zA-Z0-9.-]/g, '-')
            : undefined

          const uploadOptions = {
            folder: options.folder || 'zenithcms',
            public_id: sanitizedFilename ? `${Date.now()}-${sanitizedFilename}` : undefined,
            resource_type: 'auto' as const,
          }

          if (typeof fileInput === 'string') {
            return await cloudinary.uploader.upload(fileInput, uploadOptions)
          } else {
            return new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                  if (error || !result) return reject(error || new Error('Upload failed'))
                  resolve(result)
                }
              )
              stream.end(fileInput)
            })
          }
        },

        async deleteFile(publicId: string, options: { siteId?: string } = {}): Promise<void> {
          const activeConfig = await resolveConfig(undefined, options.siteId)
          if (!activeConfig.cloudName || !activeConfig.apiKey || !activeConfig.apiSecret) {
            ctx.logger.warn('[Cloudinary Plugin] Skipping file deletion: credentials missing')
            return
          }

          cloudinary.config({
            cloud_name: activeConfig.cloudName,
            api_key: activeConfig.apiKey,
            api_secret: activeConfig.apiSecret
          })

          await cloudinary.uploader.destroy(publicId)
        }
      }

      // @ts-ignore - Dynamically registering to core MediaService if it's available via global or injection
      // The Zenith engine uses global registry for media adapters
      const core = require('@zenith-open/zenithcms-core')
      if (core && core.MediaService) {
        core.MediaService.registerAdapter(mediaAdapter)
        ctx.logger.info('[Cloudinary Plugin] Successfully registered with Core MediaService.')
      } else {
        ctx.logger.error('[Cloudinary Plugin] Could not find core MediaService to register.')
      }
    }
  }
}
