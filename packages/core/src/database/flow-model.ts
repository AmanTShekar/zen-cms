import mongoose, { Schema, Document } from 'mongoose'

export interface IFlow extends Document {
  name: string
  description?: string
  active: boolean
  trigger: {
    type: 'webhook' | 'collection_change' | 'schedule'
    config: unknown
  }
  steps: Array<{
    id: string
    type: string
    config: unknown
    next?: string
  }>
  nodes?: Record<string, unknown>[]
  edges?: Record<string, unknown>[]
  siteId?: string
  createdAt: Date
  updatedAt: Date
}

const FlowSchema = new Schema<IFlow>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    active: {
      type: Boolean,
      default: false,
    },
    trigger: {
      type: {
        type: String,
        enum: ['webhook', 'collection_change', 'schedule'],
        required: true,
      },
      config: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    steps: [
      {
        id: String,
        type: String,
        config: Schema.Types.Mixed,
        next: String,
      },
    ],
    nodes: { type: [Schema.Types.Mixed], default: [] },
    edges: { type: [Schema.Types.Mixed], default: [] },
    siteId: { type: String, index: true },
  },
  { timestamps: true, strict: false }
)

export const FlowModel = mongoose.models.Flow || mongoose.model<IFlow>('Flow', FlowSchema)
