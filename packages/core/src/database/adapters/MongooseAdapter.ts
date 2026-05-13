import mongoose, { Model, ClientSession } from 'mongoose';
import { CollectionConfig } from '@zenith/types';
import { DatabaseAdapter, FindOptions, BaseOptions, AuditLogData, VersionData } from './BaseAdapter';
import { logger } from '../../services/logger';
import { getModelForCollection } from '../model-factory';
import NodeCache from 'node-cache';

/**
 * Mongoose Database Adapter — Hardened Edition
 * ──────────────────────────────────────────
 * High-performance implementation for MongoDB.
 * Features: Neural Cache Layer, automatic session management, and health monitoring.
 */
export class MongooseAdapter implements DatabaseAdapter {
  name = 'mongoose';
  private models: Record<string, Model<unknown>> = {};
  private cache: NodeCache;

  constructor(private uri: string) {
    this.cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
    logger.info('MongooseAdapter: Neural_Cache_Layer Initialized');
  }

  async connect(): Promise<void> {
    try {
      await mongoose.connect(this.uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info('MongooseAdapter: Connected to MongoDB');
      this._initSystemModels();
    } catch (error: unknown) {
      logger.error({ error: error.message }, 'MongooseAdapter: Connection failed');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    logger.info('MongooseAdapter: Disconnected');
  }

  getHealth(): 'ok' | 'connecting' | 'disconnected' | 'error' {
    const state = mongoose.connection.readyState;
    switch (state) {
      case 0: return 'disconnected';
      case 1: return 'ok';
      case 2: return 'connecting';
      case 3: return 'disconnected';
      default: return 'error';
    }
  }

  private _initSystemModels() {
    // Ensure system models are indexed for performance
    if (!mongoose.models['AuditLog']) {
      const schema = new mongoose.Schema({
        timestamp: { type: Date, default: Date.now, index: true },
        collectionName: { type: String, index: true },
        documentId: { type: String, index: true },
        userId: { type: String, index: true }
      }, { strict: false });
      mongoose.model('AuditLog', schema);
    }
    if (!mongoose.models['Version']) {
      const schema = new mongoose.Schema({
        timestamp: { type: Date, default: Date.now, index: true },
        collectionSlug: { type: String, index: true },
        documentId: { type: String, index: true }
      }, { strict: false });
      mongoose.model('Version', schema);
    }
  }

  async registerCollection(config: CollectionConfig): Promise<void> {
    const model = getModelForCollection(config);
    this.models[config.slug] = model;
  }

  private getModel(collection: string): Model<unknown> {
    const model = this.models[collection] || mongoose.models[collection];
    if (!model) throw new Error(`Collection "${collection}" not registered`);
    return model;
  }

  private _getCacheKey(collection: string, query: unknown, options: unknown): string {
    return `${collection}:${JSON.stringify(query)}:${JSON.stringify(options)}`;
  }

  async find<T = unknown>(collection: string, query: Record<string, unknown>, options: FindOptions = {}): Promise<T[]> {
    const cacheKey = this._getCacheKey(collection, query, options);
    const cached = this.cache.get<T[]>(cacheKey);
    if (cached) return cached;

    const model = this.getModel(collection);
    const q = model.find(query);
    
    if (options.select) q.select(options.select);
    if (options.populate) {
      const populateArr = Array.isArray(options.populate) ? options.populate : [options.populate];
      populateArr.forEach(p => q.populate(p));
    }
    
    const docs = await q.sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 100)
      .session(options.session)
      .lean()
      .exec() as T[];

    this.cache.set(cacheKey, docs);
    return docs;
  }

  async findOne<T = unknown>(collection: string, query: Record<string, unknown>, options: FindOptions = {}): Promise<T | null> {
    const cacheKey = this._getCacheKey(collection, query, options);
    const cached = this.cache.get<T>(cacheKey);
    if (cached) return cached;

    const model = this.getModel(collection);
    const q = model.findOne(query);
    
    if (options.select) q.select(options.select);
    if (options.populate) {
      const populateArr = Array.isArray(options.populate) ? options.populate : [options.populate];
      populateArr.forEach(p => q.populate(p));
    }
    
    const doc = await q.session(options.session).lean().exec() as T | null;
    if (doc) this.cache.set(cacheKey, doc);
    return doc;
  }

  private _invalidateCache(collection: string) {
    const keys = this.cache.keys();
    const targets = keys.filter(k => k.startsWith(`${collection}:`));
    this.cache.del(targets);
  }

  async create<T = unknown>(collection: string, data: Partial<T>, options: BaseOptions = {}): Promise<T> {
    const model = this.getModel(collection);
    const [doc] = await model.create([data], { session: options.session });
    this._invalidateCache(collection);
    return doc.toObject() as T;
  }

  async update<T = unknown>(collection: string, id: string, data: Partial<T>, options: BaseOptions = {}): Promise<T | null> {
    const model = this.getModel(collection);
    const doc = await model.findByIdAndUpdate(id, { $set: data }, { 
      new: true, 
      session: options.session,
      runValidators: true 
    }).lean().exec();
    this._invalidateCache(collection);
    return doc as T | null;
  }

  async updateMany(collection: string, query: Record<string, unknown>, data: unknown, options: BaseOptions = {}): Promise<number> {
    const model = this.getModel(collection);
    const result = await model.updateMany(query, { $set: data }, { session: options.session });
    this._invalidateCache(collection);
    return result.modifiedCount;
  }

  async delete(collection: string, id: string, options: BaseOptions = {}): Promise<boolean> {
    const model = this.getModel(collection);
    const result = await model.findByIdAndDelete(id, { session: options.session });
    this._invalidateCache(collection);
    return !!result;
  }

  async deleteMany(collection: string, query: Record<string, unknown>, options: BaseOptions = {}): Promise<number> {
    const model = this.getModel(collection);
    const result = await model.deleteMany(query, { session: options.session });
    this._invalidateCache(collection);
    return result.deletedCount;
  }

  async count(collection: string, query: Record<string, unknown>): Promise<number> {
    const model = this.getModel(collection);
    return model.countDocuments(query);
  }

  async aggregate<T = unknown>(collection: string, pipeline: unknown[]): Promise<T[]> {
    const model = this.getModel(collection);
    return model.aggregate(pipeline).exec() as Promise<T[]>;
  }

  async transaction<T>(fn: (session: ClientSession | undefined) => Promise<T>): Promise<T> {
    try {
      const session = await mongoose.startSession();
      try {
        let result: T;
        await session.withTransaction(async () => {
          result = await fn(session);
        });
        return result! as T;
      } catch (error: unknown) {
        // Fallback for standalone MongoDB (no replica set)
        if (error.message?.includes('replica set') || error.codeName === 'NotAReplicaSet') {
          logger.warn('Transactions not supported on this MongoDB instance. Running without transaction.');
          return await fn(undefined as unknown);
        }
        throw error;
      } finally {
        session.endSession();
      }
    } catch (sessionError: unknown) {
      // If we can't even start a session
      logger.warn({ err: sessionError.message }, 'Failed to start MongoDB session. Running without transaction.');
      return await fn(undefined as unknown);
    }
  }

  async createAuditLog(data: AuditLogData): Promise<void> {
    const AuditModel = mongoose.models['AuditLog'];
    if (AuditModel) await AuditModel.create(data);
  }

  async createVersion(data: VersionData): Promise<void> {
    const VersionModel = mongoose.models['Version'];
    if (VersionModel) await VersionModel.create(data);
  }

  async getVersions(collection: string, documentId: string): Promise<VersionData[]> {
    const VersionModel = mongoose.models['Version'];
    if (!VersionModel) return [];
    return VersionModel.find({ collectionName: collection, documentId })
      .sort({ timestamp: -1 })
      .lean()
      .exec() as Promise<VersionData[]>;
  }
}
