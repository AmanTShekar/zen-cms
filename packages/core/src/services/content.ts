import { Model, ClientSession } from 'mongoose';
import { CollectionConfig } from '@zenith/types';
import { logger } from './logger';
import { VersionModel } from '../database/version-model';
import { NotFoundError } from '../errors';

/**
 * Zenith Content Service
 * ──────────────────────
 * Orchestrates CRUD operations with:
 * - Recursive field-level hooks (group, array, blocks)
 * - Row-Level Security (RLS)
 * - Transaction-aware delta auditing
 * - Automatic versioning
 */
export class ContentService {
  constructor(
    private config: CollectionConfig,
    private model: Model<any>
  ) {}

  /**
   * Recursively applies field-level hooks (beforeChange / afterRead)
   * Handles: groups, arrays, blocks
   */
  private async applyFieldHooks(
    doc: any,
    user: any,
    action: 'afterRead' | 'beforeChange',
    fields = this.config.fields
  ): Promise<any> {
    if (!doc) return doc;
    const cleanDoc = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };

    for (const field of fields) {
      // Skip virtual fields — not in DB
      if (field.virtual) continue;

      // Recurse into nested types
      if (field.type === 'group' && cleanDoc[field.name] && field.fields) {
        cleanDoc[field.name] = await this.applyFieldHooks(cleanDoc[field.name], user, action, field.fields);
      } else if (field.type === 'array' && Array.isArray(cleanDoc[field.name]) && field.fields) {
        cleanDoc[field.name] = await Promise.all(
          cleanDoc[field.name].map((item: any) => this.applyFieldHooks(item, user, action, field.fields!))
        );
      } else if (field.type === 'blocks' && Array.isArray(cleanDoc[field.name])) {
        cleanDoc[field.name] = await Promise.all(
          cleanDoc[field.name].map((block: any) => {
            const blockConfig = field.blocks?.find(b => b.slug === block.blockType);
            if (!blockConfig) return block;
            return this.applyFieldHooks(block, user, action, blockConfig.fields);
          })
        );
      }

      // Apply field-level hook
      const hookFn = field.hooks?.[action];
      if (hookFn && cleanDoc[field.name] !== undefined) {
        cleanDoc[field.name] = await hookFn(cleanDoc[field.name]);
      }
    }

