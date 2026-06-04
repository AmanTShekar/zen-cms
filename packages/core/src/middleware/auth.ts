import { Request, Response, NextFunction } from 'express'
import { isValidObjectId } from 'mongoose'
import { AuthService, AuthUser } from '../services/auth'
import { createErrorResponse } from '../api/utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { sessionStore } from '../services/session-store'
import { redisService } from '../services/redis'

// Simple in-memory fallback for dev mode without Redis
const localSiteAccessCache = new Map<string, { value: boolean; expires: number }>()

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
  } else {
    const cached = localSiteAccessCache.get(cacheKey)
    if (cached && cached.expires > Date.now()) return cached.value
  }

  const adapter = AdapterFactory.getActiveAdapter()
  let sites = await adapter.find<any>('sites', { slug: siteId })
  if (sites.length === 0 && /^[0-9a-fA-F]{24}$/.test(siteId)) {
    sites = await adapter.find<any>('sites', { id: siteId })
  }
  const site = sites[0] || null

  if (!site) return false

  const isOwner = site.ownerId === user.id
  const isMember = Array.isArray(site.members) && site.members.some((m: any) => m.userId === user.id)

  const accessGranted = isOwner || isMember
  
  if (redisService.client) {
    await redisService.client.setex(cacheKey, 300, accessGranted ? '1' : '0')
  } else {
    localSiteAccessCache.set(cacheKey, { value: accessGranted, expires: Date.now() + 300 * 1000 })
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
    
    // ── Extract Tenant Identity from Header ──
    const headerSiteId = req.headers['x-zenith-site-id'] as string
    if (headerSiteId) {
      req.siteId = headerSiteId
    }

    // ── Secure Tenant Resolution (IDOR Protection) ──
    if (req.siteId) {
      const isGlobalRoute = req.originalUrl.startsWith('/api/v1/auth') || 
                            req.originalUrl.startsWith('/api/v1/system') ||
                            req.originalUrl.startsWith('/api/v1/sites') ||
                            req.originalUrl.startsWith('/api/v1/workspaces')
                            
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

    // Resolve custom roles from database
    try {
      const { RoleModel } = await import('../database/role-model')
      const customRole = await RoleModel.findOne({ roleName: req.user.role })
      
      if (customRole) {
        // If the route requires 'admin', check if custom role has wildcard access
        const hasWildcard = customRole.permissions.some(p => p.resource === '*' && p.actions.includes('*'))
        if (roles.includes('admin') && hasWildcard) return next()
        
        // If route requires 'editor', check if they have write access to any resource
        const hasWrite = customRole.permissions.some(p => p.actions.includes('*') || p.actions.includes('create') || p.actions.includes('update'))
        if (roles.includes('editor') && (hasWildcard || hasWrite)) return next()
        
        // If route requires 'viewer', check if they have read access
        const hasRead = customRole.permissions.some(p => p.actions.includes('*') || p.actions.includes('read'))
        if (roles.includes('viewer') && (hasWildcard || hasWrite || hasRead)) return next()
      }
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
