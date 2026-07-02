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

export function maskSettings(settings: Record<string, any>) {
  if (!settings) return settings
  const result = JSON.parse(JSON.stringify(settings)) // deep clone
  
  if (result.smtpPass) result.smtpPass = MASK_PLACEHOLDER
  if (result.resendKey) result.resendKey = MASK_PLACEHOLDER
  if (result.stripeSecretKey) result.stripeSecretKey = MASK_PLACEHOLDER
  if (result.stripeWebhookSecret) result.stripeWebhookSecret = MASK_PLACEHOLDER
  if (result.gcsPrivateKey) result.gcsPrivateKey = MASK_PLACEHOLDER
  if (result.azureAccountKey) result.azureAccountKey = MASK_PLACEHOLDER
  if (result.vercelBlobToken) result.vercelBlobToken = MASK_PLACEHOLDER
  if (result.paypalClientSecret) result.paypalClientSecret = MASK_PLACEHOLDER
  if (result.paypalWebhookId) result.paypalWebhookId = MASK_PLACEHOLDER
  if (result.razorpayKeySecret) result.razorpayKeySecret = MASK_PLACEHOLDER
  if (result.razorpayWebhookSecret) result.razorpayWebhookSecret = MASK_PLACEHOLDER
  
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

export function unmaskSettings(incoming: Record<string, any>, existing: Record<string, any>) {
  if (!incoming) return incoming
  const result = JSON.parse(JSON.stringify(incoming))
  
  if (result.smtpPass === MASK_PLACEHOLDER) {
    if (existing?.smtpPass) result.smtpPass = existing.smtpPass
    else delete result.smtpPass
  }
  
  if (result.resendKey === MASK_PLACEHOLDER) {
    if (existing?.resendKey) result.resendKey = existing.resendKey
    else delete result.resendKey
  }
  
  if (result.stripeSecretKey === MASK_PLACEHOLDER) {
    if (existing?.stripeSecretKey) result.stripeSecretKey = existing.stripeSecretKey
    else delete result.stripeSecretKey
  }
  
  if (result.stripeWebhookSecret === MASK_PLACEHOLDER) {
    if (existing?.stripeWebhookSecret) result.stripeWebhookSecret = existing.stripeWebhookSecret
    else delete result.stripeWebhookSecret
  }

  if (result.paypalClientSecret === MASK_PLACEHOLDER) {
    if (existing?.paypalClientSecret) result.paypalClientSecret = existing.paypalClientSecret
    else delete result.paypalClientSecret
  }
  
  if (result.paypalWebhookId === MASK_PLACEHOLDER) {
    if (existing?.paypalWebhookId) result.paypalWebhookId = existing.paypalWebhookId
    else delete result.paypalWebhookId
  }

  if (result.razorpayKeySecret === MASK_PLACEHOLDER) {
    if (existing?.razorpayKeySecret) result.razorpayKeySecret = existing.razorpayKeySecret
    else delete result.razorpayKeySecret
  }

  if (result.razorpayWebhookSecret === MASK_PLACEHOLDER) {
    if (existing?.razorpayWebhookSecret) result.razorpayWebhookSecret = existing.razorpayWebhookSecret
    else delete result.razorpayWebhookSecret
  }

  if (result.gcsPrivateKey === MASK_PLACEHOLDER) {
    if (existing?.gcsPrivateKey) result.gcsPrivateKey = existing.gcsPrivateKey
    else delete result.gcsPrivateKey
  }

  if (result.azureAccountKey === MASK_PLACEHOLDER) {
    if (existing?.azureAccountKey) result.azureAccountKey = existing.azureAccountKey
    else delete result.azureAccountKey
  }

  if (result.vercelBlobToken === MASK_PLACEHOLDER) {
    if (existing?.vercelBlobToken) result.vercelBlobToken = existing.vercelBlobToken
    else delete result.vercelBlobToken
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



// removed router


import { Router as ERouter } from 'express';
import { env } from '../../config/env';

export const systemRouter3: ERouter = ERouter();
const router = systemRouter3;


router.get('/search', searchLimiter, requireAuth, async (req: Request, res: Response, next) => {
  try {
    const q = req.query.q as string
    if (!q) throw new InvalidPayloadError('Query required')
    const config = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.config
    const adapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    const results = await SearchService.globalSearch(q.trim(), config.collections, adapter, 20, siteId)
    res.json(createResponse(results))
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
    const config = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.config
    const siteId = req.headers['x-zenith-site-id'] as string
    const collections = (config?.collections || []).map((c: Record<string, any>) => c.slug)
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


