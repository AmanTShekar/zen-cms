import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import sharp from 'sharp'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { InvalidPayloadError, NotFoundError } from '../errors'
import { ImageCdnService } from '../services/image-cdn'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

const router: Router = Router()
const fsPromises = fs.promises

/**
 * Zenith Media Router & Image Processing Engine
 * ─────────────────────────────────────────────
 * Serves media uploads and performs high-fidelity image transformations
 * (resizing, format conversion, smart crop with focal point) on-the-fly.
 */
const mediaDir = path.resolve(process.cwd(), 'media')
if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true })

const cacheDir = path.join(mediaDir, '.cache')
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })

/**
 * GET / — List all media records
 */
router.get('/', requireAuth, async (_req: Request, res: Response, next) => {
  try {
    const adapter = (_req as Record<string, unknown>).zenith?.adapter
    if (!adapter) return res.json(createResponse([]))
    const siteId = (_req as Record<string, unknown>).siteId
    if (!siteId) return res.status(400).json({ error: { message: 'Missing siteId' } })
    const items = await adapter.find('media', { siteId })
    res.json(createResponse(items))
  } catch (err) {
    next(err)
  }
})

/**
 * PATCH /:id — Update media metadata (focal point, alt text, etc.)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    if (!adapter) return next(new Error('No database adapter available'))
    const siteId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).siteId
    if (!siteId) return res.status(400).json({ error: { message: 'Missing siteId' } })
    const existing = await adapter.findOne('media', { _id: req.params.id, siteId })
    if (!existing) throw new NotFoundError('Media', req.params.id)
    const updated = await adapter.update('media', req.params.id, req.body)
    res.json(createResponse(updated))
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /:id — Delete a media record and its file
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    if (!adapter) return next(new Error('No database adapter available'))
    const siteId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).siteId
    if (!siteId) return res.status(400).json({ error: { message: 'Missing siteId' } })
    const existing = await adapter.findOne('media', { _id: req.params.id, siteId })
    if (!existing) throw new NotFoundError('Media', req.params.id)
    if (existing.filename) {
      const filePath = path.join(mediaDir, existing.filename)
      if (fs.existsSync(filePath)) await fsPromises.unlink(filePath)
    }
    await adapter.delete('media', req.params.id)
    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

/**
 * Convert a focal point percentage (0-100) to sharp gravity value.
 * Focal point smart crop: uses sharp's `position` to anchor the crop
 * around the user-defined focal coordinates.
 */
function focalPointToGravity(x: number, y: number): unknown {
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

/**
 * GET /:id/transform — Return a direct CDN transform URL or redirect to local fallback
 */
router.get('/:id/transform', async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter
    if (!adapter) return next(new Error('No database adapter available'))
    
    const siteId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).siteId || req.headers['x-zenith-site-id']
    if (!siteId) return res.status(400).json({ error: { message: 'Missing siteId' } })
    
    const media = await adapter.findOne('media', { _id: req.params.id, siteId })
    if (!media) throw new NotFoundError('Media', req.params.id)

    const { w, h, format, q } = req.query
    const options = {
      width: w ? Number(w) : undefined,
      height: h ? Number(h) : undefined,
      format: format as string,
      quality: q ? Number(q) : undefined,
    }

    // Attempt to generate CDN URL
    const originalUrl = media.url
    const cdnUrl = ImageCdnService.generateTransformUrl(originalUrl, options)
    
    if (cdnUrl) {
      // 302 Redirect to external CDN
      return res.redirect(302, cdnUrl)
    }

    // Fallback: Use local processing if filename exists
    if (!media.filename) {
      return res.redirect(302, originalUrl)
    }

    // Redirect to local dynamic Sharp endpoint
    const query = new URLSearchParams()
    if (w) query.set('width', String(w))
    if (h) query.set('height', String(h))
    if (format) query.set('format', String(format))
    if (media.focalPoint) {
      query.set('fpX', String(media.focalPoint.x))
      query.set('fpY', String(media.focalPoint.y))
    }

    const localUrl = `/api/v1/media/${media.filename}?${query.toString()}`
    return res.redirect(302, localUrl)
  } catch (err) {
    next(err)
  }
})

router.get('/:filename', requireAuth, async (req: Request, res: Response, next) => {
  try {
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const siteId = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).siteId || req.headers['x-zenith-site-id']
    if (!siteId) return res.status(400).json({ error: { message: 'Missing siteId' } })

    // Guard Rail: Prevent directory traversal attack
    const filename = path.basename(req.params.filename)
    
    // ISOLATION FIX: Verify tenant owns this media file
    const record = await adapter.findOne('media', { id: filename, siteId })
    if (!record) {
      // Fallback for Mongoose ID match if id mapping differs
      const recordById = await adapter.findOne('media', { _id: filename, siteId })
      if (!recordById) throw new NotFoundError('Media', filename)
    }

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
      const hashData = JSON.stringify({ filename, w, h, format, focalX, focalY })
      const hash = crypto.createHash('sha256').update(hashData).digest('hex')
      const targetFormat = format || ext.replace('.', '')
      const cacheFile = path.join(cacheDir, `${hash}.${targetFormat}`)

      const typeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.avif': 'image/avif',
      }
      const mimeType = format ? `image/${format}` : (typeMap[ext] || 'application/octet-stream')
      res.type(mimeType)
      res.set('Cache-Control', 'public, max-age=604800')

      if (fs.existsSync(cacheFile)) {
        return res.sendFile(cacheFile)
      }

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
            Math.max(0, Math.min(100, focalX as number)),
            Math.max(0, Math.min(100, focalY as number))
          )
        }
        transform = transform.resize(resizeOpts)
      }

      if (format) {
        transform = transform.toFormat(format as Record<string, unknown>)
      }

      try {
        await transform.toFile(cacheFile)
        return res.sendFile(cacheFile)
      } catch (cacheErr) {
        return transform.pipe(res)
      }
    }

    // Default static fallback: stream the original file directly
    // Immutable cache: the filename uniquely identifies the content
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    res.sendFile(filePath)
  } catch (err: unknown) {
    next(err)
  }
})

export default router
