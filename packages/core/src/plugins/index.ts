/**
 * Zenith CMS — Plugin System
 * ──────────────────────────
 * Inspired by Payload's plugin and Strapi's provider patterns.
 * Plugins can extend collections, inject middleware, register hooks,
 * and inject admin UI components.
 *
 * Community Plugin Guide:
 * 1. Export a function that returns a ZenithPlugin: `export const myPlugin = (options?) => ({...})`
 * 2. Set `id` to a unique slug (e.g. `acme-analytics`)
 * 3. Use `apply()` to add collections, fields, hooks, endpoints
 * 4. Use `onInit()` to register event hooks, middleware, custom routes
 * 5. Use `configSchema` to expose settings in the admin UI
 * 6. Add to cms.config.ts: `plugins: [myPlugin({ apiKey: '...' })]`
 * 7. Or install from admin UI if published to npm as `zenith-plugin-*`
 */
import { CMSConfig, ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'
import { hookRegistry, adminComponentRegistry } from './hooks'
import { logger } from '../services/logger'

export { CMSConfig, ZenithPlugin, PluginContext }
export { hookRegistry, adminComponentRegistry, type AdminComponentRegistration } from './hooks'

/** A plugin factory accepts options and returns a ZenithPlugin */
export type PluginFactory<TOptions = Record<string, any>> = (options?: TOptions) => ZenithPlugin

/**
 * Plugin Runner — applies enabled plugins sequentially to the config.
 * Plugins can mutate the config (add collections, fields, hooks) before the engine starts.
 * Order matters: later plugins see the config changes from earlier ones.
 */
export function applyPlugins(config: CMSConfig, plugins: ZenithPlugin[]): ZenithConfigResult {
  const result: ZenithConfigResult = { config, errors: [] }

  for (const plugin of plugins) {
    // Skip disabled plugins
    if (plugin.enabled === false) {
      logger.info({ plugin: plugin.id || plugin.name }, 'Plugin skipped (disabled)')
      continue
    }

    try {
      const pluginConfig = plugin.config || {}
      const modified = plugin.apply(result.config, pluginConfig)
      if (modified) result.config = modified
      logger.info({ plugin: plugin.id || plugin.name, version: plugin.version }, 'Plugin applied')
    } catch (err: any) {
      const errorMsg = `Plugin "${plugin.id || plugin.name}" failed to apply: ${err.message}`
      result.errors.push(errorMsg)
      logger.error({ plugin: plugin.id || plugin.name, err: err.message }, 'Plugin apply failed')
    }
  }

  return result
}

export interface ZenithConfigResult {
  config: CMSConfig
  errors: string[]
}

/**
 * Build a PluginContext for a given plugin.
 * Called during onInit/onReady lifecycle hooks.
 */
export function createPluginContext(app: any, config: CMSConfig): PluginContext {
  return {
    app,
    adapter: app.get('zenith_engine')?.adapter,
    config,
    hooks: {
      on: <T = any>(hook: string, handler: (payload: T) => T | Promise<T> | void, priority?: number) => {
        return hookRegistry.on(hook, 'plugin', handler, priority)
      },
      emit: (hook: string, payload: any) => hookRegistry.emit(hook, payload),
    },
    admin: {
      registerComponent: (slot: string, componentInfo: { id: string; label: string; icon?: string }) => {
        adminComponentRegistry.register({
          pluginName: 'plugin',
          slot: slot as any,
          component: componentInfo.id,
          label: componentInfo.label,
          icon: componentInfo.icon,
        })
      },
    },
    logger: {
      info: (msg: string, meta?: Record<string, any>) => logger.info(meta, `[Plugin] ${msg}`),
      warn: (msg: string, meta?: Record<string, any>) => logger.warn(meta, `[Plugin] ${msg}`),
      error: (msg: string, meta?: Record<string, any>) => logger.error(meta, `[Plugin] ${msg}`),
      debug: (msg: string, meta?: Record<string, any>) => logger.debug(meta, `[Plugin] ${msg}`),
    },
  }
}

// ── Built-in Plugin Examples ─────────────────────────────────────────────────

/**
 * SEO Plugin — adds SEO fields to all collections that have `seo: true`
 *
 * Usage in cms.config.ts:
 *   plugins: [seoPlugin()]
 *
 * Or with config:
 *   plugins: [seoPlugin({ autoOgImage: true })]
 */
export function seoPlugin(options: { autoOgImage?: boolean } = {}): ZenithPlugin {
  return {
    id: 'zenith-seo',
    name: 'SEO Metadata',
    version: '1.2.4',
    description: 'Enterprise-grade SEO metadata suite. Injects meta titles, descriptions, and OpenGraph fields into enabled collections.',
    author: 'Zenith Core',
    homepage: 'https://zenithcms.com/plugins/seo',
    dependencies: [],
    enabled: true,
    configSchema: {
      autoOgImage: {
        type: 'boolean',
        label: 'Auto-generate OG Image',
        description: 'Automatically generate OpenGraph images from the first media field',
        default: false,
      },
    },
    config: options,
    apply: (config, pluginConfig) => {
      const updated = { ...config }
      updated.collections = config.collections.map((col) => {
        if (!col.seo) return col
        const existingFields = new Set(col.fields.map((f) => f.name))
        const seoFields: any[] = []
        if (!existingFields.has('seoTitle')) seoFields.push({ name: 'seoTitle', type: 'text' })
        if (!existingFields.has('seoDescription')) seoFields.push({ name: 'seoDescription', type: 'textarea' })
        if (!existingFields.has('ogImage')) seoFields.push({ name: 'ogImage', type: 'media' })
        if (pluginConfig?.autoOgImage && !existingFields.has('ogImageAuto')) {
          seoFields.push({ name: 'ogImageAuto', type: 'checkbox', defaultValue: true })
        }
        return { ...col, fields: [...col.fields, ...seoFields] }
      })
      return updated
    },
    onInit: (ctx) => {
      ctx.logger.info('SEO plugin initialized')
    },
  }
}

/**
 * Slug Plugin — auto-generates a slug field from a title field
 *
 * Usage:
 *   plugins: [slugPlugin({ from: 'title' })]
 */
export function slugPlugin(options: { from?: string } = {}): ZenithPlugin {
  return {
    id: 'zenith-slug',
    name: 'Auto Slug',
    version: '1.0.8',
    description: 'Dynamic URL routing engine. Automatically generates SEO-friendly slugs from title fields.',
    author: 'Zenith Core',
    homepage: 'https://zenithcms.com/plugins/slug',
    enabled: true,
    configSchema: {
      from: {
        type: 'string',
        label: 'Source Field',
        description: 'The field to generate the slug from',
        default: 'title',
        required: true,
      },
      separator: {
        type: 'select',
        label: 'Word Separator',
        options: [
          { label: 'Hyphen (-)', value: '-' },
          { label: 'Underscore (_)', value: '_' },
        ],
        default: '-',
      },
    },
    config: { from: 'title', separator: '-', ...options },
    apply: (config, pluginConfig) => {
      const updated = { ...config }
      const sourceField = pluginConfig?.from || 'title'
      updated.collections = config.collections.map((col) => {
        const hasSlug = col.fields.some((f) => f.name === 'slug')
        if (hasSlug) return col
        const hasSource = col.fields.some((f) => f.name === sourceField)
        if (!hasSource) return col
        return {
          ...col,
          fields: [...col.fields, { name: 'slug', type: 'text' as const, unique: true }],
        }
      })
      return updated
    },
  }
}

/**
 * Audit Trail Plugin — enables versioning on all collections
 *
 * Usage:
 *   plugins: [auditTrailPlugin({ maxVersions: 50 })]
 */
export function auditTrailPlugin(options: { maxVersions?: number } = {}): ZenithPlugin {
  return {
    id: 'zenith-audit-trail',
    name: 'Audit Trail',
    version: '1.0.0',
    description: 'Enables automatic content versioning on all collections with configurable retention.',
    author: 'Zenith Core',
    enabled: true,
    configSchema: {
      maxVersions: {
        type: 'number',
        label: 'Max Versions per Document',
        description: 'Maximum number of versions to keep (0 = unlimited)',
        default: 50,
      },
    },
    config: { maxVersions: 50, ...options },
    apply: (config) => {
      const updated = { ...config }
      const max = options.maxVersions ?? 50
      updated.collections = config.collections.map((col) => {
        if (col.versions === false) return col // explicit opt-out
        return { ...col, versions: true, maxVersions: max }
      })
      return updated
    },
  }
}

export { meilisearchSyncPlugin } from './meilisearch'
