export interface UploadResult {
  url: string
  id: string
  filename: string
  mimetype: string
  size: number
  width?: number
  height?: number
}

export abstract class StorageProvider {
  abstract upload(
    fileInput: Buffer | string,
    options: { filename: string; mimetype: string }
  ): Promise<UploadResult>
  abstract delete(id: string): Promise<void>
  abstract getUrl(id: string): string
}
