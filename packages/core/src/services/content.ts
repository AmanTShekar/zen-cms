import { CollectionConfig, FieldConfig } from '@zenith-open/zenithcms-types'
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
import { VersioningService } from './versioning'
import { RLSService } from './rls'

export const sandboxPool = new WorkerSandboxPool()

export interface ContentOperationOptions extends BaseOptions {
  user?: Record<string, unknown>
  locale?: string
  skipHooks?: boolean
  skipVersioning?: boolean
  siteId?: string
  preview?: boolean
  overrideLock?: boolean
  /** For optimistic locking: if provided, update fails with ConflictError when stale */
  expectedVersion?: number
  /** Include soft-deleted documents in query results */
  includeDeleted?: boolean
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
    data: Record<string, unknown>,
    options: ContentOperationOptions,
    action: 'afterRead' | 'beforeChange',
    fields: FieldConfig[] = this.config.fields,
    existingDoc?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!data) return data

    // Ensure we are working with a plain object
    const cleanData = { ...data }

    for (const field of fields) {
      if (((field as Record<string, unknown>).virtual || field.type === 'ui' || field.type === 'row' || field.type === 'join') && action === 'beforeChange') continue

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
      if ((field as Record<string, unknown>).localized && action === 'afterRead' && options.locale) {
        const val = cleanData[field.name]
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          cleanData[field.name] = i18n.getLocalizedValue(val, options.locale)
        }
      }

      // beforeChange: merge the incoming value into the existing locale map so other
      // translations are preserved (e.g. POST ?locale=fr only updates the 'fr' key)
      if ((field as Record<string, unknown>).localized && action === 'beforeChange' && options.locale) {
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
          cleanData[field.name].map((item: Record<string, unknown>, idx: number) =>
            this.processFields(item, options, action, field.fields, existingArr[idx])
          )
        )
      } else if (field.type === 'blocks' && Array.isArray(cleanData[field.name])) {
        const existingBlocks = Array.isArray(existingDoc?.[field.name]) ? existingDoc[field.name] : []
        cleanData[field.name] = await Promise.all(
          cleanData[field.name].map((block: Record<string, unknown>, idx: number) => {
            const blockDef = (field.blocks || []).find((b: Record<string, unknown>) => b.slug === block.blockType)
            return blockDef ? this.processFields(block, options, action, blockDef.fields, existingBlocks[idx]) : block
          })
        )
      }

      // 3. Apply field-level hook
      const hookFn = (field as Record<string, unknown>).hooks?.[action]
      if (hookFn && cleanData[field.name] !== undefined) {
        try {
          cleanData[field.name] = await hookFn(cleanData[field.name])
        } catch (err: unknown) {
          logger.warn({ field: field.name, err: err.message }, 'Field hook failed')
        }
      }

      // 4. Field-level Access Control (RBAC)
      if ((field as Record<string, unknown>).access && options.user) {
        if (action === 'afterRead' && typeof (field as Record<string, unknown>).access.read === 'function') {
          if (!(field as Record<string, unknown>).access.read(options.user)) {
            // Strip the field out if user cannot read it
            delete cleanData[field.name]
          }
        }
        
        if (action === 'beforeChange') {
          const isCreating = !existingDoc
          if (isCreating && typeof (field as Record<string, unknown>).access.create === 'function') {
            if (!(field as Record<string, unknown>).access.create(options.user)) {
              delete cleanData[field.name] // Strip unauthorized create payload
            }
          } else if (!isCreating && typeof (field as Record<string, unknown>).access.update === 'function') {
            if (!(field as Record<string, unknown>).access.update(options.user)) {
              delete cleanData[field.name] // Strip unauthorized update payload
            }
          }
        }
      }
    }

    return cleanData
  }

  private async executeHook(
    hookType: 'beforeValidate' | 'beforeCreate' | 'afterCreate' | 'afterRead' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete',
    hookFn: (...args: Record<string, unknown>[]) => unknown,
    dataOrId: Record<string, unknown>,
    user: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const isIsolated = (this.config.hooks as Record<string, unknown>)?.[`${hookType}_isolated`] === true
    if (isIsolated) {
      try {
        const timeoutMs = Number((this.config.hooks as Record<string, unknown>)?.[`${hookType}_timeout`]) || 500
        return await sandboxPool.runTask({
          hookType: hookType as Record<string, unknown>,
          collectionSlug: this.config.slug,
          data: dataOrId,
          user
        }, timeoutMs)
      } catch (err: unknown) {
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
    if (!options.siteId && !this.config.singleton) {
      throw new Error('[Zenith] Security: siteId must be provided for tenant-scoped operations')
    }

    const query = { ...filter }

    if (options.siteId) {
      query.siteId = options.siteId
    }

    // Apply draft/publish isolation for public queries
    if (this.config.drafts && !options.user && !options.preview) {
      query._status = 'published'
    }

    // Filter out soft-deleted items by default
    if (this.config.softDelete && !options.includeDeleted) {
      query.deletedAt = null
    }

    // Apply RLS (Row Level Security)
    if (!RLSService.applyReadAccess(query, this.config.access, options.user)) return []

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
    if (!options.siteId && !this.config.singleton) {
      throw new Error('[Zenith] Security: siteId must be provided for tenant-scoped operations')
    }

    const query = this.config.singleton && id === 'singleton' ? {} : ({ _id: id } as Record<string, unknown>)
    if (options.siteId) {
      query.siteId = options.siteId
    }

    // Apply RLS (Row Level Security)
    if (!RLSService.applyReadAccess(query, this.config.access, options.user)) return null

    // Apply draft/publish isolation for public queries
    if (this.config.drafts && !options.user && !options.preview) {
      query._status = 'published'
    }

    // Filter out soft-deleted items by default
    if (this.config.softDelete && !options.includeDeleted) {
      query.deletedAt = null
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

      if (!options.siteId && !this.config.singleton) {
        throw new Error('[Zenith] Security: siteId must be provided for tenant-scoped operations')
      }

      if (options.siteId) {
        ;(docData as Record<string, unknown>).siteId = options.siteId
      }
      // Initialize _version for optimistic locking
      ;(docData as Record<string, unknown>)._version = 1

      const createdDoc = await this.adapter.create<T>(this.config.slug, docData, opts)

      if (!options.skipHooks && this.config.hooks?.afterCreate) {
        await this.executeHook('afterCreate', this.config.hooks.afterCreate, createdDoc, options.user)
      }
      // Plugin side-effect hooks (indexing, search, webhooks, etc.)
      await hookRegistry.emit(`content:${this.config.slug}:afterCreate`, createdDoc)

      if (this.config.versions) {
        await new VersioningService(this.adapter, this.config).createVersion(createdDoc, opts)
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
      if (!options.siteId && !this.config.singleton) {
        throw new Error('[Zenith] Security: siteId must be provided for tenant-scoped operations')
      }

      const query = this.config.singleton && id === 'singleton' ? {} : ({ _id: id } as Record<string, unknown>)
      if (options.siteId) {
        query.siteId = options.siteId
      }

      // Apply RLS (Row Level Security) for updates
      RLSService.applyUpdateAccess(query, this.config.access, options.user, (options as Record<string, unknown>).req)

      // Check active document locks (Concurrency Control)
      if (options.user) {
        const activeUsers = await PresenceService.getActiveUsers(this.config.slug, id)
        const lockedByOther = activeUsers.some((u) => u.id !== options.user?.id)
        if (lockedByOther && !options.overrideLock) {
          const names = activeUsers.filter((u) => u.id !== options.user?.id).map((u) => u.email).join(', ')
          throw new Error(`[Zenith] Conflict: Document is currently locked for editing by: ${names}`)
        }
      }

      let oldDoc = await this.adapter.findOne(this.config.slug, query, opts)
      if (!oldDoc) {
        if (this.config.singleton) {
          oldDoc = await this.adapter.create(this.config.slug, { ...query, ...data, _status: 'published' }, opts)
        } else {
          throw new NotFoundError(this.config.name, id)
        }
      }

      // Optimistic locking: reject stale saves
      if (options.expectedVersion !== undefined) {
        const currentVersion = (oldDoc as Record<string, unknown>)._version
        if (currentVersion !== undefined && currentVersion !== options.expectedVersion) {
          throw new ConflictError(
            `Document was modified by another user (expected version ${options.expectedVersion}, current ${currentVersion}). Please reload and try again.`
          )
        }
      }

      // Task 05: Auto-validate workflow transitions when workflowStatus changes
      const incomingWorkflowStatus = (data as Record<string, unknown>)?.workflowStatus
      const currentWorkflowStatus = (oldDoc as Record<string, unknown>)?.workflowStatus || 'draft'
      if (incomingWorkflowStatus && incomingWorkflowStatus !== currentWorkflowStatus) {
        const userRole = roleFromString((options.user as Record<string, unknown>)?.role)
        const result = canTransition(currentWorkflowStatus, incomingWorkflowStatus, userRole)
        if (!result.valid) {
          throw new Error(`[Zenith] Workflow transition rejected: ${result.reason}`)
        }
        logger.info(
          { from: currentWorkflowStatus, to: incomingWorkflowStatus, user: (options.user as Record<string, unknown>)?.email },
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

      const targetId = this.config.singleton && id === 'singleton' ? (oldDoc as Record<string, unknown>)._id : id
      // Increment _version on every save (optimistic locking document version tracker)
      const newVersion = ((oldDoc as Record<string, unknown>)._version || 0) + 1
      const doc = await this.adapter.update<T>(this.config.slug, targetId, { ...updateData, _version: newVersion }, opts)
      if (!doc) throw new NotFoundError(this.config.name, id)

      const delta = this._calculateDelta(oldDoc, updateData)

      if (!options.skipHooks && this.config.hooks?.afterUpdate) {
        await this.executeHook('afterUpdate', this.config.hooks.afterUpdate, doc, options.user)
      }
      // Plugin side-effect hooks (indexing, search, webhooks, etc.)
      await hookRegistry.emit(`content:${this.config.slug}:afterUpdate`, { doc, delta, collection: this.config.slug })

      if (this.config.versions && !options.skipVersioning) {
        await new VersioningService(this.adapter, this.config).createVersion(doc, opts, delta)
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
    if (!options.siteId && !this.config.singleton) {
      throw new Error('[Zenith] Security: siteId must be provided for tenant-scoped operations')
    }

    if (this.config.singleton && id === 'singleton') {
      const query = {} as Record<string, unknown>
      if (options.siteId) query.siteId = options.siteId
      const doc = await this.adapter.findOne(this.config.slug, query, options)
      if (doc) targetId = (doc as Record<string, unknown>)._id
    } else {
      const query = { _id: id } as Record<string, unknown>
      if (options.siteId) query.siteId = options.siteId

      // Apply RLS (Row Level Security) for deletes
      RLSService.applyDeleteAccess(query, this.config.access, options.user, (options as Record<string, unknown>).req)

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
      targetId = (doc as Record<string, unknown>)._id
    }

    let success = false
    if (this.config.softDelete && !options.includeDeleted) {
      // Perform soft delete by updating deletedAt
      const doc = await this.adapter.update(this.config.slug, targetId, { deletedAt: new Date() }, options)
      success = !!doc
    } else {
      success = await this.adapter.delete(this.config.slug, targetId, options)
    }

    if (!success) throw new NotFoundError(this.config.name, id)

    if (!options.skipHooks && this.config.hooks?.afterDelete) {
      await this.executeHook('afterDelete', this.config.hooks.afterDelete, id, options.user)
    }
    // Plugin side-effect hooks (cleanup, search deindex, etc.)
    if (!options.skipHooks) {
      await hookRegistry.emit(`content:${this.config.slug}:afterDelete`, { id, collection: this.config.slug })
    }

    eventHub
      .emit('content.deleted', { collection: this.config.slug, documentId: id, siteId: options.siteId })
      .catch((err) => {
        logger.error({ err }, 'Error emitting content.deleted event')
      })

    return success
  }

  private _calculateDelta(oldDoc: Record<string, unknown>, newData: Record<string, unknown>): unknown {
    const delta: Record<string, unknown> = {}
    for (const key of Object.keys(newData)) {
      if (JSON.stringify(oldDoc[key]) !== JSON.stringify(newData[key])) {
        delta[key] = { from: oldDoc[key], to: newData[key] }
      }
    }
    return delta
  }

  
}
