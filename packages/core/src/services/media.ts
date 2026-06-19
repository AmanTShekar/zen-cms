import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import multer from 'multer'
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

let isConfiguredGlobal = false;

const resolveConfig = async (overrideSettings?: any) => {
  let config = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  }
  
  if (overrideSettings) {
    if (overrideSettings.cloudinaryCloudName) config.cloudName = overrideSettings.cloudinaryCloudName
    if (overrideSettings.cloudinaryApiKey) config.apiKey = overrideSettings.cloudinaryApiKey
    if (overrideSettings.cloudinaryApiSecret && overrideSettings.cloudinaryApiSecret !== '[MASKED_CREDENTIAL]') config.apiSecret = overrideSettings.cloudinaryApiSecret
    return config
  }

  try {
    const adapter = AdapterFactory.getActiveAdapter()
    if (adapter) {
      const settings = await adapter.findOne<Record<string, any>>('z_settings', {})
      if (settings) {
        if (settings.cloudinaryCloudName) config.cloudName = settings.cloudinaryCloudName
        if (settings.cloudinaryApiKey) config.apiKey = settings.cloudinaryApiKey
        if (settings.cloudinaryApiSecret && settings.cloudinaryApiSecret !== '[MASKED_CREDENTIAL]') config.apiSecret = settings.cloudinaryApiSecret
      }
    }
  } catch (e) {
    logger.warn('Failed to load media config from settings')
  }
  return config
}

// Always use memoryStorage. The check is done at upload time instead.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
})

export const MediaService = {
  async testConnection(overrideSettings: any): Promise<boolean> {
    const config = await resolveConfig(overrideSettings)
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      throw new Error('Cloudinary credentials missing')
    }
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret
    })
    const result = await cloudinary.api.ping()
    return result.status === 'ok'
  },

  async uploadFile(
    fileInput: Buffer | string,
    options: { folder?: string; filename?: string; mimetype?: string } = {}
  ): Promise<UploadApiResponse> {
    const config = await resolveConfig()
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      throw new Error('Media service is not configured (missing Cloudinary credentials)')
    }

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret
    })

    const sanitizedFilename = options.filename
      ? options.filename.replace(/[^a-zA-Z0-9.-]/g, '-')
      : undefined

    const uploadOptions = {
      folder: options.folder || 'flowcms',
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

  async uploadBuffer(
    buffer: Buffer,
    options: { folder?: string; filename?: string; mimetype?: string } = {}
  ): Promise<UploadApiResponse> {
    return this.uploadFile(buffer, options)
  },

  async deleteFile(publicId: string): Promise<void> {
    const config = await resolveConfig()
    if (!config.cloudName || !config.apiKey || !config.apiSecret) {
      throw new Error('Media service is not configured')
    }
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret
    })
    await cloudinary.uploader.destroy(publicId)
    logger.info({ publicId }, 'Media file deleted')
  },

  async getHealth(): Promise<'ok' | 'disabled'> {
    const config = await resolveConfig()
    return (config.cloudName && config.apiKey && config.apiSecret) ? 'ok' : 'disabled'
  },
}
