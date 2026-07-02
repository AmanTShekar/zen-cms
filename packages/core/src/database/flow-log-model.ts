import mongoose, { Schema, Document } from 'mongoose'

export interface IFlowLog extends Document {
  runId: string
  level: string
  nodeId?: string
  msg: string
  details?: Record<string, any>
  timestamp: Date
  siteId: string
}

const FlowLogSchema = new Schema<IFlowLog>(
  {
    runId: { type: String, required: true, index: true },
    level: { type: String, required: true, default: 'info' },
    nodeId: { type: String },
    msg: { type: String, required: true },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    siteId: { type: String, required: true, index: true },
  },
  { strict: true }
)

export const FlowLogModel = mongoose.models.z_flow_logs || mongoose.model<IFlowLog>('z_flow_logs', FlowLogSchema)