    return cleanDoc;
  }

  async find(filter: Record<string, any> = {}, options: { user?: any; skipHooks?: boolean } = {}) {
    let mongoFilter = { ...filter };

    // Row-Level Security
    if (options.user && typeof this.config.access?.read === 'function') {
      const accessFilter = this.config.access.read(options.user);
      if (accessFilter === false) return [];
      if (typeof accessFilter === 'object') {
        mongoFilter = { ...mongoFilter, ...accessFilter };
      }
    }

    let docs = await this.model.find(mongoFilter).lean().exec();

    if (!options.skipHooks) {
      if (this.config.hooks?.afterRead) {
        docs = await Promise.all(docs.map(doc => this.config.hooks!.afterRead!(doc, options.user)));
      }
      docs = await Promise.all(docs.map(doc => this.applyFieldHooks(doc, options.user, 'afterRead')));
    }

    return docs;
  }

  async findById(id: string, options: { user?: any; skipHooks?: boolean } = {}) {
    // RLS check
    if (options.user && typeof this.config.access?.read === 'function') {
      const accessFilter = this.config.access.read(options.user);
      if (accessFilter === false) return null;
    }

    const query = this.config.singleton && id === 'singleton'
      ? this.model.findOne()
      : this.model.findById(id);

    let doc = await query.lean().exec();
    if (!doc) return null;

    if (!options.skipHooks) {
      if (this.config.hooks?.afterRead) {
        doc = await this.config.hooks.afterRead(doc, options.user);
      }
      doc = await this.applyFieldHooks(doc, options.user, 'afterRead');
    }

    // Auto-SEO metadata (Ghost-style)
    if (this.config.seo && doc) {
      const titleField = this.config.admin?.useAsTitle || 'title';
      const anyDoc: any = doc;
      (doc as any)._meta = {
        title: anyDoc[titleField] || anyDoc.name || '',
        description: anyDoc.description || anyDoc.excerpt || anyDoc.summary || '',
        image: anyDoc.image?.url || anyDoc.thumbnail?.url || '',
      };
    }

    return doc;
  }

  async create(data: any, options: { user: any; session?: ClientSession; skipHooks?: boolean }) {
    let docData = { ...data };

    if (!options.skipHooks) {
      if (this.config.hooks?.beforeValidate) {
        docData = await this.config.hooks.beforeValidate(docData, options.user);
      }
      docData = await this.applyFieldHooks(docData, options.user, 'beforeChange');
      if (this.config.hooks?.beforeCreate) {
        docData = await this.config.hooks.beforeCreate(docData, options.user);
      }
    }

    const [doc] = await this.model.create([docData], { session: options.session });

    if (!options.skipHooks && this.config.hooks?.afterCreate) {
      await this.config.hooks.afterCreate(doc, options.user);
    }

    if (this.config.versions) {
      await this._createVersion(doc._id, doc.toObject(), options);
    }

    return doc;
  }

  async update(
    id: string,
    data: any,
    options: { user: any; session?: ClientSession; skipVersioning?: boolean; skipHooks?: boolean }
  ) {
    let updateData = { ...data };

    // Fetch original for delta
    const oldDoc = this.config.singleton && id === 'singleton'
      ? await this.model.findOne().session(options.session ?? null).lean().exec()
      : await this.model.findById(id).session(options.session ?? null).lean().exec();

    if (!oldDoc && (!this.config.singleton || id !== 'singleton')) {
      throw new NotFoundError(this.config.name, id);
    }

    if (!options.skipHooks) {
      if (this.config.hooks?.beforeValidate) {
        updateData = await this.config.hooks.beforeValidate(updateData, options.user);
      }
      updateData = await this.applyFieldHooks(updateData, options.user, 'beforeChange');
      if (this.config.hooks?.beforeUpdate) {
        updateData = await this.config.hooks.beforeUpdate(updateData, options.user);
      }
    }

    const doc = this.config.singleton && id === 'singleton'
      ? await this.model.findOneAndUpdate({}, { $set: updateData }, { new: true, upsert: true, session: options.session })
      : await this.model.findByIdAndUpdate(id, { $set: updateData }, { new: true, session: options.session });

    if (!doc) throw new NotFoundError(this.config.name, id);

    // Calculate precise delta
    const delta: Record<string, { from: any; to: any }> = {};
    for (const key of Object.keys(updateData)) {
      if (JSON.stringify((oldDoc as any)[key]) !== JSON.stringify(updateData[key])) {
        delta[key] = { from: (oldDoc as any)[key], to: updateData[key] };
      }
    }

    if (!options.skipHooks && this.config.hooks?.afterUpdate) {
      await this.config.hooks.afterUpdate(doc, options.user);
    }

    if (this.config.versions && !options.skipVersioning) {
      await this._createVersion(doc._id, doc.toObject(), options, delta);
    }

    return { doc, delta };
  }

  async delete(id: string, options: { user: any; session?: ClientSession; skipHooks?: boolean }) {
    if (!options.skipHooks && this.config.hooks?.beforeDelete) {
      await this.config.hooks.beforeDelete(id, options.user);
    }

    const result = await this.model.findByIdAndDelete(id, { session: options.session });
    if (!result) throw new NotFoundError(this.config.name, id);

    if (!options.skipHooks && this.config.hooks?.afterDelete) {
      await this.config.hooks.afterDelete(id, options.user);
    }

    return result;
  }

  private async _createVersion(docId: any, snapshot: any, options: any, delta?: any) {
    try {
      await VersionModel.create([{
        collectionName: this.config.slug,  // consistent field name
        collectionSlug: this.config.slug,
        documentId: docId,
        snapshot,
        delta,
        createdBy: options.user?.id,
        timestamp: new Date(),
      }], { session: options.session });
    } catch (err) {
      logger.error({ err }, 'Version snapshot failed — non-fatal');
    }
  }
}
