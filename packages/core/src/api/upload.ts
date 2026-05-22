import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../middleware/auth'
import { createResponse, createErrorResponse } from './utils'
import { AIService } from '../services/ai'
import { StorageService } from '../services/storage'
import { MediaService } from '../services/media'
import { validateMagicBytes } from './magic-bytes'

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
  if (!req.file) return res.status(400).json(createErrorResponse(400, 'No file uploaded'))

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
      return res.status(400).json(createErrorResponse(400, `File type "${req.file.mimetype}" is not allowed`))
    }

    const isGenuine = await validateMagicBytes(filePath, req.file.mimetype)
    if (!isGenuine) {
      return res.status(400).json(createErrorResponse(400, `File content signature does not match the stated mimetype "${req.file.mimetype}"`))
    }

    let url = ''
    let fileId = ''
    let altText = ''

    // 1. Upload to cloud media service or standardized storage provider
    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
      // Cloudinary active
      const result = await MediaService.uploadFile(filePath, {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
      })
      url = result.secure_url
      fileId = result.public_id
    } else {
      // Standard active storage provider (dynamic Local or AWS S3 / Cloudflare R2)
      const result = await StorageService.saveFile(filePath, req.file.originalname, {
        mimetype: req.file.mimetype,
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
    const focalPoint = (parsedBody.x !== undefined && parsedBody.y !== undefined)
      ? {
            x: Math.max(0, Math.min(100, Number(parsedBody.x) || 50)),
            y: Math.max(0, Math.min(100, Number(parsedBody.y) || 50)),
          }
      : null

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
