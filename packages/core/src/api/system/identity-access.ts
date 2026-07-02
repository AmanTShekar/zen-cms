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
  
  if (result.smtp?.password) result.smtp.password = MASK_PLACEHOLDER
  if (result.stripe?.secretKey) result.stripe.secretKey = MASK_PLACEHOLDER
  if (result.stripe?.webhookSecret) result.stripe.webhookSecret = MASK_PLACEHOLDER
  if (result.ai?.openaiKey) result.ai.openaiKey = MASK_PLACEHOLDER
  if (result.ai?.anthropicKey) result.ai.anthropicKey = MASK_PLACEHOLDER
  
  return result
}

export function unmaskSettings(incoming: Record<string, any>, existing: Record<string, any>) {
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
  
  if (result.ai && result.ai.openaiKey === MASK_PLACEHOLDER) {
    if (existing?.ai?.openaiKey) result.ai.openaiKey = existing.ai.openaiKey
    else delete result.ai.openaiKey
  }
  
  if (result.ai && result.ai.anthropicKey === MASK_PLACEHOLDER) {
    if (existing?.ai?.anthropicKey) result.ai.anthropicKey = existing.ai.anthropicKey
    else delete result.ai.anthropicKey
  }
  
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

// removed router


import { Router as ERouter } from 'express';
import { env } from '../../config/env';

export const systemRouter2: ERouter = ERouter();
const router = systemRouter2;


router.get(
  '/api-keys',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const siteId = req.headers['x-zenith-site-id'] as string
      if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
      const keys = await adapter.find<Record<string, any>>('z_api_keys', { revoked: false, siteId }, { select: ['-key'] })
      res.json(createResponse(keys))
    } catch (err) {
      next(err)
    }
  }
)

const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
})

router.post(
  '/api-keys',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const parsed = apiKeySchema.safeParse(req.body)
      if (!parsed.success) throw new InvalidPayloadError('Invalid input: ' + parsed.error.errors.map(e => e.message).join(', '))
      const { name, role, expiresInDays } = parsed.data
      const siteId = req.headers['x-zenith-site-id'] as string
      if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
      // Ensure ApiKeyService.generateKey supports siteId or update the created record
      const result = await ApiKeyService.generateKey(name, role, expiresInDays, siteId)
      res.status(201).json(createResponse(result))
    } catch (err) {
      next(err)
    }
  }
)

router.post(
  '/api-keys/:id/revoke',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response, next) => {
    try {
      const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const siteId = req.headers['x-zenith-site-id'] as string
      if (!siteId) throw new InvalidPayloadError('x-zenith-site-id header is required')
      const keyDoc = await adapter.findOne<Record<string, any>>('z_api_keys', { _id: req.params.id, siteId })
      if (!keyDoc) throw new NotFoundError('API Key')
      await adapter.update('z_api_keys', req.params.id, { revoked: true, revokedAt: new Date(), siteId })
      res.json(createResponse({ success: true }))
    } catch (err) {
      next(err)
    }
  }
)

