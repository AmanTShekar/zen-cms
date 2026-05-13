import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { AuthService, AuthUser } from '../services/auth';
import { createErrorResponse } from '../api/utils';

// Extend Express Request to include user
declare global {
// eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies Bearer token and attaches `req.user`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(
      createErrorResponse(401, 'Authentication required', undefined, 'AuthenticationError')
    );
  }

  const token = authHeader.split(' ')[1];
  const decoded = AuthService.verifyToken(token);

  if (!decoded) {
    return res.status(401).json(
      createErrorResponse(401, 'Invalid or expired token', undefined, 'AuthenticationError')
    );
  }

  req.user = decoded;
  next();
}

/**
 * Role-based access guard. Must be used AFTER requireAuth.
 */
export function requireRole(...roles: Array<'admin' | 'editor' | 'viewer'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json(
        createErrorResponse(401, 'Authentication required', undefined, 'AuthenticationError')
      );
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(
        createErrorResponse(403, 'Insufficient permissions', undefined, 'ForbiddenError')
      );
    }
    next();
  };
}

/**
 * Validates that a route param `:id` is a valid MongoDB ObjectId.
 * Prevents Mongoose from throwing cast errors.
 */
export function validateObjectId(req: Request, res: Response, next: NextFunction) {
  if (req.params.id === 'singleton') return next();
  
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(
      createErrorResponse(400, `Invalid ID format: "${req.params.id}"`, undefined, 'ValidationError')
    );
  }
  next();
}
