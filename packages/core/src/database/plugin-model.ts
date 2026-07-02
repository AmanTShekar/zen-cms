import mongoose, { Schema } from 'mongoose'

const pluginSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    version: { type: String, default: '1.0.0' },
    description: { type: String, default: '' },
    author: { type: String, default: '' },
    homepage: { type: String, default: '' },
    packageName: { type: String, default: '' },
    configSchema: { type: Schema.Types.Mixed, default: {} },
    config: { type: Schema.Types.Mixed, default: {} },
    enabled: { type: Boolean, default: true },
    installedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    siteId: { type: String, required: true, index: true },
  }, { strict: true,  collection: 'z_plugins' }
)

pluginSchema.index({ id: 1, siteId: 1 }, { unique: true })

export const PluginModel =
  mongoose.models.Plugin || mongoose.model('Plugin', pluginSchema)