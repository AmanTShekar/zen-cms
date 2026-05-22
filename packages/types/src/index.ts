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
  | 'code'
  | 'collapsible'
  | 'join'
  | 'point'
  | 'radio'
  | 'row'
  | 'ui'

export interface BlockDefinition {
  slug: string
  labels?: { singular: string; plural: string }
  fields: FieldConfig[]
  admin?: {
    description?: string
    icon?: string
    imageURL?: string
    category?: string
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
  type: 'text' | 'email' | 'textarea' | 'password' | 'uid' | 'color'
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
  options?: {
    focalPoint?: boolean
    blurhash?: boolean
    responsive?: boolean
  }
}
export type OnDeletePolicy = 'SET_NULL' | 'CASCADE' | 'RESTRICT' | 'NO_ACTION'

export interface RelationFieldConfig extends BaseFieldConfig {
  type: 'relation'
  relationTo: string | string[]
  hasMany?: boolean
  junctionTable?: string
  pivotFields?: FieldConfig[]
  onDelete?: OnDeletePolicy
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
export interface RichTextFieldConfig extends BaseFieldConfig {
  type: 'richtext'
  format?: 'html' | 'json'
}
export interface BasicFieldConfig extends BaseFieldConfig {
  type: 'date' | 'json'
}
export interface CodeFieldConfig extends BaseFieldConfig {
  type: 'code'
  language?: string
  minLength?: number
  maxLength?: number
}
export interface CollapsibleFieldConfig extends BaseFieldConfig {
  type: 'collapsible'
  fields: FieldConfig[]
  initCollapsed?: boolean
}
export interface JoinFieldConfig extends Omit<BaseFieldConfig, 'required'> {
  type: 'join'
  collection: string | string[]
  on: string
  maxDepth?: number
  where?: Record<string, any>
  defaultLimit?: number
  defaultSort?: string
}
export interface PointFieldConfig extends BaseFieldConfig {
  type: 'point'
}
export interface RadioFieldConfig extends BaseFieldConfig {
  type: 'radio'
  options: (string | { label: string; value: string })[]
  layout?: 'horizontal' | 'vertical'
}
export interface RowFieldConfig extends Omit<BaseFieldConfig, 'required' | 'unique' | 'localized' | 'virtual' | 'defaultValue' | 'admin' | 'hooks' | 'access'> {
  type: 'row'
  fields: FieldConfig[]
  admin?: {
    className?: string
  }
}
export interface UIFieldConfig extends Omit<BaseFieldConfig, 'required' | 'unique' | 'localized' | 'virtual' | 'defaultValue' | 'hooks' | 'access'> {
  type: 'ui'
  admin?: {
    components?: {
      Field?: React.ComponentType<any>
    }
    condition?: (data: any, siblingData: any) => boolean
  }
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
  | RichTextFieldConfig
  | BasicFieldConfig
  | CodeFieldConfig
  | CollapsibleFieldConfig
  | JoinFieldConfig
  | PointFieldConfig
  | RadioFieldConfig
  | RowFieldConfig
  | UIFieldConfig

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
  maxVersions?: number
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
    /** Return false to deny, or an object to merge as query constraints (Row-Level Security). */
    read?: (user: any, context?: { req?: any }) => boolean | object
    /** Return false to deny, or an object to constrain which documents the user may create. */
    create?: (user: any, context?: { req?: any }) => boolean
    /** Return false to deny, or an object to constrain which documents the user may update. */
    update?: (user: any, context?: { req?: any }) => boolean | object
    /** Return false to deny, or an object to constrain which documents the user may delete. */
    delete?: (user: any, context?: { req?: any }) => boolean | object
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
