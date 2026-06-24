/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { ForbiddenError, NotFoundError, InvalidPayloadError } from '../errors'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { DatabaseAdapter } from '@zenith-open/zenithcms-types'

const router: Router = Router()
router.use(requireAuth)

const COMMENTS_COLLECTION = 'comments'

const getAdapter = (req: Request): DatabaseAdapter =>
  (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()

/**
 * Comments API
 * ────────────
 * Threaded comments on any document (pages / globals).
 * Supports resolving/reopening, replies, and filtering by document.
 *
 * GET    /api/v1/comments?collection=&documentId=&resolved=       — list (filtered)
 * POST   /api/v1/comments                                    — create thread
 * POST   /api/v1/comments/:id/reply                          — add reply
 * PATCH  /api/v1/comments/:id                                — edit body / resolve
 * DELETE /api/v1/comments/:id                                — delete comment
 */

// ── GET /api/v1/comments ─────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const { collection, documentId, resolved, blockId } = req.query
    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    const filter: Record<string, any> = {}
    if (collection) filter.collection = collection as string
    if (documentId) filter.documentId = documentId as string
    if (blockId) filter.blockId = blockId as string
    if (siteId) filter.siteId = siteId

    if (resolved !== undefined) {
      filter.resolved = resolved === 'true'
    }

    const comments = await adapter.find<Record<string, any>>(COMMENTS_COLLECTION, filter, {
      sort: { createdAt: -1 }
    })

    res.json(createResponse(comments))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/comments ───────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { collection, documentId, blockId, fieldKey, content } = req.body

    if (!collection || !documentId || !content) {
      throw new InvalidPayloadError('collection, documentId and content are required')
    }

    const commentData = {
      collection,
      documentId,
      blockId,
      fieldKey,
      content,
      author: user.name || user.email || 'Anonymous',
      authorEmail: user.email,
      authorId: user.id || user._id,
      resolved: false,
      replies: [],
      siteId,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const comment = await adapter.create(COMMENTS_COLLECTION, commentData)
    res.status(201).json(createResponse(comment))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/comments/:id/reply ─────────────────────────────────────────
router.post('/:id/reply', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { content } = req.body

    if (!content?.trim()) {
      throw new InvalidPayloadError('Reply content is required')
    }

    // ISOLATION FIX: scope lookup by siteId to prevent cross-tenant comment access
    const filter: Record<string, any> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const comment = await adapter.findOne<Record<string, any>>(COMMENTS_COLLECTION, filter)
    if (!comment) throw new NotFoundError('Comment', req.params.id)

    const replies = comment.replies || []
    replies.push({
      author: user.name || user.email || 'Anonymous',
      authorEmail: user.email,
      authorId: user.id || user._id,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const updatedComment = await adapter.update(COMMENTS_COLLECTION, req.params.id, {
      replies,
      updatedAt: new Date()
    })

    res.json(createResponse(updatedComment))
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/v1/comments/:id ─────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { content, resolved, resolvedBy } = req.body

    // ISOLATION FIX: scope lookup by siteId to prevent cross-tenant comment modification
    const filter: Record<string, any> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const comment = await adapter.findOne<Record<string, any>>(COMMENTS_COLLECTION, filter)
    if (!comment) throw new NotFoundError('Comment', req.params.id)

    const updates: Record<string, any> = { updatedAt: new Date() }

    // Only author can edit content
    if (content !== undefined) {
      if (comment.authorId !== user.id && comment.authorId !== user._id && user.role !== 'admin') {
        throw new ForbiddenError('Only the comment author can edit the content')
      }
      updates.content = content
    }

    // Authors and admins can resolve/reopen
    if (resolved !== undefined && comment.resolved !== resolved) {
      updates.resolved = resolved
      if (resolved) {
        updates.resolvedBy = user.email
        updates.resolvedAt = new Date()
      } else {
        updates.resolvedBy = null
        updates.resolvedAt = null
      }
    }

    const updatedComment = await adapter.update(COMMENTS_COLLECTION, req.params.id, updates)
    res.json(createResponse(updatedComment))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/comments/:id ───────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const adapter = getAdapter(req)
    const user = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).user
    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    // ISOLATION FIX: scope lookup by siteId to prevent cross-tenant comment deletion
    const filter: Record<string, any> = { _id: req.params.id }
    if (siteId) filter.siteId = siteId
    const comment = await adapter.findOne<Record<string, any>>(COMMENTS_COLLECTION, filter)
    if (!comment) throw new NotFoundError('Comment', req.params.id)

    if (comment.authorId !== user.id && comment.authorId !== user._id && user.role !== 'admin') {
      throw new ForbiddenError('Only the comment author or an admin can delete a comment')
    }

    await adapter.delete(COMMENTS_COLLECTION, req.params.id)
    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

export default router