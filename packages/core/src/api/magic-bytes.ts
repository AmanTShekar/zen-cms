import fs from 'fs/promises'

/**
 * Validates the file's content signature (magic bytes) against its stated mimetype.
 * Returns true if the content matches the expected format.
 */
export async function validateMagicBytes(filePath: string, mimetype: string): Promise<boolean> {
  let fileHandle: fs.FileHandle | null = null
  try {
    fileHandle = await fs.open(filePath, 'r')
    const buffer = Buffer.alloc(16)
    const { bytesRead } = await fileHandle.read(buffer, 0, 16, 0)
    if (bytesRead < 4) {
      return false // Too small to be any valid allowed type
    }

    const hex = buffer.toString('hex').toUpperCase()

    switch (mimetype) {
      case 'image/jpeg':
        // JPEGs start with FF D8 FF
        return hex.startsWith('FFD8FF')

      case 'image/png':
        // PNGs start with 89 50 4E 47 0D 0A 1A 0A
        return hex.startsWith('89504E470D0A1A0A')

      case 'image/webp':
        // WebP has RIFF at 0-3 and WEBP at 8-11
        // RIFF = 52 49 46 46, WEBP = 57 45 42 50
        return hex.startsWith('52494646') && hex.substring(16, 24) === '57454250'

      case 'image/gif':
        // GIF87a (474946383761) or GIF89a (474946383961)
        return hex.startsWith('474946383761') || hex.startsWith('474946383961')

      case 'application/pdf':
        // PDFs start with %PDF (25 50 44 46)
        return hex.startsWith('25504446')

      case 'video/mp4':
        // MP4s contain 'ftyp' starting at index 4 (byte representation: 66 74 79 70)
        return hex.substring(8, 16) === '66747970'

      case 'video/webm':
        // WebM files start with EBML header element (1A 45 DF A3)
        return hex.startsWith('1A45DFA3')

      case 'audio/mpeg':
        // MP3s typically start with ID3 container (49 44 33) or audio frame sync (FFF...)
        return hex.startsWith('494433') || hex.startsWith('FFFB') || hex.startsWith('FFF3') || hex.startsWith('FFF2')

      default:
        return false
    }
  } catch (err) {
    return false
  } finally {
    if (fileHandle) {
      await fileHandle.close().catch(() => {})
    }
  }
}
