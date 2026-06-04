import mongoose, { Schema } from 'mongoose'

const schemaModelSchema = new Schema(
  {
    slug: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String },
    category: { type: String },
    description: { type: String },
    iconName: { type: String },
    fields: { type: Schema.Types.Mixed },
    siteId: { type: String },
    source: { type: String, default: 'custom' },
    isGlobal: { type: Boolean, default: false },
  },
  { collection: 'z_schemas', timestamps: true }
)

schemaModelSchema.index({ slug: 1, siteId: 1 }, { unique: true })

export const SchemaModel =
  mongoose.models.z_schemas || mongoose.model('z_schemas', schemaModelSchema)
