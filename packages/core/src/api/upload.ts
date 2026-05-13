import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { createResponse, createErrorResponse } from './utils';
import { getModelForCollection } from '../database/model-factory';
import { AIService } from '../services/ai';

const router: Router = Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Zenith Upload Router
 * ───────────────────
 * Handles secure file uploads and registers them in the Media collection.
 */
router.post('/', requireAuth, upload.single('file'), async (req: unknown, res, next) => {
  try {
    if (!req.file) return res.status(400).json(createErrorResponse(400, 'No file uploaded'));

    let url = `/uploads/${req.file.filename}`;
    let cloudinaryId = '';
    let altText = '';

    // If Cloudinary is configured, upload the file with AI Focal Point detection
    if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
      const cloudinary = (await import('cloudinary')).v2;
      const result = await cloudinary.uploader.upload(req.file.path, {
        gravity: "auto:subject", // AI focal point gravity
        crop: "fill"
      });
      url = result.secure_url;
      cloudinaryId = result.public_id;
    }

    // Auto-generate Alt Text if AI is enabled
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        altText = await AIService.generateAltText(url, "uploaded media");
      } catch (e) {
        // Soft fail alt text generation
        console.error('Failed to generate alt text', e);
      }
    }

    const mediaModel = getModelForCollection({
      name: 'Media',
      slug: 'media',
      fields: []
    } as unknown);

    const doc = await mediaModel.create({
      url,
      id: cloudinaryId || req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      alt: altText,
      focalPointAuto: true // Mark as focal point optimized
    });

    res.json(createResponse(doc));
  } catch (error: unknown) {
    next(error);
  }
});

export default router;
