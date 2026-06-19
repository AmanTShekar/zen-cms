import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import { logger } from './logger'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

export class S3StorageService {
  private static async resolveConfig(overrideSettings?: any) {
    let config = {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
    }

    if (overrideSettings) {
      if (overrideSettings.s3Bucket) config.bucket = overrideSettings.s3Bucket
      if (overrideSettings.s3Region) config.region = overrideSettings.s3Region
      if (overrideSettings.s3AccessKey) config.accessKey = overrideSettings.s3AccessKey
      if (overrideSettings.s3SecretKey && overrideSettings.s3SecretKey !== '[MASKED_CREDENTIAL]') config.secretKey = overrideSettings.s3SecretKey
      if (overrideSettings.s3Endpoint) config.endpoint = overrideSettings.s3Endpoint
      return config
    }

    try {
      const adapter = AdapterFactory.getActiveAdapter()
      if (adapter) {
        const settings = await adapter.findOne<Record<string, any>>('z_settings', {})
        if (settings) {
          if (settings.s3Bucket) config.bucket = settings.s3Bucket
          if (settings.s3Region) config.region = settings.s3Region
          if (settings.s3AccessKey) config.accessKey = settings.s3AccessKey
          if (settings.s3SecretKey && settings.s3SecretKey !== '[MASKED_CREDENTIAL]') config.secretKey = settings.s3SecretKey
          if (settings.s3Endpoint) config.endpoint = settings.s3Endpoint
        }
      }
    } catch (e) {
      logger.warn('Failed to load S3 config from settings')
    }
    return config
  }

  private static getClient(config: any) {
    return new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey
      },
      endpoint: config.endpoint || undefined,
      forcePathStyle: config.forcePathStyle
    })
  }

  static async testConnection(overrideSettings: any): Promise<boolean> {
    const config = await this.resolveConfig(overrideSettings)
    if (!config.bucket || !config.accessKey || !config.secretKey) {
      throw new Error('Missing required S3 credentials or bucket name')
    }
    const client = this.getClient(config)
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
    return true
  }

  static async write(key: string, body: string) {
    const config = await this.resolveConfig()
    if (!config.bucket) return
    const client = this.getClient(config)
    try {
      await client.send(new PutObjectCommand({
        Bucket: config.bucket,
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

  static async delete(key: string) {
    const config = await this.resolveConfig()
    if (!config.bucket) return
    const client = this.getClient(config)
    try {
      await client.send(new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key
      }))
      logger.info(`[S3Storage] Successfully deleted block at ${key}`)
    } catch (error: any) {
      logger.error(`[S3Storage] Failed to delete block from S3: ${error.message}`)
      throw error
    }
  }

  static async read(key: string): Promise<string | null> {
    const config = await this.resolveConfig()
    if (!config.bucket) return null
    const client = this.getClient(config)
    try {
      const response = await client.send(new GetObjectCommand({
        Bucket: config.bucket,
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

export const getBlockStorage = () => {
  return S3StorageService
}
