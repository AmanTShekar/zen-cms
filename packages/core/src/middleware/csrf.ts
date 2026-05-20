import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

/**
 * Zenith CSRF Protection Middleware
 * ────────────────────────────────
 * Implements a secure Double Submit Cookie pattern.
 * Required for the Admin UI to prevent cross-site request forgery.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // 1. Ensure XSRF-TOKEN cookie is set for the client to read
  let csrfToken = req.cookies?.['XSRF-TOKEN']
  if (!csrfToken) {
    csrfToken = crypto.randomBytes(24).toString('hex')
    res.cookie('XSRF-TOKEN', csrfToken, {
      httpOnly: false, // Must be accessible to client JS/Axios
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }

  // 2. Skip validation for read-only HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }

  // 3. Enforce CSRF token match only for cookie-authenticated requests
  const hasAuthCookie = req.cookies?.['accessToken'] || req.cookies?.['refreshToken']
  if (hasAuthCookie) {
    const headerToken = req.headers['x-csrf-token']
    if (!headerToken || !csrfToken || headerToken !== csrfToken) {
      return res.status(403).json({ error: 'CSRF token validation failed. Missing or mismatched token.' })
    }
  }

  next()
}
