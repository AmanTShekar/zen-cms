/**
 * Shared constants for the Admin UI
 */

// ── Content Status ────────────────────────────────────────────────────────────
export type PublishStatus = 'draft' | 'published'
export type WorkflowStatus = 'draft' | 'in_review' | 'changes_requested' | 'scheduled' | 'published'

export const PUBLISH_STATUSES: PublishStatus[] = ['draft', 'published']

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
 'draft',
 'in_review',
 'changes_requested',
 'scheduled',
 'published',
]

// ── Field Types ───────────────────────────────────────────────────────────────
export type FieldType =
 | 'text' | 'textarea' | 'richtext' | 'lexical' | 'email'
 | 'number' | 'boolean' | 'checkbox' | 'date' | 'time'
 | 'select' | 'radio' | 'json' | 'code' | 'slug' | 'uid'
 | 'media' | 'relation' | 'array' | 'group' | 'collapsible'
 | 'row' | 'ui' | 'join' | 'point' | 'dz'

export const FIELD_TYPES: { label: string; value: FieldType }[] = [
 { label: 'Text', value: 'text' },
 { label: 'Textarea', value: 'textarea' },
 { label: 'Rich Text', value: 'richtext' },
 { label: 'Lexical Editor', value: 'lexical' },
 { label: 'Email', value: 'email' },
 { label: 'Number', value: 'number' },
 { label: 'Boolean', value: 'boolean' },
 { label: 'Checkbox', value: 'checkbox' },
 { label: 'Date', value: 'date' },
 { label: 'Select', value: 'select' },
 { label: 'Radio', value: 'radio' },
 { label: 'JSON', value: 'json' },
 { label: 'Code', value: 'code' },
 { label: 'Slug', value: 'slug' },
 { label: 'Media', value: 'media' },
 { label: 'Relation', value: 'relation' },
 { label: 'Array', value: 'array' },
 { label: 'Group', value: 'group' },
 { label: 'Dynamic Zone', value: 'dz' },
]

// ── MIME Types ────────────────────────────────────────────────────────────────
export const IMAGE_MIME_TYPES = [
 'image/jpeg',
 'image/png',
 'image/webp',
 'image/gif',
 'image/avif',
 'image/svg+xml',
]

export const VIDEO_MIME_TYPES = [
 'video/mp4',
 'video/webm',
 'video/ogg',
]

export const AUDIO_MIME_TYPES = [
 'audio/mpeg',
 'audio/ogg',
 'audio/wav',
 'audio/webm',
]

export const DOCUMENT_MIME_TYPES = [
 'application/pdf',
 'application/msword',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const ALLOWED_UPLOAD_MIME_TYPES = [
 ...IMAGE_MIME_TYPES,
 ...VIDEO_MIME_TYPES,
 ...AUDIO_MIME_TYPES,
 ...DOCUMENT_MIME_TYPES,
]

// ── Locales ───────────────────────────────────────────────────────────────────
export interface LocaleOption {
 label: string
 value: string
 flag?: string
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
 { label: 'English', value: 'en', flag: '🇺🇸' },
 { label: 'Spanish', value: 'es', flag: '🇪🇸' },
 { label: 'French', value: 'fr', flag: '🇫🇷' },
 { label: 'German', value: 'de', flag: '🇩🇪' },
 { label: 'Portuguese', value: 'pt', flag: '🇧🇷' },
 { label: 'Italian', value: 'it', flag: '🇮🇹' },
 { label: 'Japanese', value: 'ja', flag: '🇯🇵' },
 { label: 'Korean', value: 'ko', flag: '🇰🇷' },
 { label: 'Chinese', value: 'zh', flag: '🇨🇳' },
 { label: 'Arabic', value: 'ar', flag: '🇸🇦' },
 { label: 'Hindi', value: 'hi', flag: '🇮🇳' },
 { label: 'Russian', value: 'ru', flag: '🇷🇺' },
]

// ── User Roles ────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'editor' | 'viewer'

export const USER_ROLES: { label: string; value: UserRole }[] = [
 { label: 'Admin', value: 'admin' },
 { label: 'Editor', value: 'editor' },
 { label: 'Viewer', value: 'viewer' },
]

// ── Audit Actions ─────────────────────────────────────────────────────────────
export type AuditAction = 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'login'

export const AUDIT_ACTIONS: { label: string; value: AuditAction }[] = [
 { label: 'Create', value: 'create' },
 { label: 'Update', value: 'update' },
 { label: 'Delete', value: 'delete' },
 { label: 'Publish', value: 'publish' },
 { label: 'Unpublish', value: 'unpublish' },
 { label: 'Login', value: 'login' },
]

// ── Pagination ────────────────────────────────────────────────────────────────
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const DEFAULT_PAGE_SIZE = 25

// ── Status Colors (Tailwind classes) ──────────────────────────────────────────
export const STATUS_COLORS: Record<string, string> = {
 draft: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
 published: 'text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
 unpublished: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
 in_review: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
 changes_requested: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
 scheduled: 'text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
 success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
 failed: 'text-red-400 bg-red-400/10 border-red-400/20',
}

export function getStatusColor(status: string): string {
 return STATUS_COLORS[status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'
}
