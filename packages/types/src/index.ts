/**
 * Zenith CMS — Core Type System
 * ─────────────────────────────
 * Strictly typed configuration schema for collections, fields, and plugins.
 * Uses Discriminated Unions for robust field-level validation and IntelliSense.
 */

import type React from 'react'
export * from './generated'

export interface ZenithDocument {
  _id?: string
  id?: string
  siteId?: string | null
  _status?: 'draft' | 'published' | string
  _version?: number
  workflowStatus?: string
  deletedAt?: Date | null
  [key: string]: unknown
}

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
  | 'dz'

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
  condition?: (data: unknown, siblingData: unknown) => boolean
  readAccess?: string[]
  writeAccess?: string[]
}

export interface BaseFieldConfig {
  name: string
  label?: string
  required?: boolean
  unique?: boolean
  localized?: boolean
  virtual?: boolean
  defaultValue?: unknown
  admin?: FieldAdminConfig
  hooks?: {
    beforeChange?: (value: unknown) => unknown | Promise<unknown>
    afterRead?: (value: unknown) => unknown | Promise<unknown>
    validate?: (value: unknown, data: unknown) => boolean | string | Promise<boolean | string>
  }
  access?: {
    read?: (user: unknown) => boolean
    update?: (user: unknown) => boolean
    create?: (user: unknown) => boolean
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
  where?: Record<string, unknown>
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
      Field?: React.ComponentType<unknown>
    }
    condition?: (data: unknown, siblingData: unknown) => boolean
  }
}

export interface DZFieldConfig extends BaseFieldConfig {
  type: 'dz'
  /** List of available component types (block slugs) for this dynamic zone */
  components?: string[]
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
  | DZFieldConfig

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
  softDelete?: boolean
  hooks?: {
    beforeValidate?: (data: unknown, user: unknown, context: { hookType: string }) => unknown | Promise<unknown>
    beforeCreate?: (data: unknown, user: unknown, context: { hookType: string }) => unknown | Promise<unknown>
    afterCreate?: (doc: unknown, user: unknown, context: { hookType: string }) => void | Promise<void>
    beforeUpdate?: (data: unknown, user: unknown, context: { hookType: string }) => unknown | Promise<unknown>
    afterUpdate?: (doc: unknown, user: unknown, context: { hookType: string }) => void | Promise<void>
    beforeDelete?: (id: string, user: unknown, context: { hookType: string }) => void | Promise<void>
    afterDelete?: (id: string, user: unknown, context: { hookType: string }) => void | Promise<void>
    afterRead?: (doc: unknown, user: unknown, context: { hookType: string }) => unknown | Promise<unknown>
    afterError?: (error: Error, data: unknown, user: unknown) => void | Promise<void>
  }
  endpoints?: Array<{
    path: string
    method: 'get' | 'post' | 'put' | 'patch' | 'delete'
    handler: (req: any, res: any, next: any) => void | Promise<void>
  }>
  access?: {
    /** Return false to deny, or an object to merge as query constraints (Row-Level Security). */
    read?: (user: unknown, context?: { req?: unknown }) => boolean | object
    /** Return false to deny, or an object to constrain which documents the user may create. */
    create?: (user: unknown, context?: { req?: unknown }) => boolean
    /** Return false to deny, or an object to constrain which documents the user may update. */
    update?: (user: unknown, context?: { req?: unknown }) => boolean | object
    /** Return false to deny, or an object to constrain which documents the user may delete. */
    delete?: (user: unknown, context?: { req?: unknown }) => boolean | object
  }
  admin?: {
    group?: string
    hidden?: boolean
    useAsTitle?: string
    displayTemplate?: string
    defaultColumns?: string[]
    icon?: string
    previewUrl?: string | ((doc: unknown) => string)
  }

}

export type GlobalConfig = CollectionConfig // Globals are singletons

// ── Plugin & System Config ───────────────────────────────────────────────────

export interface ZenithPlugin {
  /** Unique identifier (slug). Use reverse-domain notation: `zenith-seo`, `acme-analytics` */
  id: string
  /** Display name shown in admin UI */
  name: string
  version?: string
  description?: string
  author?: string
  /** Plugin home page / documentation URL */
  homepage?: string
  /** NPM package name if installable via package manager */
  packageName?: string
  downloads?: number
  /** Minimum Zenith engine version required */
  minEngineVersion?: string
  /** Other plugin IDs this plugin depends on */
  dependencies?: string[]
  /** Whether the plugin is active. Disabled plugins are not applied. */
  enabled?: boolean
  /**
   * JSON Schema for plugin configuration options.
   * Used by the admin UI to render a settings form.
   */
  configSchema?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'url' | 'secret'
    label: string
    description?: string
    default?: unknown
    options?: Array<{ label: string; value: string }>
    required?: boolean
  }>
  /** Runtime config values (set by admin UI) */
  config?: Record<string, unknown>
  /**
   * Transform the CMS config (add collections, fields, hooks, etc.).
   * Called at engine bootstrap for each enabled plugin.
   */
  apply: (config: CMSConfig, pluginConfig?: Record<string, unknown>) => CMSConfig | void
  /** Called after all plugins are applied, before routes are mounted */
  onInit?: (ctx: PluginContext) => void | Promise<void>
  /** Called after the engine is fully started and listening */
  onReady?: (ctx: PluginContext) => void | Promise<void>
  /** Called when the engine is shutting down */
  onDestroy?: (ctx: PluginContext) => void | Promise<void>
}

export interface PluginContext {
  /** Express application instance */
  app: unknown
  /** Active database adapter */
  adapter: unknown
  /** Current CMS config (after all plugins applied) */
  config: CMSConfig
  /** Hook registry — use to register lifecycle hooks */
  hooks: {
    on: <T = unknown>(hook: string, handler: (payload: T) => T | Promise<T> | void, priority?: number) => () => void
    emit: (hook: string, payload: unknown) => Promise<void>
  }
  /** Register admin UI components */
  admin: {
    registerComponent: (slot: string, component: { id: string; label: string; icon?: string }) => void
  }
  /** Logger instance */
  logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void
    warn: (msg: string, meta?: Record<string, unknown>) => void
    error: (msg: string, meta?: Record<string, unknown>) => void
    debug: (msg: string, meta?: Record<string, unknown>) => void
  }
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
  endpoints?: Array<{
    path: string
    method: 'get' | 'post' | 'put' | 'patch' | 'delete'
    handler: (req: any, res: any, next: any) => void | Promise<void>
  }>
}

export * from './generated'
export * from './database'
