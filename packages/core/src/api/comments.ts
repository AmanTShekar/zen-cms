import { Router, Request, Response } from 'express'
import { requireAuth } from '../middleware/auth'
import { createResponse } from './utils'
import { Comment } from '../database/comment-model'
import { ForbiddenError, NotFoundError, InvalidPayloadError } from '../errors'

const router: Router = Router()
router.use(requireAuth)

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
    const user = (req as any).user
    const { collection, documentId, resolved, blockId } = req.query
    const siteId = req.headers['x-zenith-site-id'] as string | undefined

    const filter: any = {}
    if (collection) filter.collection = collection as string
    if (documentId) filter.documentId = documentId as string
    if (blockId) filter.blockId = blockId as string
    if (siteId) filter.siteId = siteId

    if (resolved !== undefined) {
      filter.resolved = resolved === 'true'
    }

    const comments = await Comment.find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec()

    res.json(createResponse(comments))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/comments ───────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const { collection, documentId, blockId, fieldKey, content } = req.body

    if (!collection || !documentId || !content) {
      throw new InvalidPayloadError('collection, documentId and content are required')
    }

    const comment = new Comment({
      collection,
      documentId,
      blockId,
      fieldKey,
      content,
      author: user.name || user.email || 'Anonymous',
      authorEmail: user.email,
      authorId: user.id || user._id,
      siteId,
    })

    await comment.save()
    res.status(201).json(createResponse(comment.toObject()))
  } catch (err) {
    next(err)
  }
})

// ── POST /api/v1/comments/:id/reply ─────────────────────────────────────────
router.post('/:id/reply', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const { content } = req.body

    if (!content?.trim()) {
      throw new InvalidPayloadError('Reply content is required')
    }

    const comment = await Comment.findById(req.params.id)
    if (!comment) throw new NotFoundError('Comment', req.params.id)

    comment.replies.push({
      author: user.name || user.email || 'Anonymous',
      authorEmail: user.email,
      authorId: user.id || user._id,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await comment.save()
    res.json(createResponse(comment.toObject()))
  } catch (err) {
    next(err)
  }
})

// ── PATCH /api/v1/comments/:id ─────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const { content, resolved, resolvedBy } = req.body

    const comment = await Comment.findById(req.params.id)
    if (!comment) throw new NotFoundError('Comment', req.params.id)

    // Only author can edit content
    if (content !== undefined) {
      if (comment.authorId !== user.id && comment.authorId !== user._id && user.role !== 'admin') {
        throw new ForbiddenError('Only the comment author can edit the content')
      }
      comment.content = content
    }

    // Authors and admins can resolve/reopen
    if (resolved !== undefined && comment.resolved !== resolved) {
      comment.resolved = resolved
      if (resolved) {
        comment.resolvedBy = user.email
        comment.resolvedAt = new Date()
      } else {
        comment.resolvedBy = undefined
        comment.resolvedAt = undefined
      }
    }

    await comment.save()
    res.json(createResponse(comment.toObject()))
  } catch (err) {
    next(err)
  }
})

// ── DELETE /api/v1/comments/:id ───────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const user = (req as any).user
    const comment = await Comment.findById(req.params.id)
    if (!comment) throw new NotFoundError('Comment', req.params.id)

    if (comment.authorId !== user.id && comment.authorId !== user._id && user.role !== 'admin') {
      throw new ForbiddenError('Only the comment author or an admin can delete a comment')
    }

    await Comment.findByIdAndDelete(req.params.id)
    res.json(createResponse({ success: true }))
  } catch (err) {
    next(err)
  }
})

export default router