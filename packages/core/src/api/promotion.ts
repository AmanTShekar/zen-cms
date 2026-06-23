import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { PromotionService } from '../services/PromotionService'
import { InvalidPayloadError } from '../errors'

const router: Router = Router()
router.use(requireAuth)

/**
 * Staging Environments & Promotion API
 * ──────────────────────────────────────
 * GET    /api/v1/promotion/nodes       — List all registered deployment environments
 * POST   /api/v1/promotion/nodes       — Register a new environment target node
 * GET    /api/v1/promotion/diff/:slug  — Calculate document differences vs remote node
 * POST   /api/v1/promotion/push        — Pushes a staging document to a target environment
 */

router.get('/nodes', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const siteId = req.headers['x-zenith-site-id'] as string
    const environments = PromotionService.getEnvironments(siteId)
    res.json(createResponse(environments))
  } catch (err) {
    next(err)
  }
})

router.post('/nodes', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { name, apiUrl, apiKey } = req.body
    if (!name || !apiUrl || !apiKey) {
      throw new InvalidPayloadError('Missing required fields: name, apiUrl, or apiKey')
    }
    const siteId = req.headers['x-zenith-site-id'] as string
    PromotionService.registerEnvironment({ name, apiUrl, apiKey, siteId })
    res.json(createResponse({ success: true, name }))
  } catch (err) {
    next(err)
  }
})

router.get('/diff/:slug', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { slug } = req.params
    const targetUrl = (req.query.targetUrl as string) || 'https://production.zenithcms.internal'
    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || (req.app.get('zenith_engine') as Record<string, unknown>).adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    const diff = await PromotionService.calculateDiff(adapter, slug, targetUrl, siteId)
    res.json(createResponse(diff))
  } catch (err) {
    next(err)
  }
})

router.post('/push', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { collectionSlug, documentId, targetUrl } = req.body
    if (!collectionSlug || !documentId || !targetUrl) {
      throw new InvalidPayloadError('Missing required body: collectionSlug, documentId, targetUrl')
    }

    const adapter = (req as import('express').Request & { user?: Record<string, unknown>, zenith?: Record<string, unknown> }).zenith?.adapter || (req.app.get('zenith_engine') as Record<string, unknown>).adapter
    const siteId = req.headers['x-zenith-site-id'] as string
    const environments = PromotionService.getEnvironments(siteId)
    const targetNode = environments.find((e) => e.apiUrl === targetUrl)
    if (!targetNode) {
      throw new InvalidPayloadError(`No registered deployment node found for URL: ${targetUrl}. Register a node with an API key first.`)
    }

    const result = await PromotionService.promoteDocument(
      adapter,
      collectionSlug,
      documentId,
      targetNode,
      siteId
    )
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

export default router
