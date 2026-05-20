import { CollectionConfig, FieldConfig } from '@zenithcms/types'
import { logger } from './logger'
import { DatabaseAdapter, BaseOptions } from '../database/adapters/BaseAdapter'
import { NotFoundError, ForbiddenError } from '../errors'
import { eventHub } from './event-hub'
import { sanitizeHtml } from '../utils'
import { WorkerSandboxPool } from '../sandbox/worker-pool'
import { i18n } from '../i18n'
import { PresenceService } from './presence'

export const sandboxPool = new WorkerSandboxPool()

export interface ContentOperationOptions extends BaseOptions {
  user?: any
  locale?: string
  skipHooks?: boolean
  skipVersioning?: boolean
  siteId?: string
  preview?: boolean
  overrideLock?: boolean
}

/**
 * Zenith Content Service — Re-Engineered
 * ──────────────────────────────────────
 * Orchestrates business logic with strict typing and atomic operations.
 * Handles recursive field processing and Row-Level Security.
 */
export class ContentService<T = unknown> {
  constructor(
    private config: CollectionConfig,
    private adapter: DatabaseAdapter
  ) {}

  /**
   * Applies recursive field hooks and cleans data for DB/API
   */
  private async processFields(
    data: any,
    options: ContentOperationOptions,
    action: 'afterRead' | 'beforeChange',
    fields: FieldConfig[] = this.config.fields
  ): Promise<any> {
    if (!data) return data

    // Ensure we are working with a plain object
    const cleanData = { ...data }

    for (const field of fields) {
      if (field.virtual && action === 'beforeChange') continue

      // ── Stored XSS Protection: Sanitize rich text inputs before saving ─────
      if (field.type === 'richtext' && action === 'beforeChange') {
        const val = cleanData[field.name]
        if (typeof val === 'string') {
          cleanData[field.name] = sanitizeHtml(val)
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          const localizedSanitized = { ...val }
          for (const localeKey of Object.keys(localizedSanitized)) {
            if (typeof localizedSanitized[localeKey] === 'string') {
              localizedSanitized[localeKey] = sanitizeHtml(localizedSanitized[localeKey])
            }
          }
          cleanData[field.name] = localizedSanitized
        }
      }

      // 1. Handle Localization (Zero-Copy Flattening)
      // Strapi duplicates rows; Zenith keeps the tree in DB but flattens on the edge
      if (field.localized && action === 'afterRead' && options.locale) {
        const val = cleanData[field.name]
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          cleanData[field.name] = i18n.getLocalizedValue(val, options.locale)
        }
      }

      // 2. Handle nested structures
      if (field.type === 'group' && cleanData[field.name]) {
        cleanData[field.name] = await this.processFields(
          cleanData[field.name],
          options,
          action,
          field.fields
        )
      } else if (field.type === 'array' && Array.isArray(cleanData[field.name])) {
        cleanData[field.name] = await Promise.all(
          cleanData[field.name].map((item: any) =>
            this.processFields(item, options, action, field.fields)
          )
        )
      } else if (field.type === 'blocks' && Array.isArray(cleanData[field.name])) {
        cleanData[field.name] = await Promise.all(
          cleanData[field.name].map((block: any) => {
            const blockDef = field.blocks.find((b) => b.slug === block.blockType)
            return blockDef ? this.processFields(block, options, action, blockDef.fields) : block
          })
        )
      }

      // 3. Apply field-level hook
      const hookFn = field.hooks?.[action]
      if (hookFn && cleanData[field.name] !== undefined) {
        try {
          cleanData[field.name] = await hookFn(cleanData[field.name])
        } catch (err: any) {
          logger.warn({ field: field.name, err: err.message }, 'Field hook failed')
        }
      }
    }

