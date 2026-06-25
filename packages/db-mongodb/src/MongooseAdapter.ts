import mongoose, { Model } from 'mongoose'
import { CollectionConfig, DatabaseAdapter, FindOptions, BaseOptions, AuditLogData, VersionData, WebhookDeliveryData, WebhookDeliveryRecord } from '@zenith-open/zenithcms-types'
import { getModelForCollection } from './model-factory'
import NodeCache from 'node-cache'
import Redis from 'ioredis'
import pino from 'pino'

const logger = pino()

// Hard ceiling on query result size to prevent memory exhaustion / DoS
const MAX_QUERY_LIMIT = 500
const DEFAULT_QUERY_LIMIT = 100

export interface CacheLayer {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, collection: string): Promise<void>
  invalidate(collection: string): Promise<void>
}

export class LocalCacheLayer implements CacheLayer {
  private cache: NodeCache
  constructor() {
    this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 })
  }
  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key)
  }
  async set<T>(key: string, value: T, collection: string): Promise<void> {
    this.cache.set(key, value)
  }
  async invalidate(collection: string): Promise<void> {
    const keys = this.cache.keys()
    const targets = keys.filter((k) => k.startsWith(`${collection}:`))
    this.cache.del(targets)
  }
}

export class RedisCacheLayer implements CacheLayer {
  private redis: Redis
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    })
    logger.info('MongooseAdapter: Redis_Cache_Layer Initialized')
  }
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const data = await this.redis.get(key)
      return data ? JSON.parse(data) : undefined
    } catch (error: any) {
      logger.warn({ error: error.message }, 'RedisCacheLayer: Get failed')
      return undefined
    }
  }
  async set<T>(key: string, value: T, collection: string): Promise<void> {
    try {
      const setKey = `zenith:cache:collection:${collection}`
      await this.redis.setex(key, 60, JSON.stringify(value))
      await this.redis.sadd(setKey, key)
      await this.redis.expire(setKey, 120)
    } catch (error: any) {
      logger.warn({ error: error.message }, 'RedisCacheLayer: Set failed')
    }
  }
  async invalidate(collection: string): Promise<void> {
    try {
      const setKey = `zenith:cache:collection:${collection}`
      const keys = await this.redis.smembers(setKey)
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
      await this.redis.del(setKey)
    } catch (error: any) {
      logger.warn({ error: error.message }, 'RedisCacheLayer: Invalidate failed')
    }
  }
}

/**
 * Mongoose Database Adapter — Hardened Edition
 * ──────────────────────────────────────────
 * High-performance implementation for MongoDB.
 * Features: Neural Cache Layer, automatic session management, and health monitoring.
 */
export class MongooseAdapter implements DatabaseAdapter {
  name = 'mongoose'
  private models: Record<string, Model<unknown>> = {}
  private cache: CacheLayer

  private consecutiveFailures = 0;
  private circuitBreakerCooldown = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 10;
  private readonly CIRCUIT_BREAKER_RESET_TIMEOUT_MS = 15000;

