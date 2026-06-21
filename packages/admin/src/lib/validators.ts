import { z } from 'zod'

// ── Auth Schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
 email: z.string().email('Invalid email address'),
 password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
 email: z.string().email('Invalid email address'),
})

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
 .object({
 password: z.string().min(8, 'Password must be at least 8 characters'),
 confirmPassword: z.string(),
 })
 .refine((data) => data.password === data.confirmPassword, {
 message: 'Passwords do not match',
 path: ['confirmPassword'],
 })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z
 .object({
 currentPassword: z.string().min(1, 'Current password is required'),
 newPassword: z.string().min(8, 'Password must be at least 8 characters'),
 confirmPassword: z.string(),
 })
 .refine((data) => data.newPassword === data.confirmPassword, {
 message: 'Passwords do not match',
 path: ['confirmPassword'],
 })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>

export const inviteUserSchema = z.object({
 email: z.string().email('Invalid email address'),
 role: z.enum(['admin', 'editor', 'viewer']),
})

export type InviteUserFormValues = z.infer<typeof inviteUserSchema>

// ── Settings Schemas ──────────────────────────────────────────────────────────

export const siteSchema = z.object({
 name: z.string().min(1, 'Site name is required'),
 slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
 description: z.string().optional(),
})

export type SiteFormValues = z.infer<typeof siteSchema>

export const webhookSchema = z.object({
 url: z.string().url('Must be a valid URL'),
 events: z.array(z.string()).min(1, 'Select at least one event'),
 enabled: z.boolean().default(true),
})

export type WebhookFormValues = z.infer<typeof webhookSchema>

// ── Field Schemas ─────────────────────────────────────────────────────────────

export const fieldOptionSchema = z.object({
 label: z.string().min(1, 'Label is required'),
 value: z.string().min(1, 'Value is required'),
})

export type FieldOption = z.infer<typeof fieldOptionSchema>

// ── Reusable Validators ───────────────────────────────────────────────────────

export const emailValidator = z.string().email('Invalid email address')
export const slugValidator = z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
export const urlValidator = z.string().url('Must be a valid URL')
export const hexColorValidator = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color (e.g. #FF5733)')

/** Validate a password strength score (returns errors array, empty = strong) */
export function validatePasswordStrength(password: string): string[] {
 const errors: string[] = []
 if (password.length < 8) errors.push('At least 8 characters')
 if (!/[A-Z]/.test(password)) errors.push('At least one  letter')
 if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter')
 if (!/[0-9]/.test(password)) errors.push('At least one number')
 if (!/[^A-Za-z0-9]/.test(password)) errors.push('At least one special character')
 return errors
}

/** Check if a value looks like a valid MongoDB ObjectId */
export function isValidObjectId(id: string): boolean {
 return /^[0-9a-fA-F]{24}$/.test(id)
}

/** Check if a value looks like a valid UUID */
export function isValidUUID(id: string): boolean {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}
