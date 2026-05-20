import { v2 as cloudinary, UploadApiResponse } from 'cloudinary'
import multer from 'multer'
import { logger } from './logger'

const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
)

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  logger.info('Media service: Cloudinary configured')
} else {
  logger.warn('Media service: Cloudinary env vars missing — media uploads will return 503')
}

// Resilient middleware: if not configured, return 503 — don't crash
export const upload = isConfigured
  ? multer({
      storage: multer.memoryStorage(), // use memory first, then upload to Cloudinary
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    })
  : {
      single: () => (_req: unknown, res: any, _next: unknown) => {
        res.status(503).json({ error: 'Media service unavailable' })
      },
      array: () => (_req: unknown, res: any, _next: unknown) => {
        res.status(503).json({ error: 'Media service unavailable' })
      },
    }

export const MediaService = {
  isAvailable: isConfigured,

  async uploadFile(
    fileInput: Buffer | string,
    options: { folder?: string; filename?: string; mimetype?: string } = {}
  ): Promise<UploadApiResponse> {
    if (!isConfigured) throw new Error('Media service is not configured')

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
    if (!isConfigured) throw new Error('Media service is not configured')
    await cloudinary.uploader.destroy(publicId)
    logger.info({ publicId }, 'Media file deleted')
  },

  async getHealth(): Promise<'ok' | 'disabled'> {
    return isConfigured ? 'ok' : 'disabled'
  },
}
