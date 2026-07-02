import mongoose, { Schema } from 'mongoose'

const versionSchema = new Schema(
  {
    collectionName: { type: String, required: true, index: true },
    documentId: { type: String, required: true, index: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    delta: { type: Schema.Types.Mixed },
    createdBy: { type: String },
    timestamp: { type: Date, default: Date.now },
  }, { strict: true,  collection: 'z_versions' }
)

export const VersionModel = mongoose.models.Version || mongoose.model('Version', versionSchema)

const webhookDeliverySchema = new Schema(
  {
    collectionSlug: { type: String, index: true },
    event: { type: String, required: true },
    url: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    success: { type: Boolean, required: true },
    responseStatus: { type: Number },
    timestamp: { type: Date, default: Date.now },
  },
  { collection: 'z_webhook_deliveries' }
)

export const WebhookDeliveryModel =
  mongoose.models.WebhookDelivery || mongoose.model('WebhookDelivery', webhookDeliverySchema)
