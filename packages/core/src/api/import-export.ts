import { Router, Request, Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse } from './utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { ContentService } from '../services/content'
import { InvalidPayloadError } from '../errors'
import { logger } from '../services/logger'
import { parseCsv, stringifyCsv } from '../utils/csv'

const router: Router = Router()
router.use(requireAuth)

/**
 * Content Import/Export API
 * ─────────────────────────
 * Export: GET  /api/v1/import-export/:collection?format=json|csv
 * Import: POST /api/v1/import-export/:collection?format=json|csv
 */

// ── GET /api/v1/import-export/:collection — Export collection data ───────────
router.get('/:collection', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { collection } = req.params
    const format = (req.query.format as string) || 'json'
    const siteId = req.headers['x-zenith-site-id'] as string

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const engine = req.app.get('zenith_engine')
    const colConfig = engine?.config?.collections?.find((c: any) => c.slug === collection)

    if (!colConfig) throw new InvalidPayloadError(`Collection "${collection}" not found`)

    const filter: Record<string, unknown> = {}
    if (siteId) filter.siteId = siteId

    const docs = await adapter.find(collection, filter, { limit: 10000, sort: { createdAt: -1 } })

    // Strip internal fields for export
    const exportDocs = docs.map((doc: any) => {
      const { _id, id, __v, password, verificationToken, verificationTokenExpiry, oauthProviders, ...rest } = doc as any
      return rest
    })

    if (format === 'csv') {
      const csv = stringifyCsv(exportDocs as unknown as Record<string, unknown>[])
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${collection}-export.csv"`)
      return res.send(csv)
    }

    // Default JSON
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${collection}-export.json"`)
    res.json(exportDocs)
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/import-export/:collection — Import data into collection ─────
router.post('/:collection', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { collection } = req.params
    const format = (req.query.format as string) || 'json'
    const { data } = req.body
    const siteId = req.headers['x-zenith-site-id'] as string

    if (!data) throw new InvalidPayloadError('Request body must contain a "data" field')

    const adapter: DatabaseAdapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const engine = req.app.get('zenith_engine')
    const colConfig = engine?.config?.collections?.find((c: any) => c.slug === collection)

    if (!colConfig) throw new InvalidPayloadError(`Collection "${collection}" not found`)

    let records: any[]

    if (format === 'csv') {
      if (typeof data !== 'string') throw new InvalidPayloadError('CSV import requires a string "data" field')
      records = parseCsv(data)
    } else {
      if (!Array.isArray(data)) throw new InvalidPayloadError('JSON import requires an array "data" field')
      records = data
    }

    if (records.length === 0) {
      return res.json(createResponse({ imported: 0, errors: [], message: 'No records to import' }))
    }

    const contentService = new ContentService(colConfig, adapter)
    const errors: { row: number; error: string }[] = []
    let imported = 0

    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i]
        // Remove internal fields that shouldn't be imported
        const { _id, id, __v, createdAt, updatedAt, ...cleanRecord } = record

        // Add siteId if multi-tenant
        if (siteId) cleanRecord.siteId = siteId

        await contentService.create(cleanRecord, {
          user: (req as any).user,
          siteId,
          skipVersioning: true,
        })
        imported++
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message || 'Unknown error' })
      }
    }

    logger.info({ collection, imported, errors: errors.length }, 'Content import completed')

    res.json(createResponse({
      imported,
      total: records.length,
      errors,
      message: `Imported ${imported} of ${records.length} records${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
    }))
  } catch (err) {
    next(err)
  }
})

export default router