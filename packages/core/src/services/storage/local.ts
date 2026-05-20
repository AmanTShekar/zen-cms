import fs from 'fs/promises'
import { mkdirSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { StorageProvider, UploadResult } from './base'
import { logger } from '../../services/logger'

export class LocalStorageProvider extends StorageProvider {
  private uploadDir: string

  constructor() {
    super()
    this.uploadDir = path.resolve(process.cwd(), 'media')
    
    try {
      mkdirSync(this.uploadDir, { recursive: true })
    } catch (err: any) {
      logger.error({ err }, `[Zenith] FATAL: Failed to create upload directory`)
      throw err
    }
  }

  async upload(
    fileInput: Buffer | string,
    options: { filename: string; mimetype: string }
  ): Promise<UploadResult> {
    // Guard Rail 2: Prevent directory traversal on upload and replace spaces
    const safeBaseName = path.basename(options.filename).replace(/\s+/g, '-')
    
    // Guard Rail 3: Prevent race condition collisions using cryptographically secure UUIDs
    const filename = `${crypto.randomUUID()}-${safeBaseName}`
    const filePath = path.join(this.uploadDir, filename)

    let size = 0
    if (typeof fileInput === 'string') {
      const stats = await fs.stat(fileInput)
      size = stats.size
      await fs.copyFile(fileInput, filePath)
    } else {
      size = fileInput.length
      await fs.writeFile(filePath, fileInput)
    }

    return {
      url: `/media/${filename}`,
      id: filename,
      filename,
      mimetype: options.mimetype,
      size,
    }
  }

  async delete(id: string): Promise<void> {
    // Guard Rail 4: Prevent directory traversal attack on file deletion
    const safeId = path.basename(id)
    const filePath = path.join(this.uploadDir, safeId)
    
    await fs.unlink(filePath).catch((err) => {
      // Log the warning instead of silently swallowing failure
      logger.warn({ err, safeId }, `[Zenith] Warning: Failed to delete file`)
    })
  }

  getUrl(id: string): string {
    // Guard Rail 5: Sanitize the ID in URL generation
    const safeId = path.basename(id)
    return `/media/${safeId}`
  }
}
