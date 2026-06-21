import mongoose, { Schema, Document } from 'mongoose'

export interface IFlowRun extends Document {
  flowId: string
  status: 'running' | 'completed' | 'failed' | 'sleeping'
  context: any
  completedNodes: any
  error?: string
  resumeAt?: string
  createdAt: Date
  updatedAt: Date
}

const FlowRunSchema = new Schema<IFlowRun>(
  {
    flowId: { type: String, required: true, index: true },
    status: { type: String, required: true, default: 'running' },
    context: { type: Schema.Types.Mixed, default: {} },
    completedNodes: { type: Schema.Types.Mixed, default: {} },
    error: { type: String },
    resumeAt: { type: String }
  },
  { timestamps: true, strict: false }
)

export const FlowRunModel = mongoose.models.z_flow_runs || mongoose.model<IFlowRun>('z_flow_runs', FlowRunSchema)
