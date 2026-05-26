import { CollectionConfig, FieldConfig } from '@zenithcms/types'
import { logger } from './logger'
import { DatabaseAdapter, BaseOptions } from '../database/adapters/BaseAdapter'
import { NotFoundError, ForbiddenError, ConflictError } from '../errors'
import { eventHub } from './event-hub'
import { sanitizeHtml } from '../utils'
import { WorkerSandboxPool } from '../sandbox/worker-pool'
import { i18n } from '../i18n'
import { PresenceService } from './presence'
import { canTransition, roleFromString } from './workflow-engine'
import { hookRegistry } from '../plugins/hooks'

export const sandboxPool = new WorkerSandboxPool()

export interface ContentOperationOptions extends BaseOptions {
  user?: any
  locale?: string
  skipHooks?: boolean
  skipVersioning?: boolean
  siteId?: string
  preview?: boolean
  overrideLock?: boolean
  /** For optimistic locking: if provided, update fails with ConflictError when stale */
  expectedVersion?: number
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
    fields: FieldConfig[] = this.config.fields,
    existingDoc?: any
  ): Promise<any> {
    if (!data) return data

    // Ensure we are working with a plain object
    const cleanData = { ...data }

    for (const field of fields) {
      if (((field as any).virtual || field.type === 'ui' || field.type === 'row' || field.type === 'join') && action === 'beforeChange') continue

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

      // 1. Handle Localization
      // afterRead: flatten the locale map to the requested locale before returning
      if ((field as any).localized && action === 'afterRead' && options.locale) {
        const val = cleanData[field.name]
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          cleanData[field.name] = i18n.getLocalizedValue(val, options.locale)
        }
      }

      // beforeChange: merge the incoming value into the existing locale map so other
      // translations are preserved (e.g. POST ?locale=fr only updates the 'fr' key)
      if ((field as any).localized && action === 'beforeChange' && options.locale) {
        const incomingVal = cleanData[field.name]
        if (incomingVal !== undefined && incomingVal !== null) {
          // Only wrap if the incoming value is not already a locale map
          const isAlreadyMap =
            typeof incomingVal === 'object' &&
            !Array.isArray(incomingVal) &&
            Object.keys(incomingVal).some((k) => /^[a-z]{2,3}(-[A-Z]{2,}|-[a-zA-Z]{2,})?$/.test(k))
          if (!isAlreadyMap) {
            // Read the existing locale map from the stored document so we don't
            // destroy translations for other locales when saving a single one.
            const existingLocaleMap = existingDoc?.[field.name]
            cleanData[field.name] = i18n.setLocaleValue(
              existingLocaleMap,
              options.locale,
              incomingVal
            )
          }
        }
      }

      // 2. Handle nested structures (thread existing sub-doc for locale merging)
      if ((field.type === 'group' || field.type === 'collapsible') && cleanData[field.name]) {
        cleanData[field.name] = await this.processFields(
          cleanData[field.name],
          options,
          action,
          field.fields,
          existingDoc?.[field.name]
        )
      } else if (field.type === 'array' && Array.isArray(cleanData[field.name])) {
        const existingArr = Array.isArray(existingDoc?.[field.name]) ? existingDoc[field.name] : []
        cleanData[field.name] = await Promise.all(
          cleanData[field.name].map((item: any, idx: number) =>
            this.processFields(item, options, action, field.fields, existingArr[idx])
          )
        )
      } else if (field.type === 'blocks' && Array.isArray(cleanData[field.name])) {
        const existingBlocks = Array.isArray(existingDoc?.[field.name]) ? existingDoc[field.name] : []
        cleanData[field.name] = await Promise.all(
          cleanData[field.name].map((block: any, idx: number) => {
            const blockDef = field.blocks.find((b) => b.slug === block.blockType)
            return blockDef ? this.processFields(block, options, action, blockDef.fields, existingBlocks[idx]) : block
          })
        )
      }

      // 3. Apply field-level hook
      const hookFn = (field as any).hooks?.[action]
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
      // Plugin side-effect hooks (indexing, search, notifications, etc.)
      await hookRegistry.emit(`content:${this.config.slug}:afterRead`, docs)
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
      // Plugin side-effect hooks
      await hookRegistry.emit(`content:${this.config.slug}:afterRead`, doc)
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
        // Plugin pipeline hooks — let plugins transform data before validation
        docData = await hookRegistry.apply(`content:${this.config.slug}:beforeValidate`, docData)
        docData = await this.processFields(docData, options, 'beforeChange')
        if (this.config.hooks?.beforeCreate)
          docData = await this.executeHook('beforeCreate', this.config.hooks.beforeCreate, docData, options.user)
        // Plugin pipeline hooks — let plugins transform data before creation
        docData = await hookRegistry.apply(`content:${this.config.slug}:beforeCreate`, docData)
      }

      if (options.siteId) {
        ;(docData as any).siteId = options.siteId
      }
      // Initialize _version for optimistic locking
      ;(docData as any)._version = 1

      const createdDoc = await this.adapter.create<T>(this.config.slug, docData, opts)

      if (!options.skipHooks && this.config.hooks?.afterCreate) {
        await this.executeHook('afterCreate', this.config.hooks.afterCreate, createdDoc, options.user)
      }
      // Plugin side-effect hooks (indexing, search, webhooks, etc.)
      await hookRegistry.emit(`content:${this.config.slug}:afterCreate`, createdDoc)

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
      // access.update() may return a boolean (allow/deny) OR an object (query constraints)
      // that restricts which documents the user may write to — same pattern as read RLS.
      if (options.user && typeof this.config.access?.update === 'function') {
        const access = this.config.access.update(options.user, { req: (options as any).req })
        if (access === false) throw new ForbiddenError()
        if (typeof access === 'object' && access !== null) {
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

      // Optimistic locking: reject stale saves
      if (options.expectedVersion !== undefined) {
        const currentVersion = (oldDoc as any)._version
        if (currentVersion !== undefined && currentVersion !== options.expectedVersion) {
          throw new ConflictError(
            `Document was modified by another user (expected version ${options.expectedVersion}, current ${currentVersion}). Please reload and try again.`
          )
        }
      }

      // Task 05: Auto-validate workflow transitions when workflowStatus changes
      const incomingWorkflowStatus = (data as any)?.workflowStatus
      const currentWorkflowStatus = (oldDoc as any)?.workflowStatus || 'draft'
      if (incomingWorkflowStatus && incomingWorkflowStatus !== currentWorkflowStatus) {
        const userRole = roleFromString((options.user as any)?.role)
        const result = canTransition(currentWorkflowStatus, incomingWorkflowStatus, userRole)
        if (!result.valid) {
          throw new Error(`[Zenith] Workflow transition rejected: ${result.reason}`)
        }
        logger.info(
          { from: currentWorkflowStatus, to: incomingWorkflowStatus, user: (options.user as any)?.email },
          'Workflow transition validated'
        )
      }

      let updateData = { ...data }

      if (!options.skipHooks) {
        if (this.config.hooks?.beforeValidate)
          updateData = await this.executeHook('beforeValidate', this.config.hooks.beforeValidate, updateData, options.user)
        // Plugin pipeline hooks — let plugins transform data before validation
        updateData = await hookRegistry.apply(`content:${this.config.slug}:beforeValidate`, updateData)
        updateData = await this.processFields(updateData, options, 'beforeChange', this.config.fields, oldDoc)
        if (this.config.hooks?.beforeUpdate)
          updateData = await this.executeHook('beforeUpdate', this.config.hooks.beforeUpdate, updateData, options.user)
        // Plugin pipeline hooks — let plugins transform data before update
        updateData = await hookRegistry.apply(`content:${this.config.slug}:beforeUpdate`, updateData)
      }

      const targetId = this.config.singleton && id === 'singleton' ? (oldDoc as any)._id : id
      // Increment _version on every save (optimistic locking document version tracker)
      const newVersion = ((oldDoc as any)._version || 0) + 1
      const doc = await this.adapter.update<T>(this.config.slug, targetId, { ...updateData, _version: newVersion }, opts)
      if (!doc) throw new NotFoundError(this.config.name, id)

      const delta = this._calculateDelta(oldDoc, updateData)

      if (!options.skipHooks && this.config.hooks?.afterUpdate) {
        await this.executeHook('afterUpdate', this.config.hooks.afterUpdate, doc, options.user)
      }
      // Plugin side-effect hooks (indexing, search, webhooks, etc.)
      await hookRegistry.emit(`content:${this.config.slug}:afterUpdate`, { doc, delta, collection: this.config.slug })

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
    // Plugin pipeline hooks — let plugins inspect/modify the delete target
    if (!options.skipHooks) {
      await hookRegistry.emit(`content:${this.config.slug}:beforeDelete`, { id, collection: this.config.slug, user: options.user })
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
      // access.delete() may return a boolean OR an object of query constraints
      // so users can only delete their own documents (e.g. { createdBy: user.id }).
      if (options.user && typeof this.config.access?.delete === 'function') {
        const access = this.config.access.delete(options.user, { req: (options as any).req })
        if (access === false) throw new ForbiddenError()
        if (typeof access === 'object' && access !== null) {
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
    // Plugin side-effect hooks (cleanup, search deindex, etc.)
    if (!options.skipHooks) {
      await hookRegistry.emit(`content:${this.config.slug}:afterDelete`, { id, collection: this.config.slug })
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
      const documentId = isGlobal ? this.config.slug : doc._id?.toString() || 'singleton'
      await this.adapter.createVersion({
        collectionName: isGlobal ? 'globals' : this.config.name || this.config.slug,
        collectionSlug: isGlobal ? 'globals' : this.config.slug,
        documentId,
        snapshot: doc,
        delta,
        createdBy: options.user?.id || 'system',
        timestamp: new Date(),
      }, { session: options?.session })

      // Prune old versions beyond the max limit (default 50)
      const maxVersions = this.config.maxVersions ?? 50
      await this._enforceMaxVersions(documentId, maxVersions)
    } catch (err) {
      logger.error({ err }, 'Versioning failed')
    }
  }

  /**
   * Prunes oldest versions beyond `maxVersions` for a given document.
   * Keeps the most recent N versions and deletes the rest.
   */
  private async _enforceMaxVersions(documentId: string, maxVersions: number): Promise<void> {
    try {
      const allVersions = await this.adapter.getVersions(this.config.slug, documentId)
      if (allVersions.length <= maxVersions) return

      const toDelete = allVersions
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(maxVersions)

      for (const version of toDelete) {
        const vid = (version as any)._id?.toString() || (version as any).id
        if (vid) await this.adapter.delete('versions', vid)
      }
    } catch (err) {
      logger.warn({ err, collection: this.config.slug, documentId }, 'Version pruning failed')
    }
  }
}
