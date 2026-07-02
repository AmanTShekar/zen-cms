/**
 * Strapi → Zenith Field Transformer
 * ──────────────────────────────────
 * Pure, stateless helpers that convert a single Strapi record's field values
 * into Zenith-ready values. No side effects, no I/O. Supports v3 and v4.
 */

/** Maps a strapi file id → zenith media document id */
export type MediaMap = Map<number, string>

/** Maps strapi internal id → zenith document id, keyed by collection slug */
export type IdMap = Map<string, Map<number, string>>

// ── Rich text ──────────────────────────────────────────────────────────────

/**
 * Converts Strapi v4 "Blocks" rich-text JSON to plain HTML.
 * Falls back to raw string for Strapi v3 (stored markdown/html directly).
 */
export function transformRichText(value: unknown): string {
  if (typeof value === 'string') return value
  if (!Array.isArray(value)) return String(value ?? '')

  function nodeToHtml(node: any): string {
    if (!node || typeof node !== 'object') return ''
    if (node.type === 'text') {
      let text = String(node.text ?? '')
      if (node.bold) text = `<strong>${text}</strong>`
      if (node.italic) text = `<em>${text}</em>`
      if (node.underline) text = `<u>${text}</u>`
      if (node.strikethrough) text = `<s>${text}</s>`
      if (node.code) text = `<code>${text}</code>`
      return text
    }
    const children: string = (node.children ?? []).map(nodeToHtml).join('')
    switch (node.type) {
      case 'paragraph':  return `<p>${children}</p>`
      case 'heading':    return `<h${node.level ?? 2}>${children}</h${node.level ?? 2}>`
      case 'list':       return node.format === 'ordered' ? `<ol>${children}</ol>` : `<ul>${children}</ul>`
      case 'list-item':  return `<li>${children}</li>`
      case 'quote':      return `<blockquote>${children}</blockquote>`
      case 'code':       return `<pre><code>${children}</code></pre>`
      case 'link':       return `<a href="${node.url ?? ''}">${children}</a>`
      case 'image':      return `<img src="${node.image?.url ?? ''}" alt="${node.image?.alternativeText ?? ''}" />`
      default:           return children
    }
  }
  return value.map(nodeToHtml).join('\n')
}

// ── Media ──────────────────────────────────────────────────────────────────

export function transformMediaField(
  value: any,
  mediaMap: MediaMap,
  preserveUrls: boolean,
  strapiBaseUrl: string
): string | null {
  if (!value) return null
  const file = value?.data ?? value
  if (!file) return null
  const strapiId: number = file.id ?? file.attributes?.id
  if (strapiId && mediaMap.has(strapiId)) return mediaMap.get(strapiId)!
  if (preserveUrls) {
    const url: string = file.url ?? file.attributes?.url ?? ''
    if (url) return url.startsWith('http') ? url : `${strapiBaseUrl}${url}`
  }
  return null
}

export function transformMediaArrayField(
  value: any,
  mediaMap: MediaMap,
  preserveUrls: boolean,
  strapiBaseUrl: string
): string[] {
  if (!value) return []
  const items = value?.data ?? value
  if (!Array.isArray(items)) return []
  return items
    .map((item: any) => transformMediaField(item, mediaMap, preserveUrls, strapiBaseUrl))
    .filter((v): v is string => v !== null)
}

// ── Relations ──────────────────────────────────────────────────────────────

export function transformRelationField(
  strapiId: number | null | undefined,
  targetSlug: string,
  idMap: IdMap
): string | null {
  if (strapiId == null) return null
  return idMap.get(targetSlug)?.get(strapiId) ?? null
}

export function transformRelationArrayField(
  strapiIds: number[],
  targetSlug: string,
  idMap: IdMap
): string[] {
  return strapiIds
    .map((id) => transformRelationField(id, targetSlug, idMap))
    .filter((v): v is string => v !== null)
}

// ── Component / Dynamic Zone ───────────────────────────────────────────────

export function transformComponent(
  data: Record<string, any>,
  fieldSchema: Record<string, any>,
  mediaMap: MediaMap,
  idMap: IdMap,
  preserveUrls: boolean,
  strapiBaseUrl: string
): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, attr] of Object.entries(fieldSchema)) {
    result[key] = transformValue(key, data[key], attr as any, mediaMap, idMap, preserveUrls, strapiBaseUrl)
  }
  return result
}

