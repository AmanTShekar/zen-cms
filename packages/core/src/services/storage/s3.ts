import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { StorageProvider, UploadResult } from './base'
import { logger } from '../logger'
import fs from 'fs'
import fsPromises from 'fs/promises'
import path from 'path'

export class S3StorageProvider extends StorageProvider {
  private client: S3Client
  private bucket: string
  private publicUrl?: string

  constructor() {
    super()
    const region = process.env.S3_REGION || 'us-east-1'
    const endpoint = process.env.S3_ENDPOINT
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY
    const bucket = process.env.S3_BUCKET

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        '[Zenith S3 Provider] Missing required S3 configuration: S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY must be provided.'
      )
    }

    this.bucket = bucket
    this.publicUrl = process.env.S3_PUBLIC_URL

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // Force path style is useful for R2 / MinIO
      forcePathStyle: endpoint ? true : undefined,
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
      body = fileInput
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options.mimetype,
        // Default to public-read, but let custom endpoints handle this via signed URL/buckets policy if required
        ACL: this.publicUrl ? undefined : 'public-read',
      })
    )

    const url = this.getUrl(key)

    return {
      url,
      id: key,
      filename,
      mimetype: options.mimetype,
      size,
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
    const endpoint = process.env.S3_ENDPOINT
    if (endpoint) {
      const base = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint
      return `${base}/${this.bucket}/${id}`
    }
    return `https://${this.bucket}.s3.amazonaws.com/${id}`
  }
}