    return cleanData
  }

  private async executeHook(
    hookType: 'beforeValidate' | 'beforeCreate' | 'afterCreate' | 'afterRead' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete',
    hookFn: (...args: any[]) => any,
    dataOrId: any,
    user: any
  ): Promise<any> {
    const isIsolated = (this.config.hooks as any)?.[`${hookType}_isolated`] === true
    if (isIsolated) {
      try {
        const timeoutMs = Number((this.config.hooks as any)?.[`${hookType}_timeout`]) || 500
        return await sandboxPool.runTask({
          hookType: hookType as any,
          collectionSlug: this.config.slug,
          data: dataOrId,
          user
        }, timeoutMs)
      } catch (err: any) {
        logger.error({ err: err.message }, 'Isolated hook execution failed or timed out.')
        throw new Error(`[Zenith] Isolated hook failed: ${err.message}`)
      }
    }
    return await hookFn(dataOrId, user, { hookType })
  }

  async find(
    filter: Record<string, unknown> = {},
    options: ContentOperationOptions = {}
  ): Promise<T[]> {
    let query = { ...filter }

    if (options.siteId) {
      query.siteId = options.siteId
    }

    // Apply draft/publish isolation for public queries
    if (this.config.drafts && !options.user && !options.preview) {
      query._status = 'published'
    }

    // Apply RLS (Row Level Security)
    if (options.user && typeof this.config.access?.read === 'function') {
      const access = this.config.access.read(options.user)
      if (access === false) return []
      if (typeof access === 'object') query = { ...query, ...access }
    }

    let docs = await this.adapter.find<T>(this.config.slug, query, options)

    if (!options.skipHooks) {
      if (this.config.hooks?.afterRead) {
        docs = await Promise.all(
          docs.map((doc) => this.executeHook('afterRead', this.config.hooks!.afterRead!, doc, options.user))
        )
      }
      docs = await Promise.all(docs.map((doc) => this.processFields(doc, options, 'afterRead')))
    }

    return docs
  }

  async findById(id: string, options: ContentOperationOptions = {}): Promise<T | null> {
    const query = this.config.singleton && id === 'singleton' ? {} : ({ _id: id } as any)
    if (options.siteId) {
      query.siteId = options.siteId
    }

    // Apply RLS (Row Level Security)
    if (options.user && typeof this.config.access?.read === 'function') {
      const access = this.config.access.read(options.user)
      if (access === false) return null
      if (typeof access === 'object') {
        Object.assign(query, access)
      }
    }

    // Apply draft/publish isolation for public queries
    if (this.config.drafts && !options.user && !options.preview) {
      query._status = 'published'
    }

    let doc = await this.adapter.findOne<T>(this.config.slug, query, options)

    if (!doc) return null

    if (!options.skipHooks) {
      if (this.config.hooks?.afterRead) {
        doc = await this.executeHook('afterRead', this.config.hooks.afterRead, doc, options.user)
      }
      doc = await this.processFields(doc, options, 'afterRead')
    }

    return doc
  }

  async create(data: Partial<T>, options: ContentOperationOptions): Promise<T> {
    const operation = async (session: unknown) => {
      let docData = { ...data }
      const opts = { ...options, session }

      if (!options.skipHooks) {
        if (this.config.hooks?.beforeValidate)
          docData = await this.executeHook('beforeValidate', this.config.hooks.beforeValidate, docData, options.user)
        docData = await this.processFields(docData, options, 'beforeChange')
        if (this.config.hooks?.beforeCreate)
          docData = await this.executeHook('beforeCreate', this.config.hooks.beforeCreate, docData, options.user)
      }

      if (options.siteId) {
        ;(docData as any).siteId = options.siteId
      }

      const createdDoc = await this.adapter.create<T>(this.config.slug, docData, opts)

      if (!options.skipHooks && this.config.hooks?.afterCreate) {
        await this.executeHook('afterCreate', this.config.hooks.afterCreate, createdDoc, options.user)
      }

      if (this.config.versions) {
        await this._createVersion(createdDoc, opts)
      }

      return createdDoc
    }

    const doc = options.session 
      ? await operation(options.session)
      : await this.adapter.transaction(async (session) => await operation(session))

    eventHub
      .emit('content.created', { collection: this.config.slug, document: doc })
      .catch((err) => {
        logger.error({ err }, 'Error emitting content.created event')
      })

    return doc
  }

  async update(
    id: string,
    data: Partial<T>,
    options: ContentOperationOptions
  ): Promise<{ doc: T; delta: unknown }> {
    const result = await this.adapter.transaction(async (session) => {
      const opts = { ...options, session }
      const query = this.config.singleton && id === 'singleton' ? {} : ({ _id: id } as any)
      if (options.siteId) {
        query.siteId = options.siteId
      }

      // Apply RLS (Row Level Security) for updates
      if (options.user && typeof this.config.access?.update === 'function') {
        const access = this.config.access.update(options.user)
        if (access === false) throw new ForbiddenError()
        if (typeof access === 'object') {
          Object.assign(query, access)
        }
      }

      // Check active document locks (Concurrency Control)
      if (options.user) {
        const activeUsers = await PresenceService.getActiveUsers(this.config.slug, id)
        const lockedByOther = activeUsers.some((u) => u.id !== options.user?.id)
        if (lockedByOther && !options.overrideLock) {
          const names = activeUsers.filter((u) => u.id !== options.user?.id).map((u) => u.email).join(', ')
          throw new Error(`[Zenith] Conflict: Document is currently locked for editing by: ${names}`)
        }
      }

      const oldDoc = await this.adapter.findOne(this.config.slug, query, opts)
      if (!oldDoc) throw new NotFoundError(this.config.name, id)

      let updateData = { ...data }

      if (!options.skipHooks) {
        if (this.config.hooks?.beforeValidate)
          updateData = await this.executeHook('beforeValidate', this.config.hooks.beforeValidate, updateData, options.user)
        updateData = await this.processFields(updateData, options, 'beforeChange')
        if (this.config.hooks?.beforeUpdate)
          updateData = await this.executeHook('beforeUpdate', this.config.hooks.beforeUpdate, updateData, options.user)
      }

      const targetId = this.config.singleton && id === 'singleton' ? (oldDoc as any)._id : id
      const doc = await this.adapter.update<T>(this.config.slug, targetId, updateData, opts)
      if (!doc) throw new NotFoundError(this.config.name, id)

      const delta = this._calculateDelta(oldDoc, updateData)

      if (!options.skipHooks && this.config.hooks?.afterUpdate) {
        await this.executeHook('afterUpdate', this.config.hooks.afterUpdate, doc, options.user)
      }

      if (this.config.versions && !options.skipVersioning) {
        await this._createVersion(doc, opts, delta)
      }

      return { doc, delta }
    })

    eventHub
      .emit('content.updated', {
        collection: this.config.slug,
        document: result.doc,
        delta: result.delta,
      })
      .catch((err) => {
        logger.error({ err }, 'Error emitting content.updated event')
      })

    return result
  }

  async delete(id: string, options: ContentOperationOptions): Promise<boolean> {
    if (!options.skipHooks && this.config.hooks?.beforeDelete) {
      await this.executeHook('beforeDelete', this.config.hooks.beforeDelete, id, options.user)
    }

    let targetId = id
    if (this.config.singleton && id === 'singleton') {
      const query = {} as any
      if (options.siteId) query.siteId = options.siteId
      const doc = await this.adapter.findOne(this.config.slug, query, options)
      if (doc) targetId = (doc as any)._id
    } else {
      const query = { _id: id } as any
      if (options.siteId) query.siteId = options.siteId

      // Apply RLS (Row Level Security) for deletes
      if (options.user && typeof this.config.access?.delete === 'function') {
        const access = this.config.access.delete(options.user)
        if (access === false) throw new ForbiddenError()
        if (typeof access === 'object') {
          Object.assign(query, access)
        }
      }

      // Check active document locks (Concurrency Control)
      if (options.user) {
        const activeUsers = await PresenceService.getActiveUsers(this.config.slug, id)
        const lockedByOther = activeUsers.some((u) => u.id !== options.user?.id)
        if (lockedByOther && !options.overrideLock) {
          const names = activeUsers.filter((u) => u.id !== options.user?.id).map((u) => u.email).join(', ')
          throw new Error(`[Zenith] Conflict: Document is currently locked for editing by: ${names}`)
        }
      }

      const doc = await this.adapter.findOne(this.config.slug, query, options)
      if (!doc) throw new NotFoundError(this.config.name, id)
      targetId = (doc as any)._id
    }

    const success = await this.adapter.delete(this.config.slug, targetId, options)
    if (!success) throw new NotFoundError(this.config.name, id)

    if (!options.skipHooks && this.config.hooks?.afterDelete) {
      await this.executeHook('afterDelete', this.config.hooks.afterDelete, id, options.user)
    }

    eventHub
      .emit('content.deleted', { collection: this.config.slug, documentId: id })
      .catch((err) => {
        logger.error({ err }, 'Error emitting content.deleted event')
      })

    return success
  }

  private _calculateDelta(oldDoc: any, newData: any): any {
    const delta: Record<string, any> = {}
    for (const key of Object.keys(newData)) {
      if (JSON.stringify(oldDoc[key]) !== JSON.stringify(newData[key])) {
        delta[key] = { from: oldDoc[key], to: newData[key] }
      }
    }
    return delta
  }

  private async _createVersion(doc: any, options: any, delta?: any) {
    try {
      const isGlobal = this.config.singleton || !doc._id
      await this.adapter.createVersion({
        collectionName: isGlobal ? 'globals' : this.config.name || this.config.slug,
        collectionSlug: isGlobal ? 'globals' : this.config.slug,
        documentId: isGlobal ? this.config.slug : doc._id?.toString() || 'singleton',
        snapshot: doc,
        delta,
        createdBy: options.user?.id || 'system',
        timestamp: new Date(),
      }, { session: options?.session })
    } catch (err) {
      logger.error({ err }, 'Versioning failed')
    }
  }
}
