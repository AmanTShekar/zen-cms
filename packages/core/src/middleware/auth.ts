import { Request, Response, NextFunction } from 'express'
import { isValidObjectId } from 'mongoose'
import { AuthService, AuthUser } from '../services/auth'
import { createErrorResponse } from '../api/utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { sessionStore } from '../services/session-store'
import NodeCache from 'node-cache'

const siteAccessCache = new NodeCache({ stdTTL: 300, checkperiod: 60 })

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
      siteId?: string
    }
  }
}

export async function verifySiteAccess(user: AuthUser, siteId: string): Promise<boolean> {
  const cacheKey = `${user.id}:${siteId}`
  const hasAccess = siteAccessCache.get<boolean>(cacheKey)

  if (hasAccess === undefined) {
    const adapter = AdapterFactory.getActiveAdapter()
    const sites = await adapter.find<any>('sites', { id: siteId })
    const site = sites[0] || null

    if (!site) return false

    const isOwner = site.ownerId === user.id
    const isMember = Array.isArray(site.members) && site.members.some((m: any) => m.userId === user.id)

    const accessGranted = isOwner || isMember
    siteAccessCache.set(cacheKey, accessGranted)

    return accessGranted
  }

  return hasAccess
}

/**
 * Verifies Bearer token and attaches `req.user`.
 * Checks token revocation, then validates tenant isolation.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.accessToken

    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
      }
    }

    if (!token) {
      return res.status(401).json(createErrorResponse(401, 'Authentication required', undefined, 'AuthenticationError'))
    }

    const decoded = AuthService.verifyToken(token) as any

    if (!decoded) {
      return res.status(401).json(createErrorResponse(401, 'Invalid or expired token', undefined, 'AuthenticationError'))
    }

    // ── Token Revocation Check ──
    if (decoded.jti) {
      const revoked = await sessionStore.isRevoked(decoded.jti)
      if (revoked) {
        return res.status(401).json(createErrorResponse(401, 'Token has been revoked', undefined, 'TokenRevokedError'))
      }
    }

    req.user = decoded

    // ── Secure Tenant Resolution (IDOR Protection) ──
    if (req.siteId) {
      const hasAccess = await verifySiteAccess(req.user as AuthUser, req.siteId)
      if (!hasAccess) {
        return res.status(403).json(createErrorResponse(403, 'Access denied to this site', undefined, 'ForbiddenError'))
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Role-based access guard. Must be used AFTER requireAuth.
 */
export function requireRole(...roles: Array<'admin' | 'editor' | 'viewer'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json(createErrorResponse(401, 'Authentication required', undefined, 'AuthenticationError'))
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json(createErrorResponse(403, 'Insufficient permissions', undefined, 'ForbiddenError'))
    }
    next()
  }
}

/**
 * Validates that a route param `:id` is a valid MongoDB ObjectId or PostgreSQL UUID.
 * Prevents CastErrors across database engines.
 */
export function validateObjectId(req: Request, res: Response, next: NextFunction) {
  if (req.params.id === 'singleton') return next()

  const adapter = AdapterFactory.getActiveAdapter()
  if (adapter && (adapter.name === 'postgres-drizzle' || adapter.name === 'PostgresDrizzle')) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(req.params.id)) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            400,
            `Invalid UUID format: "${req.params.id}"`,
            undefined,
            'ValidationError'
          )
        )
    }
    return next()
  }

  if (!isValidObjectId(req.params.id)) {
    return res
      .status(400)
      .json(
        createErrorResponse(
          400,
          `Invalid ID format: "${req.params.id}"`,
          undefined,
          'ValidationError'
        )
      )
  }
  next()
}
