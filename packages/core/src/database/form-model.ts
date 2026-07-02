import mongoose, { Schema, Document } from 'mongoose'

export interface IFormField {
  id: string
  name: string
  label: string
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'payment' | 'group' | 'array'
  required: boolean
  options?: string[] // For select/radio
  placeholder?: string
  defaultValue?: string
  paymentAmount?: number // Specific to payment fields
  fields?: IFormField[] // For group and array types
}

export interface IForm extends Document {
  name: string
  slug: string
  description?: string
  siteId: string
  fields: IFormField[]
  submitSettings: {
    successMessage: string
    sendEmailNotification: boolean
    notificationEmail?: string
    redirectUrl?: string
    paymentRequired: boolean
    paymentAmount?: number
  }
  createdAt: Date
  updatedAt: Date
}

const FormSchema = new Schema<IForm>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    siteId: { type: String, required: true, index: true },
    fields: { type: Schema.Types.Mixed, default: [] },
    submitSettings: {
      successMessage: { type: String, default: 'Thank you for your submission!' },
      sendEmailNotification: { type: Boolean, default: false },
      notificationEmail: { type: String },
      redirectUrl: { type: String },
      paymentRequired: { type: Boolean, default: false },
      paymentAmount: { type: Number },
    },
  }, { strict: true,  collection: 'z_forms', timestamps: true }
)

// Ensure unique slug per site
FormSchema.index({ slug: 1, siteId: 1 }, { unique: true })

export const FormModel = mongoose.models.z_forms || mongoose.model<IForm>('z_forms', FormSchema)
