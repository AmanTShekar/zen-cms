import { Request, Response, NextFunction } from 'express'
import { isValidObjectId } from 'mongoose'
import { AuthService, AuthUser } from '../services/auth'
import { createErrorResponse } from '../api/utils'
import { AdapterFactory } from '../database/adapters/AdapterFactory'

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Verifies Bearer token and attaches `req.user`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.accessToken

  // Fallback to Bearer token in header if cookie not present
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }
  }

  if (!token) {
    return res
      .status(401)
      .json(createErrorResponse(401, 'Authentication required', undefined, 'AuthenticationError'))
  }

  const decoded = AuthService.verifyToken(token)

  if (!decoded) {
    return res
      .status(401)
      .json(createErrorResponse(401, 'Invalid or expired token', undefined, 'AuthenticationError'))
  }

  req.user = decoded
  next()
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