  private async _withCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
    if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      if (Date.now() < this.circuitBreakerCooldown) {
        throw new Error('Database Circuit Breaker Open: Too many consecutive failures. Rejecting request to prevent cascade overload.');
      } else {
        // Half-open state
        this.consecutiveFailures = this.CIRCUIT_BREAKER_THRESHOLD - 1;
      }
    }
    try {
      const result = await operation();
      this.consecutiveFailures = 0; // reset
      return result;
    } catch (err: any) {
      this.consecutiveFailures++;
      if (this.consecutiveFailures === this.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreakerCooldown = Date.now() + this.CIRCUIT_BREAKER_RESET_TIMEOUT_MS;
        logger.error(`[MongooseAdapter] Circuit Breaker TRIPPED. DB operations suspended for ${this.CIRCUIT_BREAKER_RESET_TIMEOUT_MS}ms`);
      }
      throw err;
    }
  }

  constructor(private uri: string) {
    const redisUrl = process.env.REDIS_URL
    if (redisUrl) {
      this.cache = new RedisCacheLayer(redisUrl)
    } else {
      this.cache = new LocalCacheLayer()
      logger.warn('MongooseAdapter: Local_Cache_Layer Initialized (Warning: Cache desync risk under horizontal scaling)')
    }
    logger.info('MongooseAdapter: Neural_Cache_Layer Initialized')
  }

  getNativeClient<T = any>(): T {
    return mongoose.connection as unknown as T
  }

  async connect(): Promise<void> {
    try {
      const poolMax = parseInt(process.env.DB_POOL_SIZE || '10', 10)
      await mongoose.connect(this.uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: poolMax,
        autoIndex: process.env.ZENITH_AUTO_MIGRATE !== 'false',
      })
      logger.info('MongooseAdapter: Connected to MongoDB')
      this._initSystemModels()
    } catch (error: any) {
      logger.error({ error: error.message }, 'MongooseAdapter: Connection failed')
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect()
    logger.info('MongooseAdapter: Disconnected')
  }

  getHealth(): 'ok' | 'connecting' | 'disconnected' | 'error' {
    const state = mongoose.connection.readyState
    switch (state) {
      case 0:
        return 'disconnected'
      case 1:
        return 'ok'
      case 2:
        return 'connecting'
      case 3:
        return 'disconnected'
      default:
        return 'error'
    }
  }

  private _initSystemModels() {
    // Ensure system models are indexed for performance
    if (!mongoose.models['AuditLog']) {
      const schema = new mongoose.Schema(
        {
          timestamp: { type: Date, default: Date.now, index: true },
          collectionName: { type: String, index: true },
          documentId: { type: String, index: true },
          userId: { type: String, index: true },
          userEmail: { type: String },
          userName: { type: String },
          action: { type: String, index: true },
          changes: { type: mongoose.Schema.Types.Mixed },
          ip: { type: String },
          userAgent: { type: String },
          status: { type: String, index: true },
          resource: { type: String },
          siteId: { type: String, index: true },
          hash: { type: String },
          previousHash: { type: String },
        },
        { strict: false }
      )
      schema.index({ siteId: 1, timestamp: -1 })
      schema.index({ action: 1, timestamp: -1 })
      mongoose.model('AuditLog', schema)
    }
    if (!mongoose.models['Version']) {
      const schema = new mongoose.Schema(
        {
          timestamp: { type: Date, default: Date.now, index: true },
          collectionSlug: { type: String, index: true },
          documentId: { type: String, index: true },
        },
        { strict: false }
      )
      mongoose.model('Version', schema)
    }
    if (!mongoose.models['flows']) {
      const schema = new mongoose.Schema(
        {
          name: { type: String, required: true },
          description: { type: String },
          active: { type: Boolean, default: false },
          trigger: { type: mongoose.Schema.Types.Mixed, default: {} },
          steps: { type: mongoose.Schema.Types.Mixed, default: [] },
        },
        { timestamps: true, strict: false }
      )
      mongoose.model('flows', schema)
    }
    if (!mongoose.models['z_migrations']) {
      const schema = new mongoose.Schema(
        {
          name: { type: String, required: true, unique: true, index: true },
          batch: { type: Number, required: true },
          executedAt: { type: Date, default: Date.now },
        },
        { strict: true }
      )
      mongoose.model('z_migrations', schema)
    }
    if (!mongoose.models['z_collections']) {
      const schema = new mongoose.Schema(
        {
          name: { type: String, required: true },
          slug: { type: String, required: true, unique: true, index: true },
          labels: { singular: { type: String }, plural: { type: String } },
          drafts: { type: Boolean, default: false },
          timestamps: { type: Boolean, default: true },
          fields: { type: mongoose.Schema.Types.Mixed, default: [] },
        },
        { timestamps: true, strict: false }
      )
      mongoose.model('z_collections', schema)
    }
    if (!mongoose.models['z_components']) {
      const schema = new mongoose.Schema(
        {
          slug: { type: String, required: true, unique: true, index: true },
          displayName: { type: String, required: true },
          category: { type: String, default: 'General' },
          icon: { type: String, default: 'Box' },
          description: { type: String },
          fields: { type: mongoose.Schema.Types.Mixed, default: [] },
        },
        { timestamps: true, strict: false }
      )
      mongoose.model('z_components', schema)
    }
    if (!mongoose.models['z_presence']) {
      const schema = new mongoose.Schema(
        {
          userId: { type: String, required: true },
          email: { type: String, required: true },
          collectionName: { type: String, required: true },
          documentId: { type: String, required: true },
          lastActive: { type: Number, required: true },
        },
        { timestamps: false, strict: true, collection: 'z_presence' }
      )
      mongoose.model('z_presence', schema)
    }
    if (!mongoose.models['Lock']) {
      const schema = new mongoose.Schema(
        {
          collectionName: { type: String, required: true, index: true },
          documentId: { type: String, required: true, index: true },
          siteId: { type: String, index: true },
          lockedBy: { type: String, required: true },
          lockedByEmail: { type: String, required: true },
          lockedAt: { type: Date, default: Date.now },
          lockExpiresAt: { type: Date, required: true },
        },
        { collection: 'z_locks', timestamps: false }
      )
      schema.index({ collectionName: 1, documentId: 1, siteId: 1 }, { unique: true })
      mongoose.model('Lock', schema)
    }
  }

  async registerCollection(config: CollectionConfig): Promise<void> {
    console.log(`[MongooseAdapter] Registering collection: ${config.slug}`)
    const model = getModelForCollection(config)
    console.log(`[MongooseAdapter] Successfully registered model: ${model.modelName}`)
    this.models[config.slug] = model
  }

  async getExistingCollections(): Promise<string[]> {
    const db = mongoose.connection.db
    if (!db) return []
    const collections = await db.listCollections().toArray()
    return collections.map((c) => c.name)
  }

  private getModel(collection: string): Model<unknown> {
    if (collection === 'flows') return mongoose.models['flows']
    
    let resolvedCollection = collection
    if (collection === 'users') resolvedCollection = 'User'
    if (collection === 'z_sites' || collection === 'sites') resolvedCollection = 'Site'
    if (collection === 'z_workspaces' || collection === 'workspaces') resolvedCollection = 'Workspace'
    if (collection === 'z_password_resets') resolvedCollection = 'z_password_resets'
    if (collection === 'z_api_keys') resolvedCollection = 'z_api_keys'
    if (collection === 'z_migrations') resolvedCollection = 'z_migrations'
    if (collection === 'z_collections') resolvedCollection = 'z_collections'
    if (collection === 'z_components') resolvedCollection = 'z_components'
    if (collection === 'z_presence') resolvedCollection = 'z_presence'
    if (collection === 'z_locks' || collection === 'locks') resolvedCollection = 'Lock'
    if (collection === 'z_webhook_configs') resolvedCollection = 'WebhookConfig'
    if (collection === 'z_plugins') resolvedCollection = 'Plugin'
    if (collection === 'audit_logs' || collection === 'z_audit_logs') resolvedCollection = 'AuditLog'
    if (collection === 'versions' || collection === 'z_versions') resolvedCollection = 'Version'
    if (collection === 'comments') resolvedCollection = 'Comment'

    const model = this.models[resolvedCollection] || mongoose.models[resolvedCollection]
    if (!model) throw new Error(`Collection "${collection}" not registered`)
    return model
  }

  private _getCacheKey(method: string, collection: string, query: unknown, options: unknown): string {
    const sortObject = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj.map(sortObject)
      return Object.keys(obj).sort().reduce((acc: any, key: string) => {
        acc[key] = sortObject(obj[key])
        return acc
      }, {})
    }
    const siteId = (options as any)?.siteId || (options as any)?.tenantId || (globalThis as any).zenithAls?.getStore()?.siteId
    const enrichedQuery = siteId ? { ...(query as Record<string, unknown>), siteId } : query
    return `${method}:${collection}:${JSON.stringify(sortObject(enrichedQuery))}:${JSON.stringify(sortObject(options))}`
  }

  async find<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    options: FindOptions = {}
  ): Promise<T[]> {
    return this._withCircuitBreaker(async () => {
      const cacheKey = this._getCacheKey('find', collection, query, options)
      const cached = await this.cache.get<T[]>(cacheKey)
      if (cached) return cached

      const globalAot = (globalThis as any).zenithAotBridge
      if (globalAot && globalAot.hasQuery(collection, 'find')) {
        const model = this.getModel(collection)
        const docs = await globalAot.executeQuery(collection, 'find', mongoose.connection.db, model, this._normalizeQuery(query, options), options)
        await this.cache.set(cacheKey, docs, collection)
        return docs
      }

      const model = this.getModel(collection)
      const normalizedQuery = this._normalizeQuery(query, options);
      console.log(`[DEBUG] MongooseAdapter.find(${collection}):`, JSON.stringify(normalizedQuery))
      const q = model.find(normalizedQuery).maxTimeMS(30000)

      if (options.select) q.select(options.select)
      if (options.populate) {
        const populateArr = Array.isArray(options.populate) ? options.populate : [options.populate]
        populateArr.forEach((p: any) => q.populate(p))
      }

      const requestedLimit = options.limit ?? DEFAULT_QUERY_LIMIT
      const limit = Math.min(requestedLimit, MAX_QUERY_LIMIT)
      const docs = (await q
        .sort((options.sort as any) || { createdAt: -1 })
        .skip(options.skip || 0)
        .limit(limit)
        .session(options.session as any)
        .lean()
        .exec()) as T[]

      await this.cache.set(cacheKey, docs, collection)
      return docs
    })
  }

  async findOne<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    options: FindOptions = {}
  ): Promise<T | null> {
    return this._withCircuitBreaker(async () => {
      const cacheKey = this._getCacheKey('findOne', collection, query, options)
      const cached = await this.cache.get<T>(cacheKey)
      if (cached) return cached

      const model = this.getModel(collection)
      const q = model.findOne(this._normalizeQuery(query, options)).maxTimeMS(30000)

      if (options.select) q.select(options.select)
      if (options.populate) {
        const populateArr = Array.isArray(options.populate) ? options.populate : [options.populate]
        populateArr.forEach((p: any) => q.populate(p))
      }

      const doc = (await q
        .session(options.session as any)
        .lean()
        .exec()) as T | null
      if (doc) await this.cache.set(cacheKey, doc, collection)
      return doc
    })
  }

  private async _invalidateCache(collection: string) {
    await this.cache.invalidate(collection)
  }

  async create<T = unknown>(
    collection: string,
    data: Partial<T>,
    options: BaseOptions = {}
  ): Promise<T> {
    return this._withCircuitBreaker(async () => {
      // Inject tenant scoping into created documents
      const siteId = options?.siteId || options?.tenantId || (globalThis as any).zenithAls?.getStore()?.siteId
      const enrichedData = siteId && !(data as any).siteId
        ? { ...data, siteId }
        : data

      const globalAot = (globalThis as any).zenithAotBridge
      if (globalAot && globalAot.hasQuery(collection, 'create')) {
        const model = this.getModel(collection)
        const doc = await globalAot.executeQuery(collection, 'create', mongoose.connection.db, model, enrichedData, options)
        await this._invalidateCache(collection)
        return doc as T
      }

      const model = this.getModel(collection)
      const [doc] = await model.create([enrichedData] as any, { session: options.session as any })
      await this._invalidateCache(collection)
      return doc.toObject() as T
    })
  }

  async update<T = unknown>(
    collection: string,
    id: string,
    data: Partial<T>,
    options: BaseOptions = {}
  ): Promise<T | null> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      const siteId = options?.siteId || options?.tenantId || (globalThis as any).zenithAls?.getStore()?.siteId
      const filter: Record<string, unknown> = { _id: id }
      if (siteId) filter.siteId = siteId
      // Atomic optimistic locking: include expected _version in the filter
      if (options.expectedVersion !== undefined) {
        filter._version = options.expectedVersion
      }
      const doc = await model
        .findOneAndUpdate(
          filter,
          { $set: data },
          {
            new: true,
            session: options.session as any,
            runValidators: true,
          }
        )
        .maxTimeMS(30000)
        .lean()
        .exec()
      await this._invalidateCache(collection)
      return doc as T | null
    })
  }

  private _normalizeQuery(query: Record<string, unknown>, options?: BaseOptions): Record<string, unknown> {
    const normalized = { ...query }
    if ('id' in normalized) {
      normalized._id = normalized.id
      delete normalized.id
    }
    // Inject tenant scoping from options to prevent cross-tenant data access
    const siteId = options?.siteId || options?.tenantId || (globalThis as any).zenithAls?.getStore()?.siteId
    if (siteId && siteId !== 'global' && !normalized.siteId) {
      normalized.siteId = siteId
    }
    return normalized
  }

  async findOneAndUpdate<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: BaseOptions & { returnDocument?: 'before' | 'after' }
  ): Promise<T | null> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      const normalized = this._normalizeQuery(query, options)
      const returnDoc = options?.returnDocument === 'after' ? true : false
      const doc = await model
        .findOneAndUpdate(
          normalized,
          { $set: update },
          {
            new: returnDoc,
            session: options?.session as any,
            runValidators: true,
          }
        )
        .maxTimeMS(30000)
        .lean()
        .exec()
      return doc as T | null
    })
  }

  async updateMany(
    collection: string,
    query: Record<string, unknown>,
    data: unknown,
    options: BaseOptions = {}
  ): Promise<number> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      const result = await model.updateMany(this._normalizeQuery(query, options), { $set: data } as any, {
        session: options.session as any,
      })
      await this._invalidateCache(collection)
      return result.modifiedCount
    })
  }

  async delete(collection: string, id: string, options: BaseOptions = {}): Promise<boolean> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      const siteId = options?.siteId || options?.tenantId || (globalThis as any).zenithAls?.getStore()?.siteId
      const filter: Record<string, unknown> = { _id: id }
      if (siteId) filter.siteId = siteId
      const result = await model.findOneAndDelete(filter, { session: options.session as any }).maxTimeMS(30000)
      await this._invalidateCache(collection)
      return !!result
    })
  }

  async deleteMany(
    collection: string,
    query: Record<string, unknown>,
    options: BaseOptions = {}
  ): Promise<number> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      const result = await model.deleteMany(this._normalizeQuery(query, options), { session: options.session as any })
      await this._invalidateCache(collection)
      return result.deletedCount
    })
  }

  async count(collection: string, query: Record<string, unknown>, options?: BaseOptions): Promise<number> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      return model.countDocuments(this._normalizeQuery(query, options)).maxTimeMS(30000)
    })
  }

  async aggregate<T = unknown>(collection: string, pipeline: unknown[], options?: BaseOptions): Promise<T[]> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      const enrichedPipeline = [...pipeline] as any[]
      // Inject tenant scoping — prepend $match stage to prevent cross-tenant data leaks
      const siteId = options?.siteId || options?.tenantId || (globalThis as any).zenithAls?.getStore()?.siteId
      if (siteId) {
        enrichedPipeline.unshift({ $match: { siteId } })
      }
      return model.aggregate(enrichedPipeline).option({ maxTimeMS: 30000 }).exec() as Promise<T[]>
    })
  }

  async transaction<T>(fn: (session: any) => Promise<T>): Promise<T> {
    try {
      const session = await mongoose.startSession()
      try {
        let result: T
        await session.withTransaction(async () => {
          result = await fn(session)
        })
        return result! as T
      } catch (error: any) {
        // Fallback for standalone MongoDB (no replica set)
        if (error.message?.includes('replica set') || error.codeName === 'NotAReplicaSet') {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: MongoDB must be running as a Replica Set in production to guarantee ACID transactions. Standalone MongoDB instances are strictly forbidden because they silently drop transactions and risk data corruption.')
          }
          logger.warn(
            'Transactions not supported on this MongoDB instance. Running without transaction.'
          )
          return await fn(undefined)
        }
        throw error
      } finally {
        session.endSession()
      }
    } catch (sessionError: any) {
      // If we can't even start a session
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`FATAL: Failed to start MongoDB session in production: ${sessionError.message}. Replica Set is required.`)
      }
      logger.warn(
        { err: sessionError.message },
        'Failed to start MongoDB session. Running without transaction.'
      )
      return await fn(undefined)
    }
  }

  async createAuditLog(data: AuditLogData, options?: BaseOptions): Promise<void> {
    const AuditModel = mongoose.models['AuditLog']
    if (AuditModel) {
      if (options?.session) {
        await AuditModel.create([data], { session: options.session as any })
      } else {
        await AuditModel.create(data)
      }
    }
  }

  async createVersion(data: VersionData, options?: BaseOptions): Promise<void> {
    const VersionModel = mongoose.models['Version']
    if (VersionModel) {
      if (options?.session) {
        await VersionModel.create([data], { session: options.session as any })
      } else {
        await VersionModel.create(data)
      }
    }
  }

  async getVersions(collection: string, documentId: string): Promise<VersionData[]> {
    const VersionModel = mongoose.models['Version']
    if (!VersionModel) return []
    return VersionModel.find({ collectionName: collection, documentId })
      .sort({ timestamp: -1 })
      .lean()
      .exec() as any as Promise<VersionData[]>
  }

  async createWebhookDelivery(data: WebhookDeliveryData): Promise<void> {
    const WebhookModel = mongoose.models['WebhookDelivery']
    if (WebhookModel) await WebhookModel.create(data)
  }

  async getWebhookDeliveries(webhookId: string, limit = 50): Promise<WebhookDeliveryRecord[]> {
    const WebhookModel = mongoose.models['WebhookDelivery']
    if (!WebhookModel) return []
    const docs = await WebhookModel.find({ webhookId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
    return docs.map((d: any) => ({
      id: d._id?.toString() || d.id,
      webhookId: d.webhookId,
      collectionSlug: d.collectionSlug,
      event: d.event,
      url: d.url,
      payload: d.payload,
      success: d.success,
      responseStatus: d.responseStatus,
      timestamp: d.timestamp,
    }))
  }

  async search<T = unknown>(
    collection: string,
    query: string,
    fields: string[],
    limit = 10,
    options?: BaseOptions
  ): Promise<T[]> {
    return this._withCircuitBreaker(async () => {
      const model = this.getModel(collection)
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = { $regex: escaped, $options: 'i' }
      const orQuery = fields.map((f) => ({ [f]: regex }))

      const findQuery: Record<string, any> = { $or: orQuery }
      const siteId = options?.siteId || options?.tenantId || (globalThis as any).zenithAls?.getStore()?.siteId
      if (siteId) {
        findQuery.siteId = siteId
      }

      return model
        .find(findQuery)
        .limit(Math.min(limit, 50))
        .maxTimeMS(30000)
        .lean()
        .exec() as Promise<T[]>
    })
  }
}
