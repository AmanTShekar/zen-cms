import mongoose, { Schema, Document } from 'mongoose'

export interface ISystemSettings extends Document {
  siteName: string
  publicUrl: string
  maintenanceMode: boolean
  enableDrafts: boolean
  defaultLocale: string
  allowedOrigins: string[]
  allowRegistration: boolean
  // Security
  jwtSecret?: string
  jwtExpiresIn?: string
  passwordMinLength?: number
  rateLimitWindow?: number
  rateLimitMax?: number
  // Notifications
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  fromEmail?: string
  // Database
  maxPoolSize?: number
  enableBackup?: boolean
  backupInterval?: string
  customCSS?: string
  // AI Keys
  openRouterApiKey?: string
  openaiApiKey?: string
  anthropicApiKey?: string
  xaiApiKey?: string
  updatedBy: mongoose.Types.ObjectId
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    siteName: { type: String, default: 'Zenith CMS' },
    publicUrl: { type: String, default: 'http://localhost:3000' },
    maintenanceMode: { type: Boolean, default: false },
    enableDrafts: { type: Boolean, default: true },
    defaultLocale: { type: String, default: 'en' },
    allowedOrigins: { type: [String], default: ['*'] },
    allowRegistration: { type: Boolean, default: false },
    // AI Keys
    openRouterApiKey: { type: String, default: '' },
    openaiApiKey: { type: String, default: '' },
    anthropicApiKey: { type: String, default: '' },
    xaiApiKey: { type: String, default: '' },
    // Security
    jwtSecret: { type: String },
    jwtExpiresIn: { type: String, default: '7d' },
    passwordMinLength: { type: Number, default: 8 },
    rateLimitWindow: { type: Number, default: 15 },
    rateLimitMax: { type: Number, default: 100 },
    // Notifications
    smtpHost: { type: String },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String },
    smtpPass: { type: String },
    fromEmail: { type: String },
    // Database
    maxPoolSize: { type: Number, default: 10 },
    enableBackup: { type: Boolean, default: false },
    backupInterval: { type: String, default: 'daily' },
    customCSS: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const SystemSettingsModel = mongoose.model<ISystemSettings>(
  'z_settings',
  SystemSettingsSchema
)
