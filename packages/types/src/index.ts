/**
 * Zenith CMS — Core Type System
 * ─────────────────────────────
 * Strictly typed configuration schema for collections, fields, and plugins.
 * Uses Discriminated Unions for robust field-level validation and IntelliSense.
 */

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'textarea'
  | 'checkbox'
  | 'date'
  | 'select'
  | 'media'
  | 'richtext'
  | 'json'
  | 'group'
  | 'tabs'
  | 'array'
  | 'relation'
  | 'blocks'
  | 'boolean'

export interface BlockDefinition {
  slug: string
  labels?: { singular: string; plural: string }
  fields: FieldConfig[]
  admin?: {
    description?: string
    icon?: string
  }
}

export interface FieldAdminConfig {
  placeholder?: string
  description?: string
  hidden?: boolean
  readOnly?: boolean
  width?: string
  condition?: (data: any, siblingData: any) => boolean
}

export interface BaseFieldConfig {
  name: string
  label?: string
  required?: boolean
  unique?: boolean
  localized?: boolean
  virtual?: boolean
  defaultValue?: any
  admin?: FieldAdminConfig
  hooks?: {
    beforeChange?: (value: any) => any | Promise<any>
    afterRead?: (value: any) => any | Promise<any>
    validate?: (value: any, data: any) => boolean | string | Promise<boolean | string>
  }
  access?: {
    read?: (user: any) => boolean
    update?: (user: any) => boolean
    create?: (user: any) => boolean
  }
}

// ── Specific Field Interfaces ────────────────────────────────────────────────

export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text' | 'email' | 'textarea'
  minLength?: number
  maxLength?: number
}
export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number'
  min?: number
  max?: number
}
export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: 'checkbox' | 'boolean'
}
export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select'
  options: (string | { label: string; value: string })[]
  hasMany?: boolean
}
export interface MediaFieldConfig extends BaseFieldConfig {
  type: 'media'
  hasMany?: boolean
}
export interface RelationFieldConfig extends BaseFieldConfig {
  type: 'relation'
  relationTo: string
  hasMany?: boolean
  junctionTable?: string
  pivotFields?: FieldConfig[]
}
export interface ArrayFieldConfig extends BaseFieldConfig {
  type: 'array'
  fields: FieldConfig[]
  minRows?: number
  maxRows?: number
}
export interface GroupFieldConfig extends BaseFieldConfig {
  type: 'group'
  fields: FieldConfig[]
}
export interface BlocksFieldConfig extends BaseFieldConfig {
  type: 'blocks'
  blocks: BlockDefinition[]
}
export interface BasicFieldConfig extends BaseFieldConfig {
  type: 'date' | 'richtext' | 'json'
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | CheckboxFieldConfig
  | SelectFieldConfig
  | MediaFieldConfig
  | RelationFieldConfig
  | ArrayFieldConfig
  | GroupFieldConfig
  | BlocksFieldConfig
  | BasicFieldConfig

// ── Collection & Global Config ───────────────────────────────────────────────

export interface CollectionConfig {
  name: string
  slug: string
  labels?: { singular: string; plural: string }
  fields: FieldConfig[]
  drafts?: boolean
  seo?: boolean
  timestamps?: boolean
  singleton?: boolean
  versions?: boolean
  scheduling?: boolean
  publicRead?: boolean
  hooks?: {
    beforeValidate?: (data: any, user: any, context: { hookType: string }) => any | Promise<any>
    beforeCreate?: (data: any, user: any, context: { hookType: string }) => any | Promise<any>
    afterCreate?: (doc: any, user: any, context: { hookType: string }) => void | Promise<void>
    beforeUpdate?: (data: any, user: any, context: { hookType: string }) => any | Promise<any>
    afterUpdate?: (doc: any, user: any, context: { hookType: string }) => void | Promise<void>
    beforeDelete?: (id: string, user: any, context: { hookType: string }) => void | Promise<void>
    afterDelete?: (id: string, user: any, context: { hookType: string }) => void | Promise<void>
    afterRead?: (doc: any, user: any, context: { hookType: string }) => any | Promise<any>
    afterError?: (error: Error, data: any, user: any) => void | Promise<void>
  }
  access?: {
    read?: (user: any) => boolean | object
    create?: (user: any) => boolean
    update?: (user: any) => boolean
    delete?: (user: any) => boolean
  }
  admin?: {
    group?: string
    hidden?: boolean
    useAsTitle?: string
    displayTemplate?: string
    defaultColumns?: string[]
    icon?: string
    previewUrl?: string | ((doc: any) => string)
  }
  endpoints?: {
    path: string
    method: 'get' | 'post' | 'put' | 'delete' | 'patch'
    handler: (req: any, res: any) => void | Promise<void>
  }[]
}

export type GlobalConfig = CollectionConfig // Globals are singletons

// ── Plugin & System Config ───────────────────────────────────────────────────

export interface ZenithPlugin {
  name: string
  version?: string
  description?: string
  author?: string
  downloads?: number
  apply: (config: CMSConfig) => CMSConfig | void
  onInit?: (app: any) => void | Promise<void>
  onReady?: (app: any) => void | Promise<void>
}

export type DeploymentProvider = 'cloudflare' | 'netlify' | 'vercel' | 'custom'

export interface DeploymentConfig {
  provider: DeploymentProvider
  hookUrl: string
  triggerOn?: string[]
  autoTrigger?: boolean
}

export interface WebhookTarget {
  url: string
  events: string[]
  secret?: string
}

export interface CMSConfig {
  collections: CollectionConfig[]
  globals?: GlobalConfig[]
  plugins?: ZenithPlugin[]
  webhooks?: WebhookTarget[]
  deployment?: DeploymentConfig
  cors?: {
    origins: string[]
  }
}

export * from './generated'
export * from './database'
