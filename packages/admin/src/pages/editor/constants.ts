import React from 'react'
import {
  Star,
  Grid,
  BarChart4,
  MessageSquare,
  Mail,
  CreditCard,
  Zap,
  FileText,
  Layout,
  Users,
  AlertCircle,
  Code,
  Table,
  Type,
} from 'lucide-react'

export interface FieldDefinition {
  name: string
  label?: string
  required?: boolean
  type: 'text' | 'richtext' | 'lexical' | 'media' | 'relation' | 'number' | 'boolean' | 'select' | 'array' | 'group'
    | 'code' | 'collapsible' | 'join' | 'point' | 'radio' | 'row' | 'ui' | 'textarea' | 'checkbox' | 'date' | 'json'
    | 'dz' | 'email' | 'password' | 'uid' | 'color' | 'blocks' | 'tabs'
  fields?: FieldDefinition[]
  options?: (string | { label: string; value: any })[]
  placeholder?: string
  language?: string
  layout?: 'horizontal' | 'vertical'
  hasMany?: boolean
  hasMore?: boolean
  /** For date fields: 'date' (default), 'datetime', or 'time' */
  dateFormat?: 'date' | 'datetime' | 'time'
  /** For dz (dynamic zone) fields: list of available component types from BLOCK_LIBRARY */
  components?: string[]
  /** Relation target collection(s) */
  relationTo?: string | string[]
  /** Source field for slug auto-generation */
  sourceField?: string
  /** Help text displayed below the field label */
  description?: string
  admin?: {
    components?: {
      Field?: React.ComponentType<any>
    }
  }
}

export interface BlockDefinition {
  type: string
  icon: any
  title: string
  description: string
  category: string
  fields: FieldDefinition[]
  defaultContent: Record<string, any>
}

import { UNIFIED_BLOCK_LIBRARY } from './unifiedBlocks'

const IconMap: Record<string, any> = {
  Star,
  Grid,
  BarChart4,
  MessageSquare,
  Mail,
  CreditCard,
  Zap,
  FileText,
  Layout,
  Users,
  AlertCircle,
  Code,
  Table,
  Type,
}

export const BLOCK_LIBRARY: BlockDefinition[] = UNIFIED_BLOCK_LIBRARY.map((b) => ({
  type: b.type,
  icon: IconMap[b.iconName] || Zap,
  title: b.title,
  description: b.description,
  category: b.category,
  fields: b.fields,
  defaultContent: b.defaultContent,
}))


export const humanize = (str: string) => {
  return str
    .replace(/^root:/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
}

export const detectFieldType = (key: string, val: any): string => {
  if (val && typeof val === 'object' && val.url) return 'media'
  if (key.toLowerCase().includes('image')) return 'media'
  if (key.toLowerCase().includes('email')) return 'email'
  if (key.toLowerCase().includes('content') || key.toLowerCase().includes('description') || key.toLowerCase().includes('body')) return 'richtext'
  if (Array.isArray(val)) return 'array'
  if (typeof val === 'object' && val !== null) return 'group'
  if (typeof val === 'number') return 'number'
  if (typeof val === 'boolean') return 'boolean'
  return 'text'
}

export interface Section {
  id: string
  blockType: string
  title: string
  content: any
  align?: 'left' | 'center' | 'right'
  blockName?: string
  collapsed?: boolean
}

export interface PageData {
  _status?: 'draft' | 'published'
  _version?: number
  title?: string
  heroDescription?: string
  sections: Section[]
  align?: 'left' | 'center' | 'right'
  meta?: Record<string, any>
  publishedAt?: string
  createdAt?: string
  updatedAt?: string
  siteId?: string
}

