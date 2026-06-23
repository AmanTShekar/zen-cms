import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { AIService } from '../services/ai'
import { InvalidPayloadError, ServiceUnavailableError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

const router: Router = Router()
router.use(requireAuth)

// Protect AI endpoints from billing exhaustion
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 AI generation requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many AI generation requests from this IP, please try again after 15 minutes' } }
})

/**
 * Zenith Content Tools API
 * ─────────────────────────────────────────────────────────────────
 * Features that non-technical content managers and editors will love.
 * All endpoints are behind /api/v1/content-tools
 *
 * POST /seo-analysis          — Real-time SEO score for a document
 * POST /quality               — Readability + content quality score
 * POST /ai/generate           — Generate text with AI
 * POST /ai/improve            — Improve existing text with AI
 * POST /ai/meta-description   — Auto-generate a meta description
 * POST /ai/alt-text           — Generate image alt text
 */

// ── POST /api/v1/content-tools/seo-analysis ──────────────────────────────────
router.post('/seo-analysis', async (req: Request, res: Response, next) => {
  try {
    const { title, description, content, slug } = req.body
    const result = AIService.analyzeSeo({ title, description, content, slug })
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/quality ───────────────────────────────────────
router.post('/quality', async (req: Request, res: Response, next) => {
  try {
    const { content } = req.body
    if (!content || typeof content !== 'string') {
      throw new InvalidPayloadError('"content" string is required')
    }
    const result = AIService.analyzeContentQuality(content)
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/ai/generate ───────────────────────────────────
router.post('/ai/generate', aiLimiter, async (req: Request, res: Response, next) => {
  try {
    const { prompt } = req.body
    if (!prompt) throw new InvalidPayloadError('"prompt" is required')
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const result = await AIService.generateContent(prompt, siteId)
    res.json(createResponse({ text: result }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/ai/improve ────────────────────────────────────
router.post('/ai/improve', aiLimiter, async (req: Request, res: Response, next) => {
  try {
    const { text, instruction } = req.body
    if (!text || !instruction)
      throw new InvalidPayloadError('"text" and "instruction" are required')
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const result = await AIService.improveText(text, instruction, siteId)
    res.json(createResponse({ text: result }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/ai/meta-description ───────────────────────────
router.post('/ai/meta-description', aiLimiter, async (req: Request, res: Response, next) => {
  try {
    const { title, content } = req.body
    if (!title || !content) throw new InvalidPayloadError('"title" and "content" are required')
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const description = await AIService.generateMetaDescription(title, content, siteId)
    res.json(createResponse({ description }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/ai/alt-text ───────────────────────────────────
router.post('/ai/alt-text', aiLimiter, async (req: Request, res: Response, next) => {
  try {
    const { imageUrl, context } = req.body
    if (!imageUrl) throw new InvalidPayloadError('"imageUrl" is required')
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const altText = await AIService.generateAltText(imageUrl, context, siteId)
    res.json(createResponse({ altText }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/auto-link ─────────────────────────────────────
router.post('/auto-link', async (req: Request, res: Response, next) => {
  try {
    const { content } = req.body
    if (!content || typeof content !== 'string') {
      throw new InvalidPayloadError('"content" string is required')
    }

    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const config = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith.config
    const siteId = req.headers['x-zenith-site-id'] as string
    const suggestions: Array<{ text: string; url: string; collection: string }> = []

    for (const col of config.collections) {
      // Check if collection has a title or name field we can match against
      const hasTitle = col.fields.some(
        (f: Record<string, unknown>) => f.name === 'title' && ['text', 'string'].includes(f.type)
      )
      const hasName = col.fields.some(
        (f: Record<string, unknown>) => f.name === 'name' && ['text', 'string'].includes(f.type)
      )

      if (!hasTitle && !hasName) continue

      let docs: Record<string, unknown>[] = []
      try {
        // Production Hardening: Limit to 100 docs per collection to prevent OOM crashes
        const filter: Record<string, unknown> = {}
        if (siteId) filter.siteId = siteId
        docs = await adapter.find<Record<string, unknown>>(col.slug, filter, { limit: 100 })
      } catch (e) {
        continue
      }

      for (const doc of docs) {
        const keyword = (doc as Record<string, unknown>).title || (doc as Record<string, unknown>).name
        if (!keyword || keyword.length < 4) continue // Ignore very short generic words

        // Case-insensitive exact word boundary match
        const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i')
        if (regex.test(content)) {
          suggestions.push({
            text: keyword,
            url: `/${col.slug}/${(doc as Record<string, unknown>).slug || (doc as Record<string, unknown>).id || (doc as Record<string, unknown>)._id}`,
            collection: col.name,
          })
        }
      }
    }

    res.json(createResponse({ suggestions }))
  } catch (err) {
    next(err)
  }
})

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export default router
