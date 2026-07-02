import multer from 'multer'
import { logger } from './logger'

// Always use memoryStorage. The check is done at upload time instead.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
})

export interface MediaAdapter {
  testConnection(overrideSettings: Record<string, any>, siteId?: string): Promise<boolean>;
  uploadFile(fileInput: Buffer | string, options: { folder?: string; filename?: string; mimetype?: string; siteId?: string }): Promise<any>;
  deleteFile(publicId: string, options?: { siteId?: string }): Promise<void>;
}

let activeAdapter: MediaAdapter | null = null;

export const MediaService = {
  registerAdapter(adapter: MediaAdapter) {
    activeAdapter = adapter;
    logger.info('Zenith Media Service: Cloud Adapter registered.')
  },

  async testConnection(overrideSettings: Record<string, any>, siteId?: string): Promise<boolean> {
    if (!activeAdapter) {
      logger.warn('MediaService.testConnection called but no adapter is registered.');
      return false;
    }
    return await activeAdapter.testConnection(overrideSettings, siteId);
  },

  async uploadFile(
    fileInput: Buffer | string,
    options: { folder?: string; filename?: string; mimetype?: string; siteId?: string } = {}
  ): Promise<any> {
    if (!activeAdapter) {
      throw new Error('Media service is not configured (missing Cloudinary plugin or credentials)')
    }
    return await activeAdapter.uploadFile(fileInput, options);
  },

  async deleteFile(publicId: string, options: { siteId?: string } = {}): Promise<void> {
    if (!activeAdapter) {
      logger.warn('MediaService.deleteFile called but no adapter is registered.');
      return;
    }
    await activeAdapter.deleteFile(publicId, options);
  },

  async uploadBuffer(
    buffer: Buffer,
    options: { folder?: string; filename?: string; mimetype?: string; siteId?: string } = {}
  ): Promise<any> {
    return this.uploadFile(buffer, options)
  },

  async getHealth(siteId?: string): Promise<'ok' | 'disabled'> {
    if (!activeAdapter) return 'disabled';
    return 'ok';
  }
}
