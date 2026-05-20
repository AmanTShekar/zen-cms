import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { AIService } from '../services/ai'
import { InvalidPayloadError, ServiceUnavailableError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

const router: Router = Router()
router.use(requireAuth)

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
router.post('/ai/generate', async (req: Request, res: Response, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableError('AI (set ANTHROPIC_API_KEY to enable)')
    }
    const { prompt } = req.body
    if (!prompt) throw new InvalidPayloadError('"prompt" is required')
    const result = await AIService.generateContent(prompt)
    res.json(createResponse({ text: result }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/ai/improve ────────────────────────────────────
router.post('/ai/improve', async (req: Request, res: Response, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableError('AI (set ANTHROPIC_API_KEY to enable)')
    }
    const { text, instruction } = req.body
    if (!text || !instruction)
      throw new InvalidPayloadError('"text" and "instruction" are required')

    const result = await AIService.improveText(text, instruction)
    res.json(createResponse({ text: result }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/ai/meta-description ───────────────────────────
router.post('/ai/meta-description', async (req: Request, res: Response, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ServiceUnavailableError('AI (set ANTHROPIC_API_KEY to enable)')
    }
    const { title, content } = req.body
    if (!title || !content) throw new InvalidPayloadError('"title" and "content" are required')

    const description = await AIService.generateMetaDescription(title, content)
    res.json(createResponse({ description }))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/ai/alt-text ───────────────────────────────────
router.post('/ai/alt-text', async (req: Request, res: Response, next) => {
  try {
    const { imageUrl, context } = req.body
    if (!imageUrl) throw new InvalidPayloadError('"imageUrl" is required')
    const altText = await AIService.generateAltText(imageUrl, context)
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

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const config = (req as any).zenith.config
    const suggestions: Array<{ text: string; url: string; collection: string }> = []

    for (const col of config.collections) {
      // Check if collection has a title or name field we can match against
      const hasTitle = col.fields.some(
        (f: any) => f.name === 'title' && ['text', 'string'].includes(f.type)
      )
      const hasName = col.fields.some(
        (f: any) => f.name === 'name' && ['text', 'string'].includes(f.type)
      )

      if (!hasTitle && !hasName) continue

      let docs: any[] = []
      try {
        // Production Hardening: Limit to 100 docs per collection to prevent OOM crashes
        docs = await adapter.find<any>(col.slug, {}, { limit: 100 })
      } catch (e) {
        continue
      }

      for (const doc of docs) {
        const keyword = (doc as any).title || (doc as any).name
        if (!keyword || keyword.length < 4) continue // Ignore very short generic words

        // Case-insensitive exact word boundary match
        const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i')
        if (regex.test(content)) {
          suggestions.push({
            text: keyword,
            url: `/${col.slug}/${(doc as any).slug || (doc as any).id || (doc as any)._id}`,
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
