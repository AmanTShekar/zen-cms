import { requireAuth, requireRole, createResponse, InvalidPayloadError, ServiceUnavailableError, AdapterFactory, ValidationError } from '@zenith-open/zenithcms-core'
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'


import { AIService } from './service'


import { DatabaseAdapter } from '@zenith-open/zenithcms-types'

export const contentToolsRouter = Router()
contentToolsRouter.use(requireAuth)

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
contentToolsRouter.post('/seo-analysis', async (req: Request, res: Response, next) => {
  try {
    const { title, description, content, slug } = req.body
    const result = AIService.analyzeSeo({ title, description, content, slug })
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/content-tools/quality ───────────────────────────────────────
contentToolsRouter.post('/quality', async (req: Request, res: Response, next) => {
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
contentToolsRouter.post('/ai/generate', aiLimiter, async (req: Request, res: Response, next) => {
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
contentToolsRouter.post('/ai/improve', aiLimiter, async (req: Request, res: Response, next) => {
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
contentToolsRouter.post('/ai/meta-description', aiLimiter, async (req: Request, res: Response, next) => {
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
contentToolsRouter.post('/ai/alt-text', aiLimiter, async (req: Request, res: Response, next) => {
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
contentToolsRouter.post('/auto-link', async (req: Request, res: Response, next) => {
  try {
    const { content } = req.body
    if (!content || typeof content !== 'string') {
      throw new InvalidPayloadError('"content" string is required')
    }

    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    // @ts-ignore: TS2532 - unresolved type from removing @ts-nocheck
    const config = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith.config
    const siteId = req.headers['x-zenith-site-id'] as string
    const suggestions: Array<{ text: string; url: string; collection: string }> = []

    for (const col of config.collections) {
      // Check if collection has a title or name field we can match against
      const hasTitle = col.fields.some(
        (f: Record<string, any>) => f.name === 'title' && ['text', 'string'].includes(f.type)
      )
      const hasName = col.fields.some(
        (f: Record<string, any>) => f.name === 'name' && ['text', 'string'].includes(f.type)
      )

      if (!hasTitle && !hasName) continue

      let docs: Record<string, any>[] = []
      try {
        // Production Hardening: Limit to 100 docs per collection to prevent OOM crashes
        const filter: Record<string, any> = {}
        if (siteId) filter.siteId = siteId
        docs = await adapter.find<Record<string, any>>(col.slug, filter, { limit: 100 })
      } catch (e) {
        continue
      }

      for (const doc of docs) {
        const keyword = (doc as Record<string, any>).title || (doc as Record<string, any>).name
        if (!keyword || keyword.length < 4) continue // Ignore very short generic words

        // Case-insensitive exact word boundary match
        const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i')
        if (regex.test(content)) {
          suggestions.push({
            text: keyword,
            url: `/${col.slug}/${(doc as Record<string, any>).slug || (doc as Record<string, any>).id || (doc as Record<string, any>)._id}`,
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




const VALID_FIELD_TYPES = [
  'text', 'number', 'email', 'textarea', 'checkbox',
  'date', 'select', 'media', 'richtext', 'relation',
  'json', 'slug', 'array', 'blocks',
] as const

const AIFieldSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Field name must be a valid identifier'),
  type: z.enum(VALID_FIELD_TYPES),
  label: z.string().optional(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  defaultValue: z.any().optional(),
})

const AICollectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  labels: z.object({ singular: z.string(), plural: z.string() }).optional(),
  drafts: z.boolean().optional(),
  timestamps: z.boolean().optional(),
  fields: z.array(AIFieldSchema).min(1).max(50),
})


export const systemAiRouter = Router()
systemAiRouter.use(requireAuth)

systemAiRouter.post('/ai/models/fetch', aiLimiter, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { provider, apiKey } = req.body
    if (!provider) throw new InvalidPayloadError('Provider is required')

    let finalApiKey = apiKey
    if (!finalApiKey || finalApiKey === '[MASKED_CREDENTIAL]') {
      const adapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter
      const siteId = req.headers['x-zenith-site-id'] as string
      // ISOLATION FIX: scope settings lookup to siteId
      const settingsQuery = siteId ? { siteId } : {}
      const settings = await adapter?.findOne('z_settings', settingsQuery)
      
      const keyMap: Record<string, string> = {
        openrouter: 'openRouterApiKey',
        openai: 'openaiApiKey',
        anthropic: 'anthropicApiKey',
        google: 'googleApiKey',
        groq: 'groqApiKey',
        nvidia: 'nvidiaApiKey',
        together: 'togetherApiKey',
        mistral: 'mistralApiKey',
        cohere: 'cohereApiKey',
        xai: 'xaiApiKey'
      }
      
      const dbKey = settings?.[keyMap[provider]]
      if (dbKey && dbKey !== '[MASKED_CREDENTIAL]') {
        finalApiKey = dbKey
      }
    }

    if (!finalApiKey || finalApiKey === '[MASKED_CREDENTIAL]') {
      throw new InvalidPayloadError(`No valid API key provided or found for ${provider}`)
    }

    const models = await AIService.fetchModels(provider, finalApiKey)
    res.json(createResponse({ models }))
  } catch (err) {
    next(err)
  }
})
systemAiRouter.post('/ai/test', aiLimiter, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { provider, model, apiKey } = req.body
    if (!provider || !model) throw new InvalidPayloadError('Provider and Model are required')

    let finalApiKey = apiKey
    if (!finalApiKey || finalApiKey === '[MASKED_CREDENTIAL]') {
      const adapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter
      const siteId = req.headers['x-zenith-site-id'] as string
      // ISOLATION FIX: scope settings lookup to siteId
      const settingsQuery = siteId ? { siteId } : {}
      const settings = await adapter?.findOne('z_settings', settingsQuery)
      
      const keyMap: Record<string, string> = {
        openrouter: 'openRouterApiKey',
        openai: 'openaiApiKey',
        anthropic: 'anthropicApiKey',
        google: 'googleApiKey',
        groq: 'groqApiKey',
        nvidia: 'nvidiaApiKey',
        together: 'togetherApiKey',
        mistral: 'mistralApiKey',
        cohere: 'cohereApiKey',
        xai: 'xaiApiKey'
      }
      
      const dbKey = settings?.[keyMap[provider]]
      if (dbKey && dbKey !== '[MASKED_CREDENTIAL]') {
        finalApiKey = dbKey
      }
    }

    if (!finalApiKey || finalApiKey === '[MASKED_CREDENTIAL]') {
      throw new InvalidPayloadError(`No valid API key provided or found for ${provider}`)
    }

    const result = await AIService.testConnection(provider, model, finalApiKey)
    res.json(createResponse({ result }))
  } catch (err) {
    next(err)
  }
})
systemAiRouter.post('/ai/tag-image', aiLimiter, async (req: Request, res: Response, next) => {
  try {
    const { imageUrl } = req.body
    if (!imageUrl) throw new InvalidPayloadError('imageUrl is required')
    const result = await AIService.generateImageTags(imageUrl)
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})