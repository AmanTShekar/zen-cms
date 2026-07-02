import mongoose, { Schema } from 'mongoose'

const webhookDeliverySchema = new Schema(
  {
    webhookId: { type: String, index: true },
    collectionSlug: { type: String, index: true },
    event: { type: String, required: true },
    url: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    success: { type: Boolean, required: true },
    responseStatus: { type: Number },
    timestamp: { type: Date, default: Date.now },
    siteId: { type: String, required: true, index: true },
  }, { strict: true,  collection: 'z_webhook_deliveries' }
)

export const WebhookDeliveryModel =
  mongoose.models.WebhookDelivery || mongoose.model('WebhookDelivery', webhookDeliverySchema)
