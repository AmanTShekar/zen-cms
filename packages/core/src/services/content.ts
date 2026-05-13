import { CollectionConfig, FieldConfig } from '@zenith/types';
import { logger } from './logger';
import { DatabaseAdapter, BaseOptions } from '../database/adapters/BaseAdapter';
import { NotFoundError } from '../errors';

export interface ContentOperationOptions extends BaseOptions {
  user?: unknown;
  skipHooks?: boolean;
  skipVersioning?: boolean;
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
    data: unknown,
    user: unknown,
    action: 'afterRead' | 'beforeChange',
    fields: FieldConfig[] = this.config.fields
  ): Promise<unknown> {
    if (!data) return data;
    
    // Ensure we are working with a plain object
    const cleanData = { ...data };

    for (const field of fields) {
      if (field.virtual && action === 'beforeChange') continue;

      // 1. Handle nested structures
      if (field.type === 'group' && cleanData[field.name]) {
        cleanData[field.name] = await this.processFields(cleanData[field.name], user, action, field.fields);
      } else if (field.type === 'array' && Array.isArray(cleanData[field.name])) {
        cleanData[field.name] = await Promise.all(
          cleanData[field.name].map((item: unknown) => this.processFields(item, user, action, field.fields))
        );
      } else if (field.type === 'blocks' && Array.isArray(cleanData[field.name])) {
        cleanData[field.name] = await Promise.all(
          cleanData[field.name].map((block: unknown) => {
            const blockDef = field.blocks.find(b => b.slug === block.blockType);
            return blockDef ? this.processFields(block, user, action, blockDef.fields) : block;
          })
        );
      }

      // 2. Apply field-level hook
      const hookFn = field.hooks?.[action];
      if (hookFn && cleanData[field.name] !== undefined) {
        try {
          cleanData[field.name] = await hookFn(cleanData[field.name]);
        } catch (err: unknown) {
          logger.warn({ field: field.name, err: err.message }, 'Field hook failed');
        }
      }
    }

    return cleanData;
  }

  async find(filter: Record<string, unknown> = {}, options: ContentOperationOptions = {}): Promise<T[]> {
    let query = { ...filter };

    // Apply RLS (Row Level Security)
    if (options.user && typeof this.config.access?.read === 'function') {
      const access = this.config.access.read(options.user);
      if (access === false) return [];
      if (typeof access === 'object') query = { ...query, ...access };
    }

    let docs = await this.adapter.find<T>(this.config.slug, query, options);

    if (!options.skipHooks) {
      if (this.config.hooks?.afterRead) {
        docs = await Promise.all(docs.map(doc => this.config.hooks!.afterRead!(doc, options.user)));
      }
      docs = await Promise.all(docs.map(doc => this.processFields(doc, options.user, 'afterRead')));
    }

    return docs;
  }

  async findById(id: string, options: ContentOperationOptions = {}): Promise<T | null> {
    const query = this.config.singleton && id === 'singleton' ? {} : { _id: id };
    let doc = await this.adapter.findOne<T>(this.config.slug, query, options);
    
    if (!doc) return null;

    if (!options.skipHooks) {
      if (this.config.hooks?.afterRead) {
        doc = await this.config.hooks.afterRead(doc, options.user);
      }
      doc = await this.processFields(doc, options.user, 'afterRead');
    }

    return doc;
  }

  async create(data: Partial<T>, options: ContentOperationOptions): Promise<T> {
    return this.adapter.transaction(async (session) => {
      let docData = { ...data };
      const opts = { ...options, session };

      if (!options.skipHooks) {
        if (this.config.hooks?.beforeValidate) docData = await this.config.hooks.beforeValidate(docData, options.user);
        docData = await this.processFields(docData, options.user, 'beforeChange');
        if (this.config.hooks?.beforeCreate) docData = await this.config.hooks.beforeCreate(docData, options.user);
      }

      const doc = await this.adapter.create<T>(this.config.slug, docData, opts);

      if (!options.skipHooks && this.config.hooks?.afterCreate) {
        await this.config.hooks.afterCreate(doc, options.user);
      }

      if (this.config.versions) {
        await this._createVersion(doc, options);
      }

      return doc;
    });
  }

  async update(id: string, data: Partial<T>, options: ContentOperationOptions): Promise<{ doc: T; delta: unknown }> {
    return this.adapter.transaction(async (session) => {
      const opts = { ...options, session };
      const query = this.config.singleton && id === 'singleton' ? {} : { _id: id };
      
      const oldDoc = await this.adapter.findOne(this.config.slug, query, opts);
      if (!oldDoc) throw new NotFoundError(this.config.name, id);

      let updateData = { ...data };

      if (!options.skipHooks) {
        if (this.config.hooks?.beforeValidate) updateData = await this.config.hooks.beforeValidate(updateData, options.user);
        updateData = await this.processFields(updateData, options.user, 'beforeChange');
        if (this.config.hooks?.beforeUpdate) updateData = await this.config.hooks.beforeUpdate(updateData, options.user);
      }

      const targetId = this.config.singleton && id === 'singleton' ? (oldDoc as unknown)._id : id;
      const doc = await this.adapter.update<T>(this.config.slug, targetId, updateData, opts);
      if (!doc) throw new NotFoundError(this.config.name, id);

      const delta = this._calculateDelta(oldDoc, updateData);

      if (!options.skipHooks && this.config.hooks?.afterUpdate) {
        await this.config.hooks.afterUpdate(doc, options.user);
      }

      if (this.config.versions && !options.skipVersioning) {
        await this._createVersion(doc, options, delta);
      }

      return { doc, delta };
    });
  }

  async delete(id: string, options: ContentOperationOptions): Promise<boolean> {
    if (!options.skipHooks && this.config.hooks?.beforeDelete) {
      await this.config.hooks.beforeDelete(id, options.user);
    }

    let targetId = id;
    if (this.config.singleton && id === 'singleton') {
      const doc = await this.adapter.findOne(this.config.slug, {}, options);
      if (doc) targetId = (doc as unknown)._id;
    }

    const success = await this.adapter.delete(this.config.slug, targetId, options);
    if (!success) throw new NotFoundError(this.config.name, id);

    if (!options.skipHooks && this.config.hooks?.afterDelete) {
      await this.config.hooks.afterDelete(id, options.user);
    }

    return success;
  }

  private _calculateDelta(oldDoc: unknown, newData: unknown): unknown {
    const delta: Record<string, unknown> = {};
    for (const key of Object.keys(newData)) {
      if (JSON.stringify(oldDoc[key]) !== JSON.stringify(newData[key])) {
        delta[key] = { from: oldDoc[key], to: newData[key] };
      }
    }
    return delta;
  }

  private async _createVersion(doc: unknown, options: unknown, delta?: unknown) {
    try {
      const isGlobal = this.config.singleton || !doc._id;
      await this.adapter.createVersion({
        collectionName: isGlobal ? 'globals' : (this.config.name || this.config.slug),
        collectionSlug: isGlobal ? 'globals' : this.config.slug,
        documentId: isGlobal ? this.config.slug : (doc._id?.toString() || 'singleton'),
        snapshot: doc,
        delta,
        createdBy: options.user?.id || 'system',
        timestamp: new Date(),
      });
    } catch (err) {
      logger.error({ err }, 'Versioning failed');
    }
  }
}
