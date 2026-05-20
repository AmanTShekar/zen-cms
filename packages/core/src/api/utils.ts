export interface CMSResponse<T = unknown> {
  data: T | null
  meta?: {
    pagination?: {
      page: number
      pageSize: number
      totalPages: number
      total: number
    }
    [key: string]: unknown
  }
  error: {
    status: number
    name: string
    message: string
    details?: unknown
  } | null
}

export function createResponse<T>(data: T, meta?: CMSResponse['meta']): CMSResponse<T> {
  return {
    data,
    meta,
    error: null,
  }
}

export function createErrorResponse(
  status: number,
  message: string,
  details?: unknown,
  name: string = 'ApplicationError'
): CMSResponse<null> {
  return {
    data: null,
    error: {
      status,
      name,
      message,
      details,
    },
  }
}
