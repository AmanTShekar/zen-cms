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
    fieldPermissions?: Record<string, { read?: boolean; write?: boolean }>
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
            fieldPermissions: {
              type: Map,
              of: new Schema(
                {
                  read: { type: Boolean },
                  write: { type: Boolean },
                },
                { _id: false }
              ),
              default: {},
            },
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