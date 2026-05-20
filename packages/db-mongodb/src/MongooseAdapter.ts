import mongoose, { Model } from 'mongoose'
import { CollectionConfig, DatabaseAdapter, FindOptions, BaseOptions, AuditLogData, VersionData, WebhookDeliveryData } from '@zenithcms/types'
import { getModelForCollection } from './model-factory'
import NodeCache from 'node-cache'
import Redis from 'ioredis'
import pino from 'pino'

const logger = pino()

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

  async connect(): Promise<void> {
    try {
      await mongoose.connect(this.uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
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
        },
        { strict: false }
      )
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
    if (!mongoose.models['z_presence']) {
      const schema = new mongoose.Schema(
        {
          userId: { type: String, required: true },
          email: { type: String, required: true },
          collectionName: { type: String, required: true },
          documentId: { type: String, required: true },
          lastActive: { type: Number, required: true },
        },
        { timestamps: false, strict: true }
      )
      mongoose.model('z_presence', schema)
    }
  }

  async registerCollection(config: CollectionConfig): Promise<void> {
    const model = getModelForCollection(config)
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
    if (collection === 'z_password_resets') resolvedCollection = 'z_password_resets'
    if (collection === 'z_api_keys') resolvedCollection = 'z_api_keys'
    if (collection === 'z_migrations') resolvedCollection = 'z_migrations'
    if (collection === 'z_collections') resolvedCollection = 'z_collections'
    if (collection === 'z_presence') resolvedCollection = 'z_presence'

    const model = this.models[resolvedCollection] || mongoose.models[resolvedCollection]
    if (!model) throw new Error(`Collection "${collection}" not registered`)
    return model
  }

  private _getCacheKey(collection: string, query: unknown, options: unknown): string {
    const sortObject = (obj: any): any => {
      if (obj === null || typeof obj !== 'object') return obj
      if (Array.isArray(obj)) return obj.map(sortObject)
      return Object.keys(obj).sort().reduce((acc: any, key: string) => {
        acc[key] = sortObject(obj[key])
        return acc
      }, {})
    }
    return `${collection}:${JSON.stringify(sortObject(query))}:${JSON.stringify(sortObject(options))}`
  }

  async find<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    options: FindOptions = {}
  ): Promise<T[]> {
    const cacheKey = this._getCacheKey(collection, query, options)
    const cached = await this.cache.get<T[]>(cacheKey)
    if (cached) return cached

    const globalAot = (globalThis as any).zenithAotBridge
    if (globalAot && globalAot.hasQuery(collection, 'find')) {
      const model = this.getModel(collection)
      const docs = await globalAot.executeQuery(collection, 'find', mongoose.connection.db, model, this._normalizeQuery(query), options)
      await this.cache.set(cacheKey, docs, collection)
      return docs
    }

    const model = this.getModel(collection)
    const q = model.find(this._normalizeQuery(query))

    if (options.select) q.select(options.select)
    if (options.populate) {
      const populateArr = Array.isArray(options.populate) ? options.populate : [options.populate]
      populateArr.forEach((p: any) => q.populate(p))
    }

    const docs = (await q
      .sort((options.sort as any) || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 100)
      .session(options.session as any)
      .lean()
      .exec()) as T[]

    await this.cache.set(cacheKey, docs, collection)
    return docs
  }

  async findOne<T = unknown>(
    collection: string,
    query: Record<string, unknown>,
    options: FindOptions = {}
  ): Promise<T | null> {
    const cacheKey = this._getCacheKey(collection, query, options)
    const cached = await this.cache.get<T>(cacheKey)
    if (cached) return cached

    const model = this.getModel(collection)
    const q = model.findOne(this._normalizeQuery(query))

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
  }

  private async _invalidateCache(collection: string) {
    await this.cache.invalidate(collection)
  }

  async create<T = unknown>(
    collection: string,
    data: Partial<T>,
    options: BaseOptions = {}
  ): Promise<T> {
    const globalAot = (globalThis as any).zenithAotBridge
    if (globalAot && globalAot.hasQuery(collection, 'create')) {
      const model = this.getModel(collection)
      const doc = await globalAot.executeQuery(collection, 'create', mongoose.connection.db, model, data, options)
      await this._invalidateCache(collection)
      return doc as T
    }

    const model = this.getModel(collection)
    const [doc] = await model.create([data] as any, { session: options.session as any })
    await this._invalidateCache(collection)
    return doc.toObject() as T
  }

  async update<T = unknown>(
    collection: string,
    id: string,
    data: Partial<T>,
    options: BaseOptions = {}
  ): Promise<T | null> {
    const model = this.getModel(collection)
    const doc = await model
      .findByIdAndUpdate(
        id,
        { $set: data },
        {
          new: true,
          session: options.session as any,
          runValidators: true,
        }
      )
      .lean()
      .exec()
    await this._invalidateCache(collection)
    return doc as T | null
  }

  private _normalizeQuery(query: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...query }
    if ('id' in normalized) {
      normalized._id = normalized.id
      delete normalized.id
    }
    return normalized
  }

  async updateMany(
    collection: string,
    query: Record<string, unknown>,
    data: unknown,
    options: BaseOptions = {}
  ): Promise<number> {
    const model = this.getModel(collection)
    const result = await model.updateMany(this._normalizeQuery(query), { $set: data } as any, {
      session: options.session as any,
    })
    await this._invalidateCache(collection)
    return result.modifiedCount
  }

  async delete(collection: string, id: string, options: BaseOptions = {}): Promise<boolean> {
    const model = this.getModel(collection)
    const result = await model.findByIdAndDelete(id, { session: options.session as any })
    await this._invalidateCache(collection)
    return !!result
  }

  async deleteMany(
    collection: string,
    query: Record<string, unknown>,
    options: BaseOptions = {}
  ): Promise<number> {
    const model = this.getModel(collection)
    const result = await model.deleteMany(this._normalizeQuery(query), { session: options.session as any })
    await this._invalidateCache(collection)
    return result.deletedCount
  }

  async count(collection: string, query: Record<string, unknown>): Promise<number> {
    const model = this.getModel(collection)
    return model.countDocuments(this._normalizeQuery(query))
  }

  async aggregate<T = unknown>(collection: string, pipeline: unknown[]): Promise<T[]> {
    const model = this.getModel(collection)
    return model.aggregate(pipeline as any).exec() as Promise<T[]>
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

  async search<T = unknown>(
    collection: string,
    query: string,
    fields: string[],
    limit = 10,
    options?: BaseOptions
  ): Promise<T[]> {
    const model = this.getModel(collection)
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = { $regex: escaped, $options: 'i' }
    const orQuery = fields.map((f) => ({ [f]: regex }))

    const findQuery: Record<string, any> = { $or: orQuery }
    const siteId = (options as any)?.siteId
    if (siteId) {
      findQuery.siteId = siteId
    }

    return model
      .find(findQuery)
      .limit(Math.min(limit, 50))
      .lean()
      .exec() as Promise<T[]>
  }
}
