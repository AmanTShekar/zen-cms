import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { requireAuth } from '../middleware/auth'
import { createResponse, createErrorResponse } from './utils'
import { AIService } from '../services/ai'
import { StorageService } from '../services/storage'
import { MediaService } from '../services/media'
import { validateMagicBytes } from './magic-bytes'
import { MediaVisionPipeline } from '../services/MediaVisionPipeline'
import { InvalidPayloadError } from '../errors'

const router: Router = Router()

// Ensure temp directory exists inside workspace boundaries
const tempDir = path.resolve(process.cwd(), 'temp/uploads')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

// Configure Multer to use disk storage (highly resilient, zero memory footprint, safe from OOM attacks)
const upload = multer({
  dest: tempDir,
  limits: { fileSize: 50 * 1024 * 1024 }, // Safe 50MB limit
})

/**
 * Zenith Upload Router
 * ───────────────────
 * Handles secure file uploads dynamically streaming to Cloudinary or S3/Local storage.
 */
router.post('/', requireAuth, upload.single('file'), async (req: any, res, next) => {
  if (!req.file) throw new InvalidPayloadError('No file uploaded')

  const filePath = req.file.path

  try {
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
    ]

    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      throw new InvalidPayloadError(`File type "${req.file.mimetype}" is not allowed`)
    }

    const isGenuine = await validateMagicBytes(filePath, req.file.mimetype)
    if (!isGenuine) {
      throw new InvalidPayloadError(`File content signature does not match the stated mimetype "${req.file.mimetype}"`)
    }

    let url = ''
    let fileId = ''
    let altText = ''

    let finalPath = filePath
    let finalMimetype = req.file.mimetype

    // Image processing pipeline
    if (['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      const processedPath = filePath + '.webp'
      await sharp(filePath)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(processedPath)
      
      finalPath = processedPath
      finalMimetype = 'image/webp'
    }

    // 1. Upload to cloud media service or standardized storage provider
    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
      // Cloudinary active
      const result = await MediaService.uploadFile(finalPath, {
        filename: req.file.originalname,
        mimetype: finalMimetype,
      })
      url = result.secure_url
      fileId = result.public_id
    } else {
      // Standard active storage provider (dynamic Local or AWS S3 / Cloudflare R2)
      const result = await StorageService.saveFile(finalPath, req.file.originalname, {
        mimetype: finalMimetype,
      })
      url = result.url
      fileId = result.id
    }

    // 2. Auto-generate Alt Text & Smart Tags if AI is enabled
    let tags: string[] = []
    if (process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        altText = await AIService.generateAltText(url, 'uploaded media')
      } catch (e) {
        console.error('Failed to generate alt text', e)
      }
      try {
        const tagResult = await AIService.generateImageTags(url)
        tags = tagResult.tags
        // Use AI description as alt text if none generated
        if (!altText && tagResult.description) {
          altText = tagResult.description
        }
      } catch (e) {
        console.error('Failed to generate image tags', e)
      }
    }

    // 3. Extract focal point from body (sent by MediaPicker FocalPointCropper)
    // When using multer, nested objects arrive as JSON strings — parse them
    let parsedBody: Record<string, unknown> = {}
    if (req.body.focalPoint && typeof req.body.focalPoint === 'string') {
      try { parsedBody = JSON.parse(req.body.focalPoint) } catch { /* ignore */ }
    } else if (req.body.focalPoint && typeof req.body.focalPoint === 'object') {
      parsedBody = req.body.focalPoint as Record<string, unknown>
    }
    let focalPoint: { x: number; y: number } | null = null
    if (parsedBody.x !== undefined && parsedBody.y !== undefined) {
      // Focal point provided by client (FocalPointCropper)
      focalPoint = {
        x: Math.max(0, Math.min(100, Number(parsedBody.x) || 50)),
        y: Math.max(0, Math.min(100, Number(parsedBody.y) || 50)),
      }
    } else if (req.file.mimetype.startsWith('image/')) {
      // Auto-extract focal point via vision pipeline for images without user-provided coordinates
      try {
        const fileBuffer = await fs.promises.readFile(filePath)
        const estimated = await MediaVisionPipeline.estimateFocalPoint(fileBuffer, req.file.mimetype)
        if (estimated.confidence >= 0.5) {
          focalPoint = { x: estimated.x, y: estimated.y }
        }
      } catch (e) {
        // Focal point auto-extraction is best-effort; fall back to null
      }
    }

    // 4. Persist media meta details to database adapter
    const doc = await req.__zenithAdapter.create('media', {
      url,
      id: fileId,
      mimetype: req.file.mimetype,
      size: req.file.size,
      alt: altText,
      tags,
      focalPoint,
    })

    res.json(createResponse(doc))
  } catch (error: unknown) {
    next(error)
  } finally {
    // Ensure temporary file is always cleaned up asynchronously
    fs.promises.unlink(filePath).catch((err) => {
      console.error(`[Zenith Upload] Failed to clean up temporary file at ${filePath}:`, err)
    })
  }
})

export default router
