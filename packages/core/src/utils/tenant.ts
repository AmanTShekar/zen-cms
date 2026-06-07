import { Request } from 'express'

/**
 * Extracts the site/tenant ID from the request consistently.
 * Priority: req.siteId (set by middleware) -> x-zenith-site-id header -> query.siteId
 */
export function extractSiteId(req: Request): string | undefined {
  if (req.siteId) return req.siteId
  
  const header = req.headers['x-zenith-site-id']
  if (header) {
    return Array.isArray(header) ? header[0] : header
  }
  
  const queryParam = req.query?.siteId
  if (queryParam) {
    return Array.isArray(queryParam) ? (queryParam[0] as string) : (queryParam as string)
  }
  
  return undefined
}
