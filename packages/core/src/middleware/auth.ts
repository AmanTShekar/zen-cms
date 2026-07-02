import { Request, Response, NextFunction } from 'express'
import { isValidObjectId } from 'mongoose'
import { AuthService, AuthUser } from '../services/auth'
import { createErrorResponse } from '../api/utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { sessionStore } from '../services/session-store'
import { redisService } from '../services/redis'

export const GLOBAL_ROUTES = [
  '/api/v1/auth',
  '/api/v1/system',
  '/api/v1/sites',
  '/api/v1/workspaces',
  '/api/v1/media',
  '/media',
]
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
  const cacheKey = `site_access:${user.id}:${siteId}`
  
  if (redisService.client) {
    const cached = await redisService.client.get(cacheKey)
    if (cached !== null) return cached === '1'
  }

  const adapter = AdapterFactory.getActiveAdapter()
  let sites = await adapter.find<Record<string, any>>('z_sites', { slug: siteId })
  if (sites.length === 0 && /^[0-9a-fA-F]{24}$/.test(siteId)) {
    sites = await adapter.find<Record<string, any>>('z_sites', { id: siteId })
  }
  const site = sites[0] || null

  if (!site) return false

  if (user.role === 'admin') return true

  const userFromDb = await adapter.findOne<Record<string, any>>('users', { _id: user.id }) || 
                     await adapter.findOne<Record<string, any>>('users', { id: user.id }) || user

  const isOwner = site.ownerId?.toString() === user.id?.toString()
  const isMember = Array.isArray(site.members) && site.members.some((m: any) => m.userId === user.id)
  const hasSpecialAccess = Array.isArray((userFromDb as any).specialAccess) && ((userFromDb as any).specialAccess.includes(`site:${siteId}`) || (userFromDb as any).specialAccess.includes(`site:${site.slug}`))

  const accessGranted = isOwner || isMember || hasSpecialAccess
  
  if (redisService.client) {
    await redisService.client.setex(cacheKey, 300, accessGranted ? '1' : '0')
  }

  return accessGranted
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

    let decoded: any;
    try {
      decoded = AuthService.verifyToken(token) as any
    } catch (err: any) {
      const msg = err.message || 'Invalid or expired token'
      return res.status(401).json(createErrorResponse(401, msg, undefined, 'AuthenticationError'))
    }

    // ── Token Revocation Check ──
    if (decoded.jti) {
      const revoked = await sessionStore.isRevoked(decoded.jti)
      if (revoked) {
        return res.status(401).json(createErrorResponse(401, 'Token has been revoked', undefined, 'TokenRevokedError'))
      }
    }

    req.user = decoded
    
    // ── Extract Tenant Identity from Header ──
    const headerSiteId = req.headers['x-zenith-site-id'] as string
    if (headerSiteId) {
      req.siteId = headerSiteId
    }

    const isGlobalRoute = GLOBAL_ROUTES.some(route => req.originalUrl.startsWith(route))

    if (!req.siteId && !isGlobalRoute) {
      return res.status(400).json(createErrorResponse(400, 'Missing x-zenith-site-id header', undefined, 'BadRequestError'))
    }

    // ── Secure Tenant Resolution (IDOR Protection) ──
    if (req.siteId) {
      const hasAccess = await verifySiteAccess(req.user as AuthUser, req.siteId)
      if (!hasAccess) {
        if (isGlobalRoute) {
          // Stale site ID from frontend, ignore it for global routes
          delete req.siteId
        } else {
          return res.status(403).json(createErrorResponse(403, 'Access denied to this site', undefined, 'ForbiddenError'))
        }
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
export function requireRole(...roles: Array<string>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json(createErrorResponse(401, 'Authentication required', undefined, 'AuthenticationError'))
    }
    
    // Direct match for built-in or explicitly listed roles
    if (roles.includes(req.user.role)) {
      return next()
    }

    // Resolve custom roles via RBAC Engine
    try {
      const { RBACEngine } = await import('../services/rbac')
      const hasAccess = await RBACEngine.satisfiesRoleRequired(req.user.role, roles, req.siteId)
      if (hasAccess) return next()
    } catch (err) {
      // Ignore DB errors, fallback to 403
    }

    return res
      .status(403)
      .json(createErrorResponse(403, 'Insufficient permissions', undefined, 'ForbiddenError'))
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
