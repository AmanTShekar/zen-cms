import mongoose, { Schema, Document } from 'mongoose'

export interface IFormSubmission extends Document {
  formId: mongoose.Types.ObjectId
  siteId: string
  data: Record<string, any> // The actual submitted data (key-value pairs)
  status: 'pending' | 'completed' | 'spam' | 'failed'
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded'
  paymentProvider?: 'stripe' | 'paypal' | 'razorpay'
  paymentTransactionId?: string
  metadata?: Record<string, any> // IP address, user agent, etc.
  createdAt: Date
  updatedAt: Date
}

const FormSubmissionSchema = new Schema<IFormSubmission>(
  {
    formId: { type: Schema.Types.ObjectId, ref: 'z_forms', required: true, index: true },
    siteId: { type: String, required: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'completed', 'spam', 'failed'], default: 'completed' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'] },
    paymentProvider: { type: String, enum: ['stripe', 'paypal', 'razorpay'] },
    paymentTransactionId: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  }, { strict: true,  collection: 'z_form_submissions', timestamps: true }
)

export const FormSubmissionModel = mongoose.models.z_form_submissions || mongoose.model<IFormSubmission>('z_form_submissions', FormSubmissionSchema)
