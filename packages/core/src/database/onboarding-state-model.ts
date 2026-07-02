import mongoose, { Schema, Document } from 'mongoose'

export type ProjectType = 'blog' | 'ecommerce' | 'portfolio' | 'saas' | 'custom'

export interface IOnboardingAnswers {
  projectName?: string
  projectType?: ProjectType
  publicUrl?: string
  timezone?: string
  adminEmail?: string
  selectedCollections?: string[]
  generatedApiKeyId?: mongoose.Types.ObjectId
}

export interface IOnboardingState extends Document {
  siteId?: string
  currentStep: number
  totalSteps: number
  completedAt?: Date
  skipped: boolean
  answers: IOnboardingAnswers
  createdAt: Date
  updatedAt: Date
}

const OnboardingAnswersSchema = new Schema<IOnboardingAnswers>(
  {
    projectName: { type: String },
    projectType: { type: String, enum: ['blog', 'ecommerce', 'portfolio', 'saas', 'custom'] },
    publicUrl: { type: String },
    timezone: { type: String },
    adminEmail: { type: String },
    selectedCollections: { type: [String], default: [] },
    generatedApiKeyId: { type: Schema.Types.ObjectId },
  },
  { _id: false }
)

const OnboardingStateSchema = new Schema<IOnboardingState>(
  {
    siteId: { type: String, required: true, index: true },
    currentStep: { type: Number, default: 0, min: 0 },
    totalSteps: { type: Number, default: 7 },
    completedAt: { type: Date },
    skipped: { type: Boolean, default: false },
    answers: { type: OnboardingAnswersSchema, default: () => ({}) },
  },
  { strict: true, timestamps: true }
)

export const OnboardingStateModel = mongoose.models.z_onboarding || mongoose.model<IOnboardingState>(
  'z_onboarding',
  OnboardingStateSchema
)
