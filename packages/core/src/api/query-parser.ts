import { CollectionConfig } from '@zenithcms/types'

/**
 * Zenith Advanced Query Parser
 * ───────────────────────────
 * Converts URL query parameters AND a structured JSON body into Postgres/MongoDB-
 * compatible filters and options.
 *
 * Supports three modes:
 * 1. URL params:     ?filter[name][eq]=Zenith&sort=-createdAt&page=1&pageSize=10&fields=&populate=
 * 2. JSON body:      { filter, sort, page, pageSize, select, populate, locale, depth }
 * 3. JSON body v2:    { where, orderBy, take, skip, fields, include, locale, depth }
 *                     (Strapi/Payload-style field names)
 *
 * Populate supports dot-notation for eager-loading nested relations:
 *   ?populate=author,author.posts,tags
 */
export interface UQLQuery {
  filter: Record<string, unknown>
  sort: string
  pagination: {
    page: number
    pageSize: number
  }
  select: string
  populate: string[]
  /** Population depth cap for recursive relations (circular safety) */
  depth?: number
  locale?: string
}

/** Convert MongoDB filter operators ($ne, $in, $regex…) to Postgres equivalents */
function mongoToPostgresFilter(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value
  const ops = value as Record<string, unknown>
  // Already a bare value, not an operator
  if (!('$ne' in ops || '$in' in ops || '$gt' in ops || '$lt' in ops ||
        '$gte' in ops || '$lte' in ops || '$like' in ops || '$regex' in ops)) {
    return value
  }
  if ('$in' in ops) return { any: ops.$in }
  if ('$ne' in ops) return { ne: ops.$ne }
  if ('$gt' in ops) return { gt: ops.$gt }
  if ('$lt' in ops) return { lt: ops.$lt }
  if ('$gte' in ops) return { gte: ops.$gte }
  if ('$lte' in ops) return { lte: ops.$lte }
  if ('$regex' in ops) return { ilike: ops.$regex }
  if ('$like' in ops) return { ilike: ops.$like }
  return value
}

function normalizeFilters(
  filter: Record<string, unknown>,
  out: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const [key, val] of Object.entries(filter)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const ops = val as Record<string, unknown>
      const isOperator = !!(
        '$eq' in ops || '$ne' in ops || '$in' in ops ||
        '$gt' in ops || '$lt' in ops || '$gte' in ops || '$lte' in ops ||
        '$like' in ops || '$regex' in ops
      )
      if (isOperator) {
        if ('$eq' in ops) out[key] = ops.$eq
        else out[key] = mongoToPostgresFilter(ops)
      } else {
        const nested = normalizeFilters(ops as Record<string, unknown>, {})
        Object.assign(out, nested)
      }
    } else {
      out[key] = val
    }
  }
  return out
}

/**
 * Parse query inputs from both URL search params (query) and JSON body (body).
 * Body takes priority if both are provided.
 */
export function parseQueryParams(
  query: any,
  config: CollectionConfig,
  body?: Partial<UQLQuery>
): UQLQuery {
  // Prefer body for structured requests, fall back to URL params
  const src: Record<string, unknown> = body
    ? {
        // UQL v1 fields
        ...(body.filter ? { filter: body.filter } : {}),
        sort: body.sort ?? '-createdAt',
        page: String(body.pagination?.page ?? 1),
        pageSize: String(body.pagination?.pageSize ?? 25),
        select: body.select ?? '',
        populate: body.populate as string[] ?? [],
        depth: body.depth,
        locale: body.locale,
        // UQL v2 / Strapi-style aliases
        ...(body as any).where ? { filter: (body as any).where } : {},
        ...(body as any).orderBy ? { sort: flattenOrderBy((body as any).orderBy) } : {},
        ...(body as any).take ? { pageSize: String((body as any).take) } : {},
        ...(body as any).skip ? { page: String(Math.floor(((body as any).skip as number) / ((body as any).take ?? 25)) + 1) } : {},
      }
    : {}

  const parsed: UQLQuery = {
    filter: {},
    sort: (src.sort as string) || '-createdAt',
    pagination: {
      page: parseInt((src.page as string) || '1'),
      pageSize: Math.min(parseInt((src.pageSize as string) || '25'), 100),
    },
    select: '',
    populate: [],
    depth: src.depth !== undefined ? (src.depth as number) : (query.depth ? parseInt(query.depth as string) : undefined),
    locale: src.locale as string | undefined,
  }

  // sort
  if (src.sort) parsed.sort = src.sort as string

  // select / fields
  const rawFields = (src.select as string) || (query.fields as string) || (query.select as string) || ''
  parsed.select = rawFields.split(',').map((s) => s.trim()).filter(Boolean).join(' ')

  // populate — split, expand dot-notation, cap at depth limit
  const rawPopulate = src.populate as string[] | undefined
  if (rawPopulate) {
    let all: string[] = []
    for (const p of rawPopulate) {
      all = all.concat(p.split(',').map((s) => s.trim()).filter(Boolean))
    }
    parsed.populate = capDepth(all, parsed.depth ?? 5)
  } else if (query.populate) {
    const pStr = Array.isArray(query.populate) ? query.populate.join(',') : query.populate
    parsed.populate = pStr.split(',').map((s: string) => s.trim()).filter(Boolean)
  }

  // normalize filter operators
  const filterObj = (body as any)?.filter ?? (body as any)?.filters ?? query.filter ?? query.filters ?? {}
  parsed.filter = normalizeFilters(filterObj)

  // Search shorthand — adapter-safe: uses `ilike` operator that both Mongo and Postgres adapters handle
  if (query.q || (body as any)?.q) {
    const titleField = config.admin?.useAsTitle || 'title'
    parsed.filter[titleField] = { $like: (query.q || (body as any)?.q) ?? '' }
  }

  return parsed
}

/** Convert Strapi-style orderBy array: [{ field: 'title', direction: 'asc' }] → 'title,-date' */
function flattenOrderBy(orderBy: any): string {
  if (!Array.isArray(orderBy)) return String(orderBy || '')
  return orderBy
    .map((o: any) => {
      const dir = o.direction === 'desc' ? '-' : ''
      return `${dir}${o.field}`
    })
    .filter(Boolean)
    .join(',')
}

/**
 * Cap the depth of dot-notation populate entries to `maxDepth`.
 * e.g. capDepth(['a.b.c', 'a.b', 'x'], 2) → ['a.b', 'x']
 */
function capDepth(fields: string[], maxDepth: number): string[] {
  return fields
    .map((f) => {
      const parts = f.split('.')
      return parts.slice(0, maxDepth).join('.')
    })
    .filter((f, i, arr) => arr.indexOf(f) === i) // dedupe
}
