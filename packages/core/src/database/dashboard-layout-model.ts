import mongoose, { Schema, Document } from 'mongoose'

export interface IDashboardWidgetPosition {
  x: number
  y: number
  w: number
  h: number
}

export interface IDashboardWidget {
  id: string
  type: string
  title?: string
  config: Record<string, any>
  position: IDashboardWidgetPosition
  isOrphaned?: boolean
}

export interface IDashboardLayout extends Document {
  userId: mongoose.Types.ObjectId
  siteId?: string
  widgets: IDashboardWidget[]
  columns: number
  createdAt: Date
  updatedAt: Date
}

const WidgetPositionSchema = new Schema<IDashboardWidgetPosition>(
  {
    x: { type: Number, required: true, min: 0 },
    y: { type: Number, required: true, min: 0 },
    w: { type: Number, required: true, min: 1, max: 12 },
    h: { type: Number, required: true, min: 1 },
  },
  { _id: false }
)

const DashboardWidgetSchema = new Schema<IDashboardWidget>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String },
    config: { type: Schema.Types.Mixed, default: {} },
    position: { type: WidgetPositionSchema, required: true },
    isOrphaned: { type: Boolean, default: false },
  },
  { _id: false }
)

const DashboardLayoutSchema = new Schema<IDashboardLayout>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'z_users', required: true, index: true },
    siteId: { type: String, required: true, index: true },
    widgets: { type: [DashboardWidgetSchema], default: [] },
    columns: { type: Number, default: 12, min: 1, max: 12 },
  },
  { strict: true, timestamps: true }
)

DashboardLayoutSchema.index({ userId: 1, siteId: 1 }, { unique: true })

export const DashboardLayoutModel = mongoose.models.z_dashboard_layouts || mongoose.model<IDashboardLayout>(
  'z_dashboard_layouts',
  DashboardLayoutSchema
)
