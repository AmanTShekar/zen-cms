import { CollectionConfig } from '@zenith-open/zenithcms-types'

export interface SearchResult {
  collection: string
  collectionLabel: string
  id: string
  title: string
  field: string
  snippet: string
  score: number
}

/**
 * Zenith Global Search Service
 * ─────────────────────────────
 * Searches across all text fields in all registered collections via the adapter.
 * Works with any database backend — does NOT call mongoose directly.
 */
export class SearchService {
  /**
   * @param adapter — The active DatabaseAdapter instance (injected from ZenithEngine)
   */
  static async globalSearch(
    query: string,
    collections: CollectionConfig[],
    adapter: import('@zenith-open/types').DatabaseAdapter, // DatabaseAdapter — typed as Record<string, any> to avoid circular import
    limit = 20,
    siteId?: string
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    await Promise.all(
      collections
        .filter((col) => !col.admin?.hidden)
        .map(async (col) => {
          try {
            const textFields = col.fields
              .filter((f) => ['text', 'textarea', 'richtext', 'email'].includes(f.type))
              .map((f) => f.name)

            if (textFields.length === 0) return

            // Use adapter.search() — works for both MongoDB and Postgres
            const docs = await adapter.search(col.slug, query, textFields, 10, { siteId })

            // Secure strict tenant boundary isolation checks
            const filteredDocs = siteId
              ? docs.filter((d: Record<string, any>) => !d.siteId || d.siteId === siteId)
              : docs

            for (const doc of filteredDocs) {
              for (const field of textFields) {
                const value = doc[field]
                if (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())) {
                  const matchIndex = value.toLowerCase().indexOf(query.toLowerCase())
                  const start = Math.max(0, matchIndex - 40)
                  const end = Math.min(value.length, matchIndex + query.length + 40)
                  const snippet =
                    (start > 0 ? '…' : '') +
                    value.slice(start, end) +
                    (end < value.length ? '…' : '')

                  results.push({
                    collection: col.slug,
                    collectionLabel: col.labels?.plural || col.name,
                    id: doc._id?.toString() || doc.id?.toString(),
                    title: doc[col.admin?.useAsTitle || 'title'] || 'Untitled',
                    field,
                    snippet,
                    score: field === (col.admin?.useAsTitle || 'title') ? 2 : 1,
                  })
                  break // one result per doc per collection
                }
              }
            }
          } catch {
            // Collection may not be registered yet — skip silently
          }
        })
    )

    return results.sort((a, b) => b.score - a.score).slice(0, limit)
  }
}
