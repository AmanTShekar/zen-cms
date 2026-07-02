import mongoose, { Schema, Document } from 'mongoose'

export interface IWorkspace extends Document {
  name: string
  slug: string
  ownerId: string
  members: {
    userId: string
    role: 'admin' | 'member'
    addedAt: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    ownerId: { type: String, required: true, index: true },
    members: [
      {
        userId: { type: String, required: true },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { strict: true, timestamps: true, collection: 'z_workspaces' }
)

export const WorkspaceModel = mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', WorkspaceSchema)
