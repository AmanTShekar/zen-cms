import { DatabaseAdapter } from '../../database/adapters/BaseAdapter'
import type { FieldConfig } from '@zenith-open/zenithcms-types'
import { logger } from '../../services/logger'

export async function resolveRelations(
  docs: Record<string, any>[],
  fields: FieldConfig[],
  populate: string[],
  depth: number,
  adapter: DatabaseAdapter,
  currentDepth = 0,
  configRegistry?: Record<string, any>,
  siteId?: string
) {
  if (currentDepth >= depth || !docs || docs.length === 0) return

  const popByFirstSegment: Record<string, string[]> = {}
  for (const path of populate) {
    const parts = path.split('.')
    const first = parts[0]
    const rest = parts.slice(1).join('.')
    if (!popByFirstSegment[first]) {
      popByFirstSegment[first] = []
    }
    if (rest) {
      popByFirstSegment[first].push(rest)
    }
  }

  for (const field of fields) {
    const fieldName = field.name
    const hasWildcard = populate.includes('*') || popByFirstSegment['*'] !== undefined
    const isExplicitlyPopulated = fieldName in popByFirstSegment || hasWildcard
    const shouldResolveRelation =
      isExplicitlyPopulated ||
      (depth > 0 &&
        ((field.type as string) === 'relation' || (field.type as string) === 'relationship' || field.type === 'media'))

    if (
      shouldResolveRelation &&
      ((field.type as string) === 'relation' || (field.type as string) === 'relationship' || field.type === 'media')
    ) {
      const relationTo = field.type === 'media' ? 'media' : (field as Record<string, any>).relationTo
      if (!relationTo) continue

      const idsToFetch = new Set<string>()
      for (const doc of docs) {
        if (!doc) continue
        const val = doc[fieldName]
        if (Array.isArray(val)) {
          val.forEach((id: Record<string, any>) => {
            if (id && typeof id === 'string') idsToFetch.add(id)
            else if (id && typeof id === 'object' && id._id) idsToFetch.add(id._id.toString())
            else if (id && typeof id === 'object' && id.id) idsToFetch.add(id.id.toString())
          })
        } else if (val) {
          if (typeof val === 'string') idsToFetch.add(val)
          else if (typeof val === 'object' && val._id) idsToFetch.add(val._id.toString())
          else if (typeof val === 'object' && val.id) idsToFetch.add(val.id.toString())
        }
      }

      if (idsToFetch.size > 0) {
        const idsArray = Array.from(idsToFetch)
        let relatedDocs: Record<string, any>[] = []
        try {
          // Use adapter-agnostic batch fetching (findMany) to eliminate N+1 queries.
          const fetched = await adapter.findMany(relationTo, idsArray, { siteId })
          relatedDocs = fetched.filter(Boolean) as Record<string, any>[]
        } catch (err) {
          logger.error({ err, collection: relationTo }, `Failed to fetch relations from ${relationTo}`)
        }

        const relatedMap = new Map<string, any>()
        for (const rDoc of relatedDocs) {
          const idStr = rDoc._id?.toString() || rDoc.id?.toString()
          if (idStr) relatedMap.set(idStr, rDoc)
        }

        const nestedPopulate = hasWildcard ? ['*'] : (popByFirstSegment[fieldName] || [])
        const targetCol =
          configRegistry?.collections?.find((c: Record<string, any>) => c.slug === relationTo) ||
          (relationTo === 'media'
            ? {
                slug: 'media',
                fields: [
                  { name: 'name', type: 'text' },
                  { name: 'url', type: 'text' },
                  { name: 'alt', type: 'text' },
                  { name: 'folder', type: 'text' },
                  { name: 'mimetype', type: 'text' },
                  { name: 'size', type: 'number' },
                ],
              }
            : null)

        if (targetCol && relatedDocs.length > 0) {
          await resolveRelations(
            relatedDocs,
            targetCol.fields,
            nestedPopulate,
            depth,
            adapter,
            currentDepth + 1,
            configRegistry,
            siteId
          )
        }

        for (const doc of docs) {
          if (!doc) continue
          const val = doc[fieldName]
          if (Array.isArray(val)) {
            doc[fieldName] = val
              .map((id: Record<string, any>) => {
                const idStr = typeof id === 'string' ? id : (id?._id?.toString() || id?.id?.toString())
                return relatedMap.get(idStr) || id
              })
              .filter(Boolean)
          } else if (val) {
            const idStr = typeof val === 'string' ? val : (val?._id?.toString() || val?.id?.toString())
            doc[fieldName] = relatedMap.get(idStr) || val
          }
        }
      }
    }

    if ((field.type === 'group' || field.type === 'collapsible') && docs) {
      const nestedDocs: Record<string, any>[] = []
      for (const doc of docs) {
        if (doc && doc[fieldName] && typeof doc[fieldName] === 'object') {
          nestedDocs.push(doc[fieldName])
        }
      }
      const nestedPopulate = hasWildcard
        ? ['*']
        : popByFirstSegment[fieldName] ||
          populate.filter((p) => p.startsWith(fieldName + '.')).map((p) => p.slice(fieldName.length + 1))
      await resolveRelations(
        nestedDocs,
        (field as Record<string, any>).fields || [],
        nestedPopulate,
        depth,
        adapter,
        currentDepth,
        configRegistry,
        siteId
      )
    } else if (field.type === 'array' && docs) {
      const nestedDocs: Record<string, any>[] = []
      for (const doc of docs) {
        if (doc && Array.isArray(doc[fieldName])) {
          nestedDocs.push(...doc[fieldName])
        }
      }
      const nestedPopulate = hasWildcard
        ? ['*']
        : popByFirstSegment[fieldName] ||
          populate.filter((p) => p.startsWith(fieldName + '.')).map((p) => p.slice(fieldName.length + 1))
      await resolveRelations(
        nestedDocs,
        (field as Record<string, any>).fields || [],
        nestedPopulate,
        depth,
        adapter,
        currentDepth,
        configRegistry,
        siteId
      )
    } else if (field.type === 'blocks' && docs) {
      const nestedPopulate = hasWildcard
        ? ['*']
        : popByFirstSegment[fieldName] ||
          populate.filter((p) => p.startsWith(fieldName + '.')).map((p) => p.slice(fieldName.length + 1))
      const blocksList = (field as Record<string, any>).blocks || []
      for (const blockDef of blocksList) {
        const nestedDocsForBlock: Record<string, any>[] = []
        for (const doc of docs) {
          if (doc && Array.isArray(doc[fieldName])) {
            for (const item of doc[fieldName]) {
              if (item && item.blockType === blockDef.slug) {
                nestedDocsForBlock.push(item)
              }
            }
          }
        }
        if (nestedDocsForBlock.length > 0) {
          await resolveRelations(
            nestedDocsForBlock,
            blockDef.fields || [],
            nestedPopulate,
            depth,
            adapter,
            currentDepth,
            configRegistry,
            siteId
          )
        }
      }
    }
  }
}
