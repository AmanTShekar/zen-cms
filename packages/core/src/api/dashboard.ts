/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'
import { ValidationError, ConflictError } from '../errors'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { env } from '../config/env';


const router: Router = Router()
router.use(requireAuth)

// ── Registered widget types (server-side allowlist) ──────────────────────────
export const KNOWN_WIDGET_TYPES = new Set([
  'stat-card',
  'audit-log',
  'quick-actions',
  'collection-table',
  'media-grid',
  'system-health',
  'api-status',
  'recent-content',
  'custom-html',
  'chart',
  'calendar',
  'team-presence',
])

// ── Default layouts per role ──────────────────────────────────────────────────
const DEFAULT_LAYOUTS: Record<string, Record<string, any>[]> = {
  admin: [
    {
      id: 'w1',
      type: 'stat-card',
      title: 'Content Assets',
      config: { metric: 'total_records' },
      position: { x: 0, y: 8, w: 3, h: 2 },
    },
    {
      id: 'w2',
      type: 'stat-card',
      title: 'Team Members',
      config: { metric: 'members' },
      position: { x: 3, y: 8, w: 3, h: 2 },
    },
    {
      id: 'w3',
      type: 'stat-card',
      title: 'System Uptime',
      config: { metric: 'uptime' },
      position: { x: 6, y: 6, w: 3, h: 2 },
    },
    {
      id: 'w4',
      type: 'system-health',
      title: 'Infrastructure',
      config: {},
      position: { x: 9, y: 6, w: 3, h: 2 },
    },
    {
      id: 'de0cfd78-5c71-45b2-85d7-639f6f723f5f',
      type: 'team-presence',
      title: 'Team Presence',
      config: {},
      position: { x: 0, y: 6, w: 4, h: 2 },
    },
    {
      id: 'w5',
      type: 'quick-actions',
      title: 'Quick Start',
      config: {},
      position: { x: 0, y: 999, w: 12, h: 2 },
    },
    {
      id: 'w7',
      type: 'api-status',
      title: 'API Health',
      config: {},
      position: { x: 8, y: 2, w: 4, h: 4 },
    },
    {
      id: 'w6',
      type: 'audit-log',
      title: 'Audit Log',
      config: { limit: 5 },
      position: { x: 0, y: 2, w: 8, h: 4 },
    },
  ],
  editor: [
    {
      id: 'w1',
      type: 'stat-card',
      title: 'Content Assets',
      config: { metric: 'total_records' },
      position: { x: 0, y: 0, w: 4, h: 2 },
    },
    {
      id: 'w2',
      type: 'quick-actions',
      title: 'Quick Start',
      config: {},
      position: { x: 4, y: 0, w: 8, h: 2 },
    },
    {
      id: 'w3',
      type: 'recent-content',
      title: 'Recent Content',
      config: {},
      position: { x: 0, y: 2, w: 12, h: 4 },
    },
  ],
  viewer: [
    {
      id: 'w1',
      type: 'stat-card',
      title: 'Content Assets',
      config: { metric: 'total_records' },
      position: { x: 0, y: 0, w: 6, h: 2 },
    },
    {
      id: 'w2',
      type: 'recent-content',
      title: 'Recent Content',
      config: {},
      position: { x: 6, y: 0, w: 6, h: 2 },
    },
  ],
}

// ── Zod Validation ────────────────────────────────────────────────────────────
const WidgetSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().optional(),
  config: z.record(z.any()).default({}),
  position: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1).max(12),
    h: z.number().int().min(1).max(200),
  }),
})

const SaveLayoutSchema = z.object({
  widgets: z.array(WidgetSchema).max(50, 'Maximum 50 widgets per dashboard'),
  columns: z.number().int().min(1).max(12).default(12),
  updatedAt: z.string().optional(), // for optimistic locking
})

// ── GET /api/v1/dashboard/layout ─────────────────────────────────────────────
router.get('/layout', async (req: Request, res: Response, next) => {
  try {
    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = req.headers['x-zenith-site-id'] as string

    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    const layout = await adapter.findOne<Record<string, any>>('z_dashboard_layouts', { userId: user.id, siteId: siteId || null })

    if (!layout) {
      // Return role-appropriate default, don't persist yet
      const defaults = DEFAULT_LAYOUTS[user.role] || DEFAULT_LAYOUTS.viewer
      return res.json(createResponse({ widgets: defaults, columns: 12, isDefault: true }))
    }

    // Mark orphaned widgets (type no longer registered)
    const sanitized = layout.widgets.map((w: Record<string, any>) => ({
      ...w,
      isOrphaned: !KNOWN_WIDGET_TYPES.has(w.type),
    }))

    res.json(
      createResponse({
        widgets: sanitized,
        columns: layout.columns,
        isDefault: false,
        updatedAt: layout.updatedAt,
      })
    )
  } catch (err) {
    next(err)
  }
})

