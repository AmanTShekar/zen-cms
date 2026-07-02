import { algoliasearch, type SearchClient } from 'algoliasearch'
import type { CMSConfig, CollectionConfig, PluginContext, ZenithPlugin } from '@zenith-open/zenithcms-types'

export const algoliaSearchMatrix: ZenithPlugin = {
  id: 'algolia-search-matrix',
  name: 'Algolia Search Matrix',
  version: '1.0.0',
  description:
    'Automatically indexes newly published content collections to Algolia indexes for instantaneous keyword discovery.',
  author: 'Zenith Plugin',

  configSchema: {
    appId: {
      type: 'string',
      label: 'Algolia Application ID',
      required: true,
    },
    adminKey: {
      type: 'secret',
      label: 'Algolia Admin API Key',
      description: 'Used to write and delete records in your Algolia indexes.',
      required: true,
    },
    indexPrefix: {
      type: 'string',
      label: 'Index Prefix',
      description: 'Prefix for Algolia indexes (e.g. "prod_")',
    },
    syncAllPublic: {
      type: 'boolean',
      label: 'Sync All Public Collections',
      description: 'Automatically sync all collections that have publicRead enabled',
      default: true,
    },
  },

  apply: (config: CMSConfig) => config,

  onInit: (ctx: PluginContext) => {
    const pluginConfig =
      ctx.config.plugins?.find(
        (p) => p.id === 'algolia-search-matrix' || p.name === 'Algolia Search Matrix'
      )?.config || {}
    const { appId, adminKey, indexPrefix, syncAllPublic } = pluginConfig

    if (!appId || !adminKey) {
      ctx.logger.warn('Missing App ID or Admin Key. Algolia sync is disabled.')
      return
    }

    const client: SearchClient = algoliasearch(appId as string, adminKey as string)
    const prefix = (indexPrefix as string) || ''
    const syncAll = syncAllPublic !== false

    const shouldSyncCollection = (collection: CollectionConfig) => {
      const explicitSync = (collection as CollectionConfig & { algoliaSync?: boolean }).algoliaSync
      if (explicitSync === false) return false
      if (explicitSync === true) return true
      return syncAll && collection.publicRead === true
    }

    ctx.config.collections.forEach((collection) => {
      if (!shouldSyncCollection(collection)) return

      const indexName = `${prefix}${collection.slug}`

      ctx.hooks.on(`collection:${collection.slug}:afterCreate`, async (payload: { doc: Record<string, any> }) => {
        try {
          const doc = payload.doc
          if (doc._status && doc._status !== 'published') return

          const objectID = String(doc.id || doc._id)
          await client.saveObject({
            indexName,
            body: {
              ...doc,
              objectID,
            },
          })
          ctx.logger.debug(`Synced document ${objectID} to ${indexName}`)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          ctx.logger.error('Failed to sync document on create', { err: message })
        }
      })

      ctx.hooks.on(`collection:${collection.slug}:afterUpdate`, async (payload: { doc: Record<string, any> }) => {
        try {
          const doc = payload.doc
          const objectID = String(doc.id || doc._id)

          if (doc._status && doc._status !== 'published') {
            await client.deleteObject({ indexName, objectID })
            ctx.logger.debug(`Removed unpublished document ${objectID} from ${indexName}`)
            return
          }

          await client.partialUpdateObject({
            indexName,
            objectID,
            createIfNotExists: true,
            attributesToUpdate: doc,
          })
          ctx.logger.debug(`Updated document ${objectID} in ${indexName}`)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          ctx.logger.error('Failed to sync document on update', { err: message })
        }
      })

      ctx.hooks.on(`collection:${collection.slug}:afterDelete`, async (payload: { id: string }) => {
        try {
          await client.deleteObject({ indexName, objectID: String(payload.id) })
          ctx.logger.debug(`Deleted document ${payload.id} from ${indexName}`)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          ctx.logger.error('Failed to delete document', { err: message })
        }
      })
    })

    ctx.logger.info('Algolia Search Matrix initialized and hooks attached.')
  },
}

export default algoliaSearchMatrix
