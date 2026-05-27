import { Request, Response, NextFunction } from 'express'

/**
 * Redirect Handler Middleware
 * ────────────────────────────
 * Intercepts unmatched GET/HEAD requests and checks the `z_redirects`
 * collection for a matching `from` path. If found, responds with the
 * configured redirect status code and `Location` header instead of 404.
 *
 * Must be registered AFTER all application routes but BEFORE the 404 handler.
 *
 * Inspired by Payload CMS redirect plugin pattern.
 */
export async function redirectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const adapter = (req as any).zenith?.adapter
    if (!adapter) return next()

    // Only intercept GET and HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()

    // Skip API/static/system routes
    const skipPrefixes = ['/api/', '/uploads/', '/media/', '/metrics', '/graphql', '/_next', '/favicon']
    if (skipPrefixes.some((p) => req.path.startsWith(p))) return next()

    const siteId = req.headers['x-zenith-site-id'] as string | undefined
    const filter: Record<string, any> = { from: req.path }
    if (siteId) filter.siteId = siteId

    const redirect = await adapter.findOne('z_redirects', filter)
    if (!redirect) return next()

    const target = redirect.to
    const statusCode = parseInt(redirect.type || '301', 10)

    // Update hit counter — works across both MongoDB and Postgres
    try {
      const docId = String(redirect._id ?? redirect.id)
      const currentHits = typeof redirect.hits === 'number' ? redirect.hits : 0
      adapter.update('z_redirects', docId, {
        hits: currentHits + 1,
        lastHitAt: new Date().toISOString(),
      }).catch(() => {})
    } catch { /* non-critical */ }

    res.redirect(statusCode, target)
  } catch {
    next()
  }
}