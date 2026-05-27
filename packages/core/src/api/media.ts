import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { InvalidPayloadError, NotFoundError } from '../errors'

const router: Router = Router()

/**
 * Zenith Media Router & Image Processing Engine
 * ─────────────────────────────────────────────
 * Serves media uploads and performs high-fidelity image transformations
 * (resizing, format conversion, smart crop with focal point) on-the-fly.
 */
const mediaDir = path.resolve(process.cwd(), 'media')
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true })

/**
 * Convert a focal point percentage (0-100) to sharp gravity value.
 * Focal point smart crop: uses sharp's `position` to anchor the crop
 * around the user-defined focal coordinates.
 */
function focalPointToGravity(x: number, y: number): any {
  // Map X: 0=left, 50=center, 100=right
  // Map Y: 0=top, 50=center, 100=bottom
  if (x < 33) {
    if (y < 33) return 'northwest'
    if (y > 66) return 'southwest'
    return 'west'
  }
  if (x > 66) {
    if (y < 33) return 'northeast'
    if (y > 66) return 'southeast'
    return 'east'
  }
  if (y < 33) return 'north'
  if (y > 66) return 'south'
  return 'center'
}

router.get('/:filename', async (req: Request, res: Response, next) => {
  try {
    // Guard Rail: Prevent directory traversal attack
    const filename = path.basename(req.params.filename)
    const filePath = path.join(mediaDir, filename)

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Media', filename)
    }

    const { width, height, format, fpX, fpY } = req.query

    const w = width ? Number(width) : undefined
    const h = height ? Number(height) : undefined

    if ((w !== undefined && (isNaN(w) || w <= 0 || w > 2000)) ||
        (h !== undefined && (isNaN(h) || h <= 0 || h > 2000))) {
      throw new InvalidPayloadError('Invalid or excessive image dimensions (max 2000px)')
    }

    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif']
    if (format && !allowedFormats.includes(format as string)) {
      throw new InvalidPayloadError('Unsupported image format')
    }

    // Parse focal point from query params (e.g., ?fpX=75&fpY=25)
    const focalX = fpX !== undefined ? Number(fpX) : undefined
    const focalY = fpY !== undefined ? Number(fpY) : undefined
    const hasFocal = focalX !== undefined && focalY !== undefined && !isNaN(focalX) && !isNaN(focalY)

    // Check if the file is an image that we can transform
    const ext = path.extname(filename).toLowerCase()
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)

    if (isImage && (w || h || format)) {
      let transform = sharp(filePath)

      if (w || h) {
        const resizeOpts: sharp.ResizeOptions = {
          width: w,
          height: h,
          fit: 'cover',
        }
        // Apply focal point as crop position when both dimensions are specified
        if (hasFocal && w && h) {
          resizeOpts.position = focalPointToGravity(
            Math.max(0, Math.min(100, focalX)),
            Math.max(0, Math.min(100, focalY))
          )
        }
        transform = transform.resize(resizeOpts)
      }

      if (format) {
        transform = transform.toFormat(format as any)
        res.type(`image/${format}`)
      } else {
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

      // Cache transformed images for 7 days — query params produce variant-specific results
      res.set('Cache-Control', 'public, max-age=604800')
      return transform.pipe(res)
    }

    // Default static fallback: stream the original file directly
    // Immutable cache: the filename uniquely identifies the content
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.sendFile(filePath)
  } catch (err: any) {
    next(err)
  }
})

export default router
