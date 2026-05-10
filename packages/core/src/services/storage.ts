import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
async function ensureDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    logger.error('Failed to create upload directory');
  }
}

ensureDir();

export const StorageService = {
  async saveFile(buffer: Buffer, filename: string): Promise<{ url: string; id: string }> {
    const fileId = `${Date.now()}-${filename}`;
    const filePath = path.join(UPLOAD_DIR, fileId);
    
    await fs.writeFile(filePath, buffer);
    
    // In a real app, this URL would be served by Express static middleware
    const url = `/uploads/${fileId}`;
    
    return { url, id: fileId };
  },

  async deleteFile(fileId: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, fileId);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      logger.warn({ fileId }, 'File not found during deletion');
    }
  }
};