// ── Primary field transformer ───────────────────────────────────────────────

export function transformValue(
  _fieldName: string,
  raw: unknown,
  attr: Record<string, any>,
  mediaMap: MediaMap,
  idMap: IdMap,
  preserveUrls: boolean,
  strapiBaseUrl: string
): unknown {
  if (raw === undefined || raw === null) return null
  const type: string = attr?.type ?? 'string'

  switch (type) {
    case 'string': case 'text': case 'email':
    case 'password': case 'uid': case 'enumeration':
      return String(raw)

    case 'integer': case 'biginteger': case 'float': case 'decimal':
      return Number(raw)

    case 'boolean':
      return Boolean(raw)

    case 'date': case 'datetime': case 'timestamp': {
      if (raw instanceof Date) return raw.toISOString()
      const d = new Date(raw as any)
      return isNaN(d.getTime()) ? null : d.toISOString()
    }

    case 'time':
      return String(raw)

    case 'json': case 'blocks': {
      if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return raw } }
      return raw
    }

    case 'richtext':
      return transformRichText(raw)

    case 'media': {
      const multiple = !!attr.multiple
      return multiple
        ? transformMediaArrayField(raw, mediaMap, preserveUrls, strapiBaseUrl)
        : transformMediaField(raw, mediaMap, preserveUrls, strapiBaseUrl)
    }

    case 'relation': {
      const relationType: string = attr.relation ?? 'oneToOne'
      const hasMany = relationType.toLowerCase().includes('tomany')
      const targetSlug: string = attr.target
        ? (attr.target.split('::')[1]?.split('.')[1] ?? attr.target)
        : ''
      if (hasMany) {
        const ids = Array.isArray(raw) ? raw.map(Number) : []
        return transformRelationArrayField(ids, targetSlug, idMap)
      } else {
        const rid = typeof raw === 'object' ? (raw as any)?.id ?? null : Number(raw) || null
        return transformRelationField(rid, targetSlug, idMap)
      }
    }

    case 'component': {
      if (!raw || typeof raw !== 'object') return null
      const componentSchema = (attr as any).attributes ?? {}
      if ((attr as any).repeatable && Array.isArray(raw)) {
        return (raw as any[]).map((item) =>
          transformComponent(item, componentSchema, mediaMap, idMap, preserveUrls, strapiBaseUrl)
        )
      }
      return transformComponent(raw as Record<string, any>, componentSchema, mediaMap, idMap, preserveUrls, strapiBaseUrl)
    }

    case 'dynamiczone': {
      if (!Array.isArray(raw)) return []
      return (raw as any[]).map((item: any) => {
        const { __component, ...rest } = item
        return {
          _type: String(__component ?? '').split('.').pop() ?? 'unknown',
          ...transformComponent(rest, {}, mediaMap, idMap, preserveUrls, strapiBaseUrl),
        }
      })
    }

    default:
      return raw
  }
}

/**
 * Transforms an entire Strapi DB row into a Zenith-ready document object.
 */
export function transformRecord(
  record: Record<string, any>,
  schema: Record<string, any>,
  mediaMap: MediaMap,
  idMap: IdMap,
  options: { preserveUrls: boolean; strapiBaseUrl: string }
): Record<string, any> {
  const { preserveUrls, strapiBaseUrl } = options
  const result: Record<string, any> = {}

  // Preserve system timestamps
  if (record.created_at || record.createdAt) result.createdAt = record.created_at ?? record.createdAt
  if (record.updated_at || record.updatedAt) result.updatedAt = record.updated_at ?? record.updatedAt
  if (record.published_at != null) {
    result.publishedAt = record.published_at
    result._status = record.published_at ? 'published' : 'draft'
  }
  if (record.locale) result.locale = record.locale

  for (const [fieldName, attr] of Object.entries(schema)) {
    result[fieldName] = transformValue(
      fieldName,
      record[fieldName],
      attr as any,
      mediaMap,
      idMap,
      preserveUrls,
      strapiBaseUrl
    )
  }

  return result
}
