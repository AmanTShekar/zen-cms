import { Request, Response, NextFunction } from 'express';

/**
 * Adds `Vary: X-Zenith-Site-Id` to every response so CDNs and caches
 * store separate variants per site.
 */
export function siteVaryMiddleware(_req: Request, res: Response, next: NextFunction) {
  const existing = res.getHeader('Vary');
  const varyHeader = existing ? `${existing}, X-Zenith-Site-Id` : 'X-Zenith-Site-Id';
  res.setHeader('Vary', varyHeader);
  next();
}
