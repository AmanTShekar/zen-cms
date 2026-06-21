import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import os from 'os'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { requireAuth, requireRole } from '../../middleware/auth'
import { createResponse, createErrorResponse } from '../utils'
import { ApiKeyService } from '../../services/api-key'
import { SearchService } from '../../services/search'
import { InvalidPayloadError, NotFoundError, ValidationError } from '../../errors'
import { CacheService } from '../../services/cache'
import { getPrometheusMetrics } from '../../middleware/metrics'
import { AIService } from '../../services/ai'
import { VectorSearchService } from '../../services/vector-search'
import { adminComponentRegistry } from '../../plugins/hooks'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../../database/adapters/BaseAdapter'
import { AuthService } from '../../services/auth'
import { EmailService } from '../../services/email'
import { ContentService } from '../../services/content'
import { createCollectionRouter } from '../factory'
import { execSync } from 'child_process'

const MASK_PLACEHOLDER = '[MASKED_CREDENTIAL]'

export function maskSettings(settings: any) {
  if (!settings) return settings
  const result = JSON.parse(JSON.stringify(settings)) // deep clone
  
  if (result.smtp?.password) result.smtp.password = MASK_PLACEHOLDER
  if (result.stripe?.secretKey) result.stripe.secretKey = MASK_PLACEHOLDER
  if (result.stripe?.webhookSecret) result.stripe.webhookSecret = MASK_PLACEHOLDER
  
  // Mask AI Keys
  const aiKeys = [
    'openaiApiKey', 'anthropicApiKey', 'googleApiKey', 'openRouterApiKey',
    'groqApiKey', 'nvidiaApiKey', 'togetherApiKey', 'mistralApiKey',
    'cohereApiKey', 'xaiApiKey', 'aiApiKey'
  ]
  
  aiKeys.forEach(key => {
    if (result[key]) result[key] = MASK_PLACEHOLDER
  })
  
  return result
}

export function unmaskSettings(incoming: any, existing: any) {
  if (!incoming) return incoming
  const result = JSON.parse(JSON.stringify(incoming))
  
  if (result.smtp && result.smtp.password === MASK_PLACEHOLDER) {
    if (existing?.smtp?.password) result.smtp.password = existing.smtp.password
    else delete result.smtp.password
  }
  
  if (result.stripe && result.stripe.secretKey === MASK_PLACEHOLDER) {
    if (existing?.stripe?.secretKey) result.stripe.secretKey = existing.stripe.secretKey
    else delete result.stripe.secretKey
  }
  
  if (result.stripe && result.stripe.webhookSecret === MASK_PLACEHOLDER) {
    if (existing?.stripe?.webhookSecret) result.stripe.webhookSecret = existing.stripe.webhookSecret
    else delete result.stripe.webhookSecret
  }
  
  // Unmask AI Keys
  const aiKeys = [
    'openaiApiKey', 'anthropicApiKey', 'googleApiKey', 'openRouterApiKey',
    'groqApiKey', 'nvidiaApiKey', 'togetherApiKey', 'mistralApiKey',
    'cohereApiKey', 'xaiApiKey', 'aiApiKey'
  ]
  
  aiKeys.forEach(key => {
    if (result[key] === MASK_PLACEHOLDER) {
      if (existing?.[key]) result[key] = existing[key]
      else delete result[key]
    }
  })
  
  return result
}

// ── Rate Limiters (Guard Rails) ─────────────────────────────────────────────
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'development' || env.NODE_ENV === 'test',
})

// ── AI Architect Schema Validator ─────────────────────────────────────────────
// Enforces the CollectionConfig contract on AI-generated output.
// Prevents malformed AI responses from injecting unexpected fields.
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
  defaultValue: z.unknown().optional(),
})

const AICollectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  labels: z.object({ singular: z.string(), plural: z.string() }).optional(),
  drafts: z.boolean().optional(),
  timestamps: z.boolean().optional(),
  fields: z.array(AIFieldSchema).min(1).max(50),
})

// removed router


import { Router as ERouter } from 'express';
import { env } from '../../config/env';

export const systemRouter3: ERouter = ERouter();
const router = systemRouter3;


router.get('/search', searchLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const q = req.query.q as string
    if (!q) throw new InvalidPayloadError('Query required')
    const config = (req as any).zenith?.config
    const adapter = (req as any).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    const results = await SearchService.globalSearch(q.trim(), config.collections, adapter, 20, siteId)
    res.json(createResponse(results))
  } catch (err) {
    next(err)
  }
})

router.post('/ai/generate', aiLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { prompt } = req.body
    const result = await AIService.generateContent(prompt)
    res.json(createResponse({ result }))
  } catch (err) {
    next(err)
  }
})

