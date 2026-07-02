import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageProvider } from '../../../packages/core/src/services/storage/local'
import path from 'path'
import fs from 'fs/promises'

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider
  const uploadDir = path.resolve(process.cwd(), 'media')

  beforeEach(() => {
    provider = new LocalStorageProvider()
  })

  it('should upload a file and return correct metadata', async () => {
    const buffer = Buffer.from('test content')
    const result = await provider.upload(buffer, { filename: 'test.txt', mimetype: 'text/plain' })

    expect(result.url).toContain('/media/')
    expect(result.filename).toContain('test.txt')
    expect(result.id).toContain('test.txt')
    
    // Verify file actually exists
    const filePath = path.join(uploadDir, result.id)
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false)
    expect(fileExists).toBe(true)

    // Cleanup
    await provider.delete(result.id)
  })

  it('should sanitize filenames to prevent directory traversal on upload', async () => {
    const buffer = Buffer.from('test content')
    const result = await provider.upload(buffer, { filename: '../../../../etc/passwd', mimetype: 'text/plain' })

    // It should strip the ../ path segments and just keep the basename
    expect(result.filename).not.toContain('etc')
    expect(result.filename).toContain('passwd')
    expect(result.filename).not.toContain('..')
    
    // Cleanup
    await provider.delete(result.id)
  })

  it('should sanitize IDs on delete to prevent directory traversal', async () => {
    // Attempting to delete a traversal path should not throw, but should be handled safely
    // (We expect it to just try to delete a non-existent file in the media dir because of path.basename)
    await expect(provider.delete('../../../../etc/passwd')).resolves.toBeUndefined()
  })

  it('should return correct URL with sanitized ID', () => {
    const url = provider.getUrl('../../../../etc/passwd')
    expect(url).toBe('/media/passwd')
  })
})
