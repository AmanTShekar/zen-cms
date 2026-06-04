import mongoose, { Schema, Document } from 'mongoose'

export interface ISystemSettings extends Document {
  siteName: string
  siteDescription?: string
  logoUrl?: string
  faviconUrl?: string
  publicUrl: string
  maintenanceMode: boolean
  enableDrafts: boolean
  defaultLocale: string
  supportedLocales?: string[]
  allowedOrigins: string[]
  allowRegistration: boolean
  mediaProvider?: string
  maxUploadSize?: number
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
  siteId?: string
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    siteName: { type: String, default: 'Zenith CMS' },
    siteDescription: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    publicUrl: { type: String, default: 'http://localhost:3000' },
    maintenanceMode: { type: Boolean, default: false },
    enableDrafts: { type: Boolean, default: true },
    defaultLocale: { type: String, default: 'en' },
    supportedLocales: { type: [String], default: ['en'] },
    allowedOrigins: { type: [String], default: ['*'] },
    allowRegistration: { type: Boolean, default: false },
    mediaProvider: { type: String, default: 'local' },
    maxUploadSize: { type: Number, default: 5242880 },
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
    siteId: { type: String },
  },
  { timestamps: true }
)

SystemSettingsSchema.index({ siteId: 1 }, { unique: true })

export const SystemSettingsModel = mongoose.model<ISystemSettings>(
  'z_settings',
  SystemSettingsSchema
)