router.post('/ai/models/fetch', aiLimiter, requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { provider, apiKey } = req.body
    if (!provider) throw new InvalidPayloadError('Provider is required')

    let finalApiKey = apiKey
    if (!finalApiKey || finalApiKey === '[MASKED_CREDENTIAL]') {
      const adapter = (req as any).zenith?.adapter
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

router.post('/ai/test', aiLimiter, requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { provider, model, apiKey } = req.body
    if (!provider || !model) throw new InvalidPayloadError('Provider and Model are required')

    let finalApiKey = apiKey
    if (!finalApiKey || finalApiKey === '[MASKED_CREDENTIAL]') {
      const adapter = (req as any).zenith?.adapter
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

router.post('/ai/tag-image', aiLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const { imageUrl } = req.body
    if (!imageUrl) throw new InvalidPayloadError('imageUrl is required')
    const result = await AIService.generateImageTags(imageUrl)
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

// ── Semantic Vector Search ───────────────────────────────────────────────────

router.get('/search/semantic', searchLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const q = req.query.q as string
    if (!q) throw new InvalidPayloadError('Query required')
    if (!VectorSearchService.isAvailable()) {
      return res.status(503).json(createErrorResponse(503, 'Semantic search requires OPENAI_API_KEY or OPENROUTER_API_KEY'))
    }
    const config = (req as any).zenith?.config
    const siteId = req.headers['x-zenith-site-id'] as string
    const collections = (config?.collections || []).map((c: any) => c.slug)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const results = await VectorSearchService.search(q.trim(), collections, limit, siteId)
    res.json(createResponse({ results, count: results.length }))
  } catch (err) {
    next(err)
  }
})

router.post('/search/index-document', requireAuth, requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { collection, documentId, field, text, siteId } = req.body
    if (!collection || !documentId || !field || !text) {
      throw new InvalidPayloadError('collection, documentId, field, and text are required')
    }
    if (!VectorSearchService.isAvailable()) {
      return res.status(503).json(createErrorResponse(503, 'Semantic search requires OPENAI_API_KEY or OPENROUTER_API_KEY'))
    }
    await VectorSearchService.indexDocument(collection, documentId, field, text, siteId)
    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

router.post(
  '/ai-architect',
  aiLimiter,
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const { prompt } = req.body
      if (!prompt) throw new InvalidPayloadError('Prompt is required for AI Architect')

      const systemPrompt = `You are the Zenith CMS AI Schema Architect. Your job is to convert natural language requirements into a valid, rich, real-world ready JSON CollectionConfig.

Return ONLY a valid JSON object matching the following structure:
{
  "name": "string (the display name of the collection, e.g., 'Blog Posts')",
  "slug": "string (lowercase plural slug, matching /^[a-z0-9-]+$/, e.g., 'blog-posts')",
  "labels": {
    "singular": "string (e.g., 'Blog Post')",
    "plural": "string (e.g., 'Blog Posts')"
  },
  "drafts": boolean (default true for content collections like posts, false for settings/users),
  "timestamps": boolean (default true),
  "fields": [
    {
      "name": "string (camelCase field identifier, e.g., 'authorName', 'featuredImage')",
      "type": "text" | "number" | "email" | "textarea" | "checkbox" | "date" | "select" | "media" | "richtext" | "relation",
      "label": "string (human readable label, e.g., 'Author Name')",
      "required": boolean,
      "unique": boolean,
      "options": [{"label": "Option Name", "value": "option_value"}] (only for 'select' type),
      "defaultValue": any (optional)
    }
  ]
}

Rules:
1. Provide rich, complete, real-world ready schemas. If a user asks for a blog post, include title, slug, content, author, publishDate, featuredImage, and category fields.
2. Reply ONLY with valid JSON. Do not include markdown formatting, backticks, or any explanation.

User Request: ${prompt}`

      const aiResponse = await AIService.generateContent(systemPrompt)

      let rawParsed: unknown
      try {
        const jsonStart = aiResponse.indexOf('{')
        const jsonEnd = aiResponse.lastIndexOf('}')
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('AI response did not contain a valid JSON object')
        }
        const jsonString = aiResponse.substring(jsonStart, jsonEnd + 1)
        rawParsed = JSON.parse(jsonString)
      } catch (e: any) {
        throw new InvalidPayloadError(`AI generated invalid JSON: ${e.message}. Please try a more specific prompt.`)
      }

      // Validate AI output against the CollectionConfig schema contract.
      // This prevents malformed or adversarial AI responses from poisoning the user's config.
      const validation = AICollectionSchema.safeParse(rawParsed)
      if (!validation.success) {
        throw new ValidationError(
          validation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          }))
        )
      }

      const schema = validation.data
      res.json(createResponse({ message: 'AI Architect generated schema successfully', schema }))
    } catch (err) {
      next(err)
    }
  }
)

