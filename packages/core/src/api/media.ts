import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

const router: Router = Router()

/**
 * Zenith Media Router & Image Processing Engine
 * ─────────────────────────────────────────────
 * Serves media uploads and performs high-fidelity image transformations 
 * (resizing, format conversion, compression) on-the-fly.
 */
const mediaDir = path.resolve(process.cwd(), 'media')
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true })

router.get('/:filename', async (req, res, next) => {
  try {
    // Guard Rail: Prevent directory traversal attack
    const filename = path.basename(req.params.filename)
    const filePath = path.join(mediaDir, filename)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media file not found' })
    }

    const { width, height, format } = req.query

    const w = width ? Number(width) : undefined
    const h = height ? Number(height) : undefined

    if ((w !== undefined && (isNaN(w) || w <= 0 || w > 2000)) ||
        (h !== undefined && (isNaN(h) || h <= 0 || h > 2000))) {
      return res.status(400).json({ error: 'Invalid or excessive image dimensions (max 2000px)' })
    }

    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif']
    if (format && !allowedFormats.includes(format as string)) {
      return res.status(400).json({ error: 'Unsupported image format' })
    }

    // Check if the file is an image that we can transform
    const ext = path.extname(filename).toLowerCase()
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)

    if (isImage && (w || h || format)) {
      let transform = sharp(filePath)

      if (w || h) {
        transform = transform.resize({
          width: w,
          height: h,
          fit: 'cover',
        })
      }

      if (format) {
        transform = transform.toFormat(format as any)
        res.type(`image/${format}`)
      } else {
        // Map common extensions to standardized types
        const typeMap: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
          '.gif': 'image/gif',
          '.avif': 'image/avif',
        }
        res.type(typeMap[ext] || 'application/octet-stream')
      }

      return transform.pipe(res)
    }

    // Default static fallback: stream the original file directly
    res.sendFile(filePath)
  } catch (err: any) {
    next(err)
  }
})

export default router
