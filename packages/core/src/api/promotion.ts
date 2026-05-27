import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
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

router.get('/nodes', async (_req: Request, res: Response, next) => {
  try {
    const environments = PromotionService.getEnvironments()
    res.json(createResponse(environments))
  } catch (err) {
    next(err)
  }
})

router.post('/nodes', async (req: Request, res: Response, next) => {
  try {
    const { name, apiUrl, apiKey } = req.body
    if (!name || !apiUrl || !apiKey) {
      throw new InvalidPayloadError('Missing required fields: name, apiUrl, or apiKey')
    }
    PromotionService.registerEnvironment({ name, apiUrl, apiKey })
    res.json(createResponse({ success: true, name }))
  } catch (err) {
    next(err)
  }
})

router.get('/diff/:slug', async (req: Request, res: Response, next) => {
  try {
    const { slug } = req.params
    const targetUrl = (req.query.targetUrl as string) || 'https://production.zenithcms.internal'
    const adapter = (req as any).zenith?.adapter || (req.app.get('zenith_engine') as any).adapter
    const diff = await PromotionService.calculateDiff(adapter, slug, targetUrl)
    res.json(createResponse(diff))
  } catch (err) {
    next(err)
  }
})

router.post('/push', async (req: Request, res: Response, next) => {
  try {
    const { collectionSlug, documentId, targetUrl } = req.body
    if (!collectionSlug || !documentId || !targetUrl) {
      throw new InvalidPayloadError('Missing required body: collectionSlug, documentId, targetUrl')
    }

    const adapter = (req as any).zenith?.adapter || (req.app.get('zenith_engine') as any).adapter
    const environments = PromotionService.getEnvironments()
    const targetNode = environments.find((e) => e.apiUrl === targetUrl)
    if (!targetNode) {
      throw new InvalidPayloadError(`No registered deployment node found for URL: ${targetUrl}. Register a node with an API key first.`)
    }

    const result = await PromotionService.promoteDocument(
      adapter,
      collectionSlug,
      documentId,
      targetNode
    )
    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

export default router
