export function generatePostgresCode(col: any): string {
  const slug = col.slug
  const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1)

  return `
// --- Compiled Postgres Queries for Collection: ${slug} ---

export async function find${capitalized}Compiled(db: any, table: any, filters: { id?: string; siteId?: string }, options: any = {}) {
  if (!db || !table) {
    throw new Error('Postgres compiled query requires active db and table handles')
  }

  let baseQuery = db.select().from(table)
  const conditions: any[] = []

  if (filters.id) {
    conditions.push(eq(table.id, filters.id))
  }
  if (filters.siteId) {
    conditions.push(eq(table.siteId, filters.siteId))
  }

  const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery
  
  if (options.limit) {
    query.limit(options.limit)
  }
  if (options.skip) {
    query.offset(options.skip)
  }

  return await query
}

export async function create${capitalized}Compiled(db: any, table: any, data: any) {
  if (!db || !table) {
    throw new Error('Postgres compiled query requires active db and table handles')
  }
  const result = await db.insert(table).values(data).returning()
  return result[0]
}
`
}
