import { Request } from 'express'
import { AuthUser } from '../services/auth'
import { DatabaseAdapter } from '../database/adapters/BaseAdapter'

export interface ZenithRequest extends Request {
  user?: AuthUser & Record<string, any>
  siteId?: string
  zenith?: {
    adapter?: DatabaseAdapter
    [key: string]: any
  }
}
