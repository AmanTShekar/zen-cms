export function generateMongoCode(col: any): string {
  const slug = col.slug
  const capitalized = slug.charAt(0).toUpperCase() + slug.slice(1)

  return `
// --- Compiled MongoDB Queries for Collection: ${slug} ---

export async function find${capitalized}Compiled(db: any, table: any, filters: { id?: string; siteId?: string }, options: any = {}) {
  const model = mongoose.models['${slug}'] || (mongoose.modelNames().includes('${slug}') ? mongoose.model('${slug}') : null)
  if (!model) {
    throw new Error('Model ${slug} not registered in Mongoose schema')
  }

  const query: Record<string, any> = {}
  if (filters.id) {
    query._id = filters.id
  }
  if (filters.siteId) {
    query.siteId = filters.siteId
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
  const model = mongoose.models['${slug}'] || (mongoose.modelNames().includes('${slug}') ? mongoose.model('${slug}') : null)
  if (!model) {
    throw new Error('Model ${slug} not registered in Mongoose schema')
  }
  const doc = new model(data)
  await doc.save({ session: options.session })
  return doc.toObject()
}
`
}
