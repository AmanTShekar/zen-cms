import mongoose, { Schema, Model } from 'mongoose';
import { CollectionConfig, FieldConfig } from '@zenith/types';

const models: Record<string, Model<any>> = {};

function mapFieldToMongoose(field: FieldConfig): any {
  let type: any;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'textarea':
    case 'richtext':
    case 'select':
      type = String;
      break;
    case 'number':
      type = Number;
      break;
    case 'boolean':
    case 'checkbox':
      type = Boolean;
      break;
    case 'date':
      type = Date;
      break;
    case 'json':
      type = Schema.Types.Mixed;
      break;
    case 'media':
      type = new Schema({
        url: String,
        id: String,
        alt: String,
        width: Number,
        height: Number,
      }, { _id: false });
      break;
    case 'relation':
      type = Schema.Types.ObjectId;
      break;
    case 'array':
      if (field.fields) {
        type = [new Schema(generateSchemaFields(field.fields), { _id: false })];
      } else {
        type = [Schema.Types.Mixed];
      }
      break;
    case 'group':
      if (field.fields) {
        type = new Schema(generateSchemaFields(field.fields), { _id: false });
      } else {
        type = Schema.Types.Mixed;
      }
      break;
    case 'blocks':
      if (field.blocks && field.blocks.length > 0) {
        // Blocks are stored as objects with a blockType discriminator
        type = [new Schema({
          blockType: { type: String, index: true },
        }, { strict: false, _id: false })];
      } else {
        type = [Schema.Types.Mixed];
      }
      break;
    default:
      type = Schema.Types.Mixed;
  }

  if (field.hasMany && field.type !== 'array') {
    type = [type];
  }

  // Handle i18n
  if (field.localized) {
    type = new Schema({
      // We use a Mixed object to store any locale keys (en, es, fr, etc.)
    }, { strict: false, _id: false });
  }

  return {
    type,
    required: field.required || false,
    unique: field.unique || false,
    default: field.defaultValue,
  };
}

function generateSchemaFields(fields: FieldConfig[]) {
  const schemaFields: Record<string, any> = {};
  fields.forEach(field => {
    schemaFields[field.name] = mapFieldToMongoose(field);
  });
  return schemaFields;
}

export function getModelForCollection(config: CollectionConfig): Model<any> {
  if (models[config.slug]) return models[config.slug];

  const schemaFields = generateSchemaFields(config.fields);
  
  const schema = new Schema(schemaFields, {
    timestamps: config.timestamps !== false,
    collection: config.slug,
    strict: false, // Allow extra dynamic fields
  });

  // Global meta fields
  schema.add({
    isFocused: { type: Boolean, default: false },
    _status: {
      type: String,
      enum: ['draft', 'published'],
      default: config.drafts ? 'draft' : 'published',
    }
  });

  // Scheduling support
  if (config.scheduling) {
    schema.add({
      scheduledAt: { type: Date, index: true }
    });
  }

  const model = mongoose.models[config.slug] || mongoose.model(config.slug, schema);
  models[config.slug] = model;
  return model;
}
