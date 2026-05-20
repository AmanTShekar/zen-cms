import { describe, it, expect } from 'vitest'
import { validateMagicBytes } from '../src/api/magic-bytes'
import path from 'path'
import fs from 'fs/promises'

describe('validateMagicBytes', () => {
  const tempDir = path.resolve(process.cwd(), 'temp/tests')

  const createTempFile = async (filename: string, content: Buffer): Promise<string> => {
    await fs.mkdir(tempDir, { recursive: true })
    const filePath = path.join(tempDir, filename)
    await fs.writeFile(filePath, content)
    return filePath
  }

  const cleanTempFiles = async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  }

  it('should validate valid JPEG magic bytes', async () => {
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46])
    const filePath = await createTempFile('test.jpg', jpegBuffer)
    
    const isValid = await validateMagicBytes(filePath, 'image/jpeg')
    expect(isValid).toBe(true)

    await cleanTempFiles()
  })

  it('should reject invalid JPEG magic bytes (mimetype spoofing)', async () => {
    const textBuffer = Buffer.from('console.log("malicious code");')
    const filePath = await createTempFile('spoofed.jpg', textBuffer)
    
    const isValid = await validateMagicBytes(filePath, 'image/jpeg')
    expect(isValid).toBe(false)

    await cleanTempFiles()
  })

  it('should validate valid PNG magic bytes', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const filePath = await createTempFile('test.png', pngBuffer)
    
    const isValid = await validateMagicBytes(filePath, 'image/png')
    expect(isValid).toBe(true)

    await cleanTempFiles()
  })

  it('should validate valid WebP magic bytes', async () => {
    // RIFF....WEBP -> 52494646....57454250
    const webpBuffer = Buffer.alloc(12)
    webpBuffer.write('RIFF', 0, 'ascii')
    webpBuffer.write('WEBP', 8, 'ascii')
    const filePath = await createTempFile('test.webp', webpBuffer)
    
    const isValid = await validateMagicBytes(filePath, 'image/webp')
    expect(isValid).toBe(true)

    await cleanTempFiles()
  })

  it('should validate valid PDF magic bytes', async () => {
    // %PDF (25 50 44 46)
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46])
    const filePath = await createTempFile('test.pdf', pdfBuffer)
    
    const isValid = await validateMagicBytes(filePath, 'application/pdf')
    expect(isValid).toBe(true)

    await cleanTempFiles()
  })
})
