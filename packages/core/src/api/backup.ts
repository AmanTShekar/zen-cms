import { Router, Request, Response } from 'express'
import path from 'path'
import { requireAuth, requireRole } from '../middleware/auth'
import { createResponse, createErrorResponse } from './utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { BackupService, BackupManifest } from '../services/backup'
import { logger } from '../services/logger'

const router: Router = Router()
router.use(requireAuth)

const BACKUP_DIR = path.join(process.cwd(), 'backups')

// ── GET /api/v1/system/backup — List backups ────────────────────────────────
router.get('/', requireRole('admin'), async (_req: Request, res: Response, next) => {
  try {
    const backups = await BackupService.list(BACKUP_DIR)
    const data = backups.map((b) => ({
      name: b.name,
      size: b.size,
      createdAt: b.createdAt.toISOString(),
    }))
    res.json(createResponse(data))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/system/backup/export — Create a full backup ─────────────────
router.post('/export', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const engine = req.app.get('zenith_engine')
    const collections = engine?.config?.collections?.map((c: any) => c.slug) || []
    const includeSystem = req.query.includeSystem === 'true'

    const result = await BackupService.export(collections, BACKUP_DIR, includeSystem)

    res.json(createResponse<BackupManifest>(result.manifest))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/system/backup/import — Restore from a backup file ───────────
router.post('/import', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const { filename } = req.body || {}
    if (!filename || typeof filename !== 'string') {
      return res
        .status(400)
        .json(createErrorResponse(400, 'filename is required in request body'))
    }

    // Prevent directory traversal attacks
    const safeName = path.basename(filename)
    const filePath = path.join(BACKUP_DIR, safeName)

    const adapter = (req as any).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const result = await BackupService.import(filePath, adapter)

    res.json(createResponse(result))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/system/backup/download/:filename — Download a backup file ────
router.get('/download/:filename', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const safeName = path.basename(req.params.filename)
    const filePath = path.join(BACKUP_DIR, safeName)
    res.download(filePath, safeName, (err) => {
      if (err) {
        logger.warn({ file: safeName }, '[Backup] Download failed — file not found')
        if (!res.headersSent) {
          res.status(404).json(createErrorResponse(404, 'Backup file not found'))
        }
      }
    })
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/system/backup/:filename — Delete a backup file ────────────
router.delete('/:filename', requireRole('admin'), async (req: Request, res: Response, next) => {
  try {
    const safeName = path.basename(req.params.filename)
    const filePath = path.join(BACKUP_DIR, safeName)

    const fs = await import('fs/promises')
    await fs.unlink(filePath)
    logger.info(`[Backup] Deleted backup: ${safeName}`)

    res.json(createResponse({ deleted: safeName }))
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return res.status(404).json(createErrorResponse(404, 'Backup file not found'))
    }
    next(err)
  }
})

export default router
