import mongoose, { Schema } from 'mongoose'

const redirectSchema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    type: { type: String, default: '301' },
    siteId: { type: String, required: true },
    hits: { type: Number, default: 0 },
    createdBy: { type: String },
    lastHitAt: { type: Date },
  }, { strict: true,  collection: 'z_redirects', timestamps: true }
)

redirectSchema.index({ from: 1, siteId: 1 }, { unique: true })

export const RedirectModel =
  mongoose.models.z_redirects || mongoose.model('z_redirects', redirectSchema)