// ── PUT /api/v1/dashboard/layout ─────────────────────────────────────────────
router.put('/layout', async (req: Request, res: Response, next) => {
  try {
    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = req.headers['x-zenith-site-id'] as string

    const parsed = SaveLayoutSchema.safeParse(req.body)
    if (!parsed.success) {
      console.error(
        '[Dashboard] Layout validation failed:',
        JSON.stringify(parsed.error.issues, null, 2)
      )
      const debugPath = env.NODE_ENV === 'production'
        ? path.join(os.tmpdir(), 'zenith-failed-layout-payload.json')
        : path.join(process.cwd(), 'failed-layout-payload.json')
      await fs.promises.writeFile(
        debugPath,
        JSON.stringify({ body: req.body, issues: parsed.error.issues }, null, 2)
      )
      throw new ValidationError(
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }))
      )
    }

    const { widgets, columns, updatedAt: clientUpdatedAt } = parsed.data

    // Optimistic locking — reject if client is saving stale data
    if (clientUpdatedAt) {
      const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
      const existing = await adapter.findOne<Record<string, any>>('z_dashboard_layouts', { userId: user.id, siteId: siteId || null })
      if (existing && new Date(clientUpdatedAt) < new Date(existing.updated_at)) {
        throw new ConflictError('Layout was modified in another tab. Refresh to get the latest version.')
      }
    }

    // Clamp widgets that overflow the grid, collect warnings
    const warnings: string[] = []
    const clamped = widgets.map((w: Record<string, any>) => {
      if (w.position.x + w.position.w > columns) {
        warnings.push(`Widget "${w.title || w.type}" was clamped to fit the grid.`)
        return { ...w, position: { ...w.position, w: Math.max(1, columns - w.position.x) } }
      }
      return w
    })

    // Strip admin-only widgets from non-admin users
    const ADMIN_ONLY_WIDGETS = new Set(['custom-html', 'system-health'])
    const filteredWidgets =
      user.role === 'admin' ? clamped : clamped.filter((w: Record<string, any>) => !ADMIN_ONLY_WIDGETS.has(w.type))

    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    let layout = await adapter.findOne<Record<string, any>>('z_dashboard_layouts', { userId: user.id, siteId: siteId || null })
    
    if (layout) {
      layout = await adapter.update('z_dashboard_layouts', (layout.id || layout._id).toString(), {
        widgets: filteredWidgets,
        columns,
        siteId: siteId || null,
        updated_at: new Date()
      }, { siteId: siteId || null })
    } else {
      layout = await adapter.create('z_dashboard_layouts', {
        userId: user.id,
        siteId: siteId || null,
        widgets: filteredWidgets,
        columns,
        updated_at: new Date()
      })
    }

    res.json(
      createResponse({
        widgets: layout!.widgets,
        columns: layout!.columns,
        updatedAt: layout!.updated_at || layout!.updatedAt,
        warnings,
      })
    )
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/dashboard/layout/reset ──────────────────────────────────────
router.post('/layout/reset', async (req: Request, res: Response, next) => {
  try {
    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = req.headers['x-zenith-site-id'] as string
    const adapter: DatabaseAdapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
    await adapter.deleteMany('z_dashboard_layouts', { userId: user.id, siteId: siteId || null })
    const defaults = DEFAULT_LAYOUTS[user.role] || DEFAULT_LAYOUTS.viewer
    res.json(createResponse({ widgets: defaults, columns: 12, isDefault: true }))
  } catch (err) {
    next(err)
  }
})

// ── GET /api/v1/dashboard/widgets ────────────────────────────────────────────
router.get('/widgets', (req: Request, res: Response) => {
  const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
  const ADMIN_ONLY_WIDGETS = new Set(['custom-html', 'system-health'])

  const widgets = [
    {
      type: 'stat-card',
      label: 'Stat Card',
      description: 'Shows a single metric count.',
      category: 'data',
      defaultSize: { w: 3, h: 2 },
      adminOnly: false,
    },
    {
      type: 'audit-log',
      label: 'Audit Log',
      description: 'Recent activity feed.',
      category: 'data',
      defaultSize: { w: 8, h: 4 },
      adminOnly: false,
    },
    {
      type: 'quick-actions',
      label: 'Quick Actions',
      description: 'Shortcuts to common tasks.',
      category: 'content',
      defaultSize: { w: 12, h: 2 },
      adminOnly: false,
    },
    {
      type: 'collection-table',
      label: 'Collection Table',
      description: 'Browse any collection inline.',
      category: 'data',
      defaultSize: { w: 8, h: 4 },
      adminOnly: false,
    },
    {
      type: 'media-grid',
      label: 'Media Grid',
      description: 'Recent media uploads.',
      category: 'content',
      defaultSize: { w: 6, h: 4 },
      adminOnly: false,
    },
    {
      type: 'system-health',
      label: 'System Health',
      description: 'CPU, memory, DB status.',
      category: 'system',
      defaultSize: { w: 4, h: 3 },
      adminOnly: true,
    },
    {
      type: 'api-status',
      label: 'API Status',
      description: 'API health and latency.',
      category: 'system',
      defaultSize: { w: 4, h: 3 },
      adminOnly: false,
    },
    {
      type: 'recent-content',
      label: 'Recent Content',
      description: 'Latest edited documents.',
      category: 'content',
      defaultSize: { w: 6, h: 3 },
      adminOnly: false,
    },
    {
      type: 'custom-html',
      label: 'Custom HTML',
      description: 'Embed any HTML (sanitized).',
      category: 'custom',
      defaultSize: { w: 6, h: 3 },
      adminOnly: true,
    },
    {
      type: 'chart',
      label: 'Chart',
      description: 'Visualize collection data.',
      category: 'data',
      defaultSize: { w: 6, h: 4 },
      adminOnly: false,
    },
    {
      type: 'calendar',
      label: 'Calendar',
      description: 'Scheduled & dated content.',
      category: 'content',
      defaultSize: { w: 6, h: 4 },
      adminOnly: false,
    },
    {
      type: 'team-presence',
      label: 'Team Presence',
      description: 'Who is online right now.',
      category: 'team',
      defaultSize: { w: 4, h: 2 },
      adminOnly: false,
    },
  ].filter((w) => user.role === 'admin' || !ADMIN_ONLY_WIDGETS.has(w.type))

  res.json(createResponse(widgets))
})

export default router
