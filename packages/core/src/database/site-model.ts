import mongoose, { Schema, Document } from 'mongoose'

export interface ISitePlan {
  id: string
  name: string
  slug: string
  price: number
  billingPeriod: 'monthly' | 'yearly' | 'one-time'
  features: string[]
  isPopular: boolean
  paywalledCollections: string[] // Collections restricted under this plan
}

export interface ISite extends Document {
  name: string
  slug: string
  domain?: string
  icon: string
  description?: string
  ownerId: string
  workspaceId?: string
  members: {
    userId: string
    role: 'admin' | 'editor' | 'viewer'
    addedAt: Date
  }[]
  collections: string[] // Slugs of collections active in this site
  globals: string[] // Slugs of globals active in this site
  billingEnabled: boolean
  stripePublicKey?: string
  stripeSecretKey?: string
  stripeWebhookSecret?: string
  paypalClientId?: string
  paypalClientSecret?: string
  paypalWebhookId?: string
  razorpayKeyId?: string
  razorpayKeySecret?: string
  razorpayWebhookSecret?: string
  paymentProvider: string
  currency: string
  pricingPlans: ISitePlan[]
  createdAt: Date
  updatedAt: Date
}

const SiteSchema = new Schema<ISite>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    domain: { type: String, default: '' },
    icon: { type: String, default: '' },
    description: { type: String },
    ownerId: { type: String, required: true, index: true },
    workspaceId: { type: String, index: true },
    members: [
      {
        userId: { type: String, required: true },
        role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    collections: { type: [String], default: [] },
    globals: { type: [String], default: [] },
    billingEnabled: { type: Boolean, default: false },
    stripePublicKey: { type: String, default: '' },
    stripeSecretKey: { type: String, default: '' },
    stripeWebhookSecret: { type: String, default: '' },
    paypalClientId: { type: String, default: '' },
    paypalClientSecret: { type: String, default: '' },
    paypalWebhookId: { type: String, default: '' },
    razorpayKeyId: { type: String, default: '' },
    razorpayKeySecret: { type: String, default: '' },
    razorpayWebhookSecret: { type: String, default: '' },
    paymentProvider: { type: String, default: 'stripe' },
    currency: { type: String, default: 'USD' },
    pricingPlans: {
      type: [
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          slug: { type: String, required: true },
          price: { type: Number, required: true, default: 0 },
          billingPeriod: {
            type: String,
            enum: ['monthly', 'yearly', 'one-time'],
            default: 'monthly',
          },
          features: { type: [String], default: [] },
          isPopular: { type: Boolean, default: false },
          paywalledCollections: { type: [String], default: [] },
        },
      ],
      default: [],
    },
  },
  { strict: true, timestamps: true, collection: 'z_sites' }
)

export const SiteModel = mongoose.models.Site || mongoose.model<ISite>('Site', SiteSchema)
