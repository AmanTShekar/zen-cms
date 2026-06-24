/**
 * Zenith CMS — Structured Error System
 * ─────────────────────────────────────
 * Inspired by Payload & Directus error patterns.
 * All domain errors extend ZenithError for consistent API responses.
 */

// ── Base Error ──────────────────────────────────────────────────────────────
export class ZenithError extends Error {
  status: number
  code: string
  isPublic: boolean
  data?: any

  constructor(
    message: string,
    status = 500,
    code = 'INTERNAL_ERROR',
    isPublic = false,
    data?: any
  ) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
    this.isPublic = isPublic
    this.data = data
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      error: this.code,
      message: this.isPublic ? this.message : 'An unexpected error occurred',
      status: this.status,
      ...(this.data ? { data: this.data } : {}),
    }
  }
}

// ── 400 Bad Request ──────────────────────────────────────────────────────────
export class InvalidPayloadError extends ZenithError {
  constructor(message = 'Invalid request payload', data?: any) {
    super(message, 400, 'INVALID_PAYLOAD', true, data)
  }
}

// ── 401 Unauthorized ─────────────────────────────────────────────────────────
export class AuthenticationError extends ZenithError {
  constructor(message = 'Invalid credentials', data?: any) {
    super(message, 401, 'INVALID_CREDENTIALS', true, data)
  }
}

export class TokenExpiredError extends ZenithError {
  constructor() {
    super('Token has expired', 401, 'TOKEN_EXPIRED', true)
  }
}

export class InvalidTokenError extends ZenithError {
  constructor(message = 'Invalid token') {
    super(message, 401, 'INVALID_TOKEN', true)
  }
}

// ── 403 Forbidden ────────────────────────────────────────────────────────────
export class ForbiddenError extends ZenithError {
  constructor(message = 'You do not have permission to perform this action', data?: any) {
    super(message, 403, 'FORBIDDEN', true, data)
  }
}

// ── 404 Not Found ────────────────────────────────────────────────────────────
export class NotFoundError extends ZenithError {
  constructor(collection?: string, id?: string) {
    const msg = collection && id ? `${collection} with id "${id}" not found` : 'Resource not found'
    super(msg, 404, 'NOT_FOUND', true)
  }
}

// ── 409 Conflict ─────────────────────────────────────────────────────────────
export class ConflictError extends ZenithError {
  constructor(reason?: string) {
    super(reason || 'Conflict: Document was modified by another editor', 409, 'DOCUMENT_CONFLICT', true)
  }
}

export class DuplicateError extends ZenithError {
  constructor(field?: string) {
    const msg = field ? `A record with this "${field}" already exists` : 'Duplicate record'
    super(msg, 409, 'RECORD_NOT_UNIQUE', true)
  }
}

// ── 422 Validation ───────────────────────────────────────────────────────────
export class ValidationError extends ZenithError {
  errors: { field: string; message: string }[]

  constructor(errors: { field: string; message: string }[]) {
    super('Validation failed', 422, 'VALIDATION_ERROR', true, errors)
    this.errors = errors
  }

  override toJSON() {
    return {
      error: this.code,
      message: this.message,
      status: this.status,
      errors: this.errors,
    }
  }
}

// ── 429 Rate Limit ───────────────────────────────────────────────────────────
export class RateLimitError extends ZenithError {
  constructor() {
    super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED', true)
  }
}

// ── 503 Service Unavailable ──────────────────────────────────────────────────
export class ServiceUnavailableError extends ZenithError {
  constructor(service: string) {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE', true)
  }
}

// ── Type Guard ───────────────────────────────────────────────────────────────
export function isZenithError(error: any): error is ZenithError {
  return error instanceof ZenithError
}
