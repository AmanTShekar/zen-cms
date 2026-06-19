import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { StorageProvider, UploadResult } from './base'
import { logger } from '../logger'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'
import { PassThrough } from 'stream'

export class S3StorageProvider extends StorageProvider {
  private client: S3Client
  private bucket: string
  private publicUrl?: string
  private endpoint?: string

  constructor(config?: any) {
    super()
    const region = config?.region || 'us-east-1'
    const endpoint = config?.endpoint
    const accessKeyId = config?.accessKeyId
    const secretAccessKey = config?.secretAccessKey
    const bucket = config?.bucket

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        '[Zenith S3 Provider] Missing required S3 configuration: S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY must be provided.'
      )
    }

    this.bucket = bucket
    this.publicUrl = config?.publicUrl
    this.endpoint = endpoint

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Force path style is useful for R2 / MinIO
      forcePathStyle: !!endpoint,
    })

    logger.info({ bucket, region, hasCustomEndpoint: !!endpoint }, 'S3 Storage Provider initialized successfully')
  }

  async upload(
    fileInput: Buffer | string,
    options: { filename: string; mimetype: string }
  ): Promise<UploadResult> {
    const safeBaseName = path.basename(options.filename).replace(/\s+/g, '-')
    const filename = `${Date.now()}-${safeBaseName}`
    const key = `uploads/${filename}`

    let body: any
    let size = 0

    if (typeof fileInput === 'string') {
      const stats = await fsPromises.stat(fileInput)
      size = stats.size
      body = fs.createReadStream(fileInput)
    } else {
      size = fileInput.length
      // lib-storage works best with Streams or Buffers. Buffer is fine here.
      body = fileInput
    }

    try {
      // Enterprise Multipart Upload using lib-storage
      const parallelUploads3 = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: options.mimetype,
          // Default to public-read, but let custom endpoints handle this via signed URL/buckets policy if required
          ACL: this.publicUrl ? undefined : 'public-read',
          // Enterprise CDN caching - immutable asset
          CacheControl: 'public, max-age=31536000, immutable',
        },
        // Optional configuration
        queueSize: 4, // Number of concurrent upload parts
        partSize: 5 * 1024 * 1024, // 5 MB part size
        leavePartsOnError: false, // Clean up failed multipart uploads
      })

      // Track progress internally (can be piped to telemetry later)
      parallelUploads3.on('httpUploadProgress', (progress: any) => {
        if (size > 10 * 1024 * 1024) {
          logger.debug({ key, loaded: progress.loaded, total: progress.total }, '[S3Storage] Multipart upload progress')
        }
      })

      await parallelUploads3.done()

      const url = this.getUrl(key)

      return {
        url,
        id: key,
        filename,
        mimetype: options.mimetype,
        size,
      }
    } catch (err: any) {
      logger.error({ key, error: err.message }, '[S3Storage] Failed to execute parallel upload')
      throw err
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const normalizedKey = path.normalize(id).replace(/^(\.\.(\/|\\))+/, '')
      const safeId = normalizedKey.startsWith('uploads/') ? normalizedKey : `uploads/${path.basename(normalizedKey)}`

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: safeId,
        })
      )
    } catch (err: any) {
      logger.error({ id, error: err.message }, 'Failed to delete file from S3 bucket')
    }
  }

  getUrl(id: string): string {
    if (this.publicUrl) {
      // Ensure no trailing slash mismatch
      const base = this.publicUrl.endsWith('/') ? this.publicUrl.slice(0, -1) : this.publicUrl
      return `${base}/${id}`
    }
    // Default standard AWS S3 format
    const endpointStr = this.endpoint
    if (endpointStr) {
      const base = endpointStr.endsWith('/') ? endpointStr.slice(0, -1) : endpointStr
      return `${base}/${this.bucket}/${id}`
    }
    return `https://${this.bucket}.s3.amazonaws.com/${id}`
  }
}
