import mongoose, { Schema, Document } from 'mongoose';

export interface IFlow extends Document {
  name: string;
  description?: string;
  active: boolean;
  trigger: {
    type: 'webhook' | 'collection_change' | 'schedule';
    config: unknown;
  };
  steps: Array<{
    id: string;
    type: string;
    config: unknown;
    next?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
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
  },
  { timestamps: true }
);

export const FlowModel = mongoose.models.Flow || mongoose.model<IFlow>('Flow', FlowSchema);
