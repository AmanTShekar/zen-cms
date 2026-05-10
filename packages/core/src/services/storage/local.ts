import fs from 'fs/promises';
import path from 'path';
import { StorageProvider, UploadResult } from './base';

export class LocalStorageProvider extends StorageProvider {
  private uploadDir: string;

  constructor() {
    super();
    this.uploadDir = path.resolve(process.cwd(), 'media');
    // Ensure dir exists
    fs.mkdir(this.uploadDir, { recursive: true }).catch(() => {});
  }

  async upload(buffer: Buffer, options: { filename: string; mimetype: string }): Promise<UploadResult> {
    const filename = `${Date.now()}-${options.filename}`;
    const filePath = path.join(this.uploadDir, filename);
    
    await fs.writeFile(filePath, buffer);
    
    return {
      url: `/media/${filename}`,
      id: filename,
      filename,
      mimetype: options.mimetype,
      size: buffer.length
    };
  }

  async delete(id: string): Promise<void> {
    const filePath = path.join(this.uploadDir, id);
    await fs.unlink(filePath).catch(() => {});
  }

  getUrl(id: string): string {
    return `/media/${id}`;
  }
}
