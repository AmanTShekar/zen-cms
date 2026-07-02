import { Request, Response, NextFunction } from 'express'

export const cookieConsentMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Read consent from cookie or headers
  const consent = req.cookies?.['cookie-consent'] || req.headers['x-cookie-consent']
  
  // Attach to request for downstream usage (e.g. tracking, analytics blocking)
  ;(req as any).cookieConsent = {
    granted: consent === 'granted',
    timestamp: new Date().toISOString()
  }
  
  next()
}
