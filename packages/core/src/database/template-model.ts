import mongoose, { Schema, Document } from 'mongoose'

export interface ITemplate extends Document {
  name: string
  slug: string
  description?: string
  blockType: string
  content: Record<string, any>
  thumbnail?: string
  usageCount: number
  isSystem: boolean
  siteId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    blockType: { type: String, required: true },
    content: { type: Schema.Types.Mixed, required: true },
    thumbnail: { type: String },
    usageCount: { type: Number, default: 0 },
    isSystem: { type: Boolean, default: false },
    siteId: { type: String, required: true },
    createdBy: { type: String, required: true },
  },
  { strict: true, timestamps: true }
)

TemplateSchema.index({ siteId: 1, blockType: 1 })
TemplateSchema.index({ slug: 1, siteId: 1 }, { unique: true })

export const Template =
  (mongoose.models.Template as mongoose.Model<ITemplate>) ||
  mongoose.model<ITemplate>('Template', TemplateSchema)