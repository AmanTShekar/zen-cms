import { Router, Request, Response, NextFunction } from 'express'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { StrapiContentMigrator, MigrationProgressEvent, createRawClient, discoverStrapiSchemas } from '../plugins/strapi-bridge/ContentMigrator'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { ForbiddenError, ValidationError } from '../errors'

const router: Router = Router()

/**
 * POST /api/v1/system/migrate/strapi
 * Starts a Strapi → Zenith content migration job.
 * Streams Server-Sent Events (SSE) with live progress while migration runs.
 * Admin-only.
 */
router.post('/strapi', requireAuth, async (req: any, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenError('Only administrators can run migrations.')
    }

    const {
      strapiDb,
      strapiType = 'postgres',
      strapiUrl = 'http://localhost:1337',
      collections,
      batchSize = 100,
      dryRun = false,
      preserveUrls = true,
    } = req.body

    if (!strapiDb) {
      throw new ValidationError([{ field: 'strapiDb', message: 'Strapi database URI is required' }])
    }

    const adapter = AdapterFactory.getActiveAdapter()

    // Use SSE so the UI gets live progress
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    const migrator = new StrapiContentMigrator({
      strapiDbUri: strapiDb,
      strapiDbType: strapiType as any,
      strapiBaseUrl: strapiUrl,
      zenithAdapter: adapter,
      collections: typeof collections === 'string'
        ? collections.split(',').map((s: string) => s.trim())
        : Array.isArray(collections) ? collections : undefined,
      batchSize: Number(batchSize),
      dryRun: Boolean(dryRun),
      preserveUrls: Boolean(preserveUrls),
      onProgress: (event: MigrationProgressEvent) => {
        send(event)
      },
    })

    try {
      const summary = await migrator.run()
      send({ type: 'done', summary })
    } catch (err: any) {
      send({ type: 'fatal_error', message: err.message })
    }

    res.end()
  } catch (err) {
    next(err)
  }
})

/**
 * POST /api/v1/system/migrate/strapi/discover
 * Connects to a Strapi DB and returns discovered collection slugs without migrating.
 */
router.post('/strapi/discover', requireAuth, async (req: any, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenError('Only administrators can run migrations.')
    }

    const { strapiDb, strapiType = 'postgres' } = req.body
    if (!strapiDb) {
      throw new ValidationError([{ field: 'strapiDb', message: 'Strapi database URI is required' }])
    }

    let collections: string[] = []
    try {
      const client = await createRawClient(strapiDb, strapiType as any)
      try {
        const schemas = await discoverStrapiSchemas(client)
        collections = schemas.map(s => s.slug)
      } finally {
        await client.end()
      }
    } catch (err: any) {
      return res.status(400).json(createResponse(null, {
        error: `Could not connect to Strapi database: ${err.message}`,
      } as any))
    }

    res.json(createResponse({ collections }))
  } catch (err) {
    next(err)
  }
})

export default router
