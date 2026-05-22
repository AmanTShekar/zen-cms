import mongoose, { Schema, Document } from 'mongoose'

export type RoleType = 'admin' | 'editor' | 'viewer' | 'custom'

export interface IRole extends Document {
  roleName: string
  roleType: RoleType
  description: string
  isSystem: boolean   // system roles cannot be modified
  permissions: Array<{
    resource: string   // collection slug or '*' for all
    actions: string[]  // 'create' | 'read' | 'update' | 'delete' | '*'
  }>
  createdAt: Date
  updatedAt: Date
}

const RoleSchema = new Schema<IRole>(
  {
    roleName: { type: String, required: true, unique: true, trim: true },
    roleType: {
      type: String,
      enum: ['admin', 'editor', 'viewer', 'custom'],
      default: 'custom',
    },
    description: { type: String, default: '' },
    isSystem: { type: Boolean, default: false },
    permissions: {
      type: [
        new Schema(
          {
            resource: { type: String, required: true },
            actions: { type: [String], default: [] },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
)

RoleSchema.index({ roleType: 1 })

export const RoleModel = mongoose.model<IRole>('z_roles', RoleSchema)