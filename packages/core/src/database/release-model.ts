import mongoose, { Schema, Document } from 'mongoose'

export interface IRelease extends Document {
  name: string
  description?: string
  documents: Array<{
    collectionSlug: string
    documentId: string
    title: string
    addedAt: Date
    addedBy: string
  }>
  status: 'pending' | 'published' | 'failed'
  scheduledAt?: Date
  publishedAt?: Date
  publishedBy?: string
  failureReason?: string
  siteId?: string
  createdAt: Date
  updatedAt: Date
}

const ReleaseDocumentSchema = new Schema({
  collectionSlug: { type: String, required: true },
  documentId: { type: String, required: true },
  title: { type: String, required: true },
  addedAt: { type: Date, default: Date.now },
  addedBy: { type: String, required: true },
})

const ReleaseSchema = new Schema<IRelease>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    documents: { type: [ReleaseDocumentSchema], default: [] },
    status: { type: String, enum: ['pending', 'published', 'failed'], default: 'pending' },
    scheduledAt: { type: Date },
    publishedAt: { type: Date },
    publishedBy: { type: String },
    failureReason: { type: String },
    siteId: { type: String },
  },
  { timestamps: true }
)

// Index for fast listing and site scoping
ReleaseSchema.index({ siteId: 1, status: 1 })
ReleaseSchema.index({ scheduledAt: 1 })

export const ReleaseModel = mongoose.model<IRelease>('z_releases', ReleaseSchema)