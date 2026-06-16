import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { logger } from './logger'

export const isS3Enabled = () => !!process.env.S3_BUCKET

class S3Storage {
  private client: S3Client
  private bucket: string

  constructor() {
    this.bucket = process.env.S3_BUCKET || ''
    this.client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || ''
      },
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
    })
  }

  async write(key: string, body: string) {
    if (!this.bucket) return
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/typescript'
      }))
      logger.info(`[S3Storage] Successfully wrote block to ${key}`)
    } catch (error: any) {
      logger.error(`[S3Storage] Failed to write block to S3: ${error.message}`)
      throw error
    }
  }

  async delete(key: string) {
    if (!this.bucket) return
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      }))
      logger.info(`[S3Storage] Successfully deleted block at ${key}`)
    } catch (error: any) {
      logger.error(`[S3Storage] Failed to delete block from S3: ${error.message}`)
      throw error
    }
  }

  async read(key: string): Promise<string | null> {
    if (!this.bucket) return null
    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }))
      return await response.Body?.transformToString() || null
    } catch (error: any) {
      if (error.name === 'NoSuchKey') return null
      logger.error(`[S3Storage] Failed to read block from S3: ${error.message}`)
      throw error
    }
  }
}

let storageInstance: S3Storage | null = null

export const getBlockStorage = () => {
  if (!isS3Enabled()) return null
  if (!storageInstance) {
    storageInstance = new S3Storage()
  }
  return storageInstance
}
