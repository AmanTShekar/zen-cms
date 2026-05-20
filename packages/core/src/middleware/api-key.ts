import { Request, Response, NextFunction } from 'express'
import { ApiKeyService } from '../services/api-key'
import { createErrorResponse } from '../api/utils'

export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey || req.path.endsWith('/system/health') || req.path.endsWith('/health')) {
    return next() // Continue to check JWT if needed, or bypass for public health endpoints
  }

  try {
    const keyData = await ApiKeyService.validateKey(apiKey)
    if (!keyData) {
      return res.status(401).json(createErrorResponse(401, 'Invalid API Key'))
    }

    // ── Collection scope enforcement ──────────────────────────────────────────
    if (keyData.allowedCollections && keyData.allowedCollections.length > 0) {
      // Extract collection slug from URL: /api/v1/<slug>/...
      const urlParts = req.path.split('/').filter(Boolean)
      const collectionSlug = urlParts[0] // after /api/v1 is stripped by Express

      if (collectionSlug && !keyData.allowedCollections.includes(collectionSlug)) {
        return res
          .status(403)
          .json(
            createErrorResponse(
              403,
              `API key is not authorized to access collection: '${collectionSlug}'`
            )
          )
      }
    }

    // Inject into request object
    ;(req as any).user = keyData
    next()
  } catch (error) {
    next(error)
  }
}
