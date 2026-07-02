export interface CMSResponse<T = any> {
  data: T | null
  meta?: {
    pagination?: {
      page?: number
      pageSize?: number
      totalPages?: number
      total?: number
      [key: string]: any
    }
    [key: string]: any
  }
  error: {
    status: number
    name: string
    message: string
    details?: any
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
  details?: any,
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

import crypto from 'crypto'
import { Response } from 'express'
import { ZenithRequest } from '../types/request'

export function applyCacheHeaders(req: ZenithRequest, res: Response, payloadHashStr: string, lastModifiedAt?: Date | string, maxAge: number = 60): boolean {
  const etag = crypto.createHash('sha256').update(payloadHashStr).digest('hex').slice(0, 16)
  const ifNoneMatch = req.headers['if-none-match']
  
  if (ifNoneMatch === `"${etag}"` || ifNoneMatch === etag) {
    res.status(304).end()
    return true
  }
  
  res.setHeader('ETag', `"${etag}"`)
  if (lastModifiedAt) {
    const d = new Date(lastModifiedAt)
    if (!isNaN(d.getTime())) {
      res.setHeader('Last-Modified', d.toUTCString())
    }
  }
  res.setHeader('Cache-Control', `private, max-age=${maxAge}, must-revalidate`)
  return false
}
