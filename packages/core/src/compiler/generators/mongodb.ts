export function generateMongoCode(col: any): string {
  const slug = col.slug
  const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1)

  return `
// --- Compiled MongoDB Queries for Collection: ${slug} ---

export async function find${capitalized}Compiled(db: any, table: any, filters: Record<string, any> = {}, options: any = {}) {
  const model = table
  if (!model) {
    throw new Error('Model ${slug} was not passed to AOT bridge correctly')
  }

  const query: Record<string, any> = { ...filters }
  if (query.id) {
    query._id = query.id
    delete query.id
  }

  let baseQuery = model.find(query)
  if (options.limit) {
    baseQuery = baseQuery.limit(options.limit)
  }
  if (options.skip) {
    baseQuery = baseQuery.skip(options.skip)
  }
  if (options.session) {
    baseQuery = baseQuery.session(options.session)
  }

  return await baseQuery.lean().exec()
}

export async function create${capitalized}Compiled(db: any, table: any, data: any, options: any = {}) {
  const model = table
  if (!model) {
    throw new Error('Model ${slug} was not passed to AOT bridge correctly')
  }
  const doc = new model(data)
  await doc.save({ session: options.session })
  return doc.toObject()
}
`
}
