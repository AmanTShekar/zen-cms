import mongoose, { Schema } from 'mongoose'

const webhookConfigSchema = new Schema(
  {
    url: { type: String, required: true },
    secret: { type: String },
    events: [{ type: String, required: true }],
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    siteId: { type: String, required: true, index: true },
  }, { strict: true,  collection: 'z_webhook_configs' }
)

// Index on URL for faster lookups (optional)
webhookConfigSchema.index({ url: 1 })

export const WebhookConfigModel =
  mongoose.models.WebhookConfig || mongoose.model('WebhookConfig', webhookConfigSchema)