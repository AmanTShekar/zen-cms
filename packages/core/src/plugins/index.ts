/**
 * Zenith CMS — Plugin System
 * ──────────────────────────
 * Inspired by Payload's plugin and Strapi's provider patterns.
 * Plugins can extend collections, inject middleware, and add hooks.
 */
import { CMSConfig, ZenithPlugin } from '@zenithcms/types'
export { CMSConfig, ZenithPlugin }

export type PluginFactory<TOptions = Record<string, unknown>> = (options: TOptions) => ZenithPlugin

/**
 * Plugin Runner — applies plugins sequentially to the config.
 * Plugins can mutate the config (add collections, fields, hooks) before the engine starts.
 */
export function applyPlugins(config: CMSConfig, plugins: ZenithPlugin[]): CMSConfig {
  return plugins.reduce((cfg, plugin) => {
    const result = plugin.apply(cfg)
    return result ?? cfg
  }, config)
}

// ── Built-in Plugin Examples ─────────────────────────────────────────────────

/**
 * SEO Plugin — adds SEO fields to all collections that have `seo: true`
 */
export const seoPlugin: ZenithPlugin = {
  name: 'zenith-seo',
  version: '1.2.4',
  description:
    'Enterprise-grade SEO metadata suite. Injects meta titles, descriptions, and OpenGraph fields into enabled collections.',
  author: 'ROOT_KERNEL',
  downloads: 12402,
  apply: (config) => {
    const updated = { ...config }
    updated.collections = config.collections.map((col) => {
      if (!col.seo) return col
      return {
        ...col,
        fields: [
          ...col.fields,
          { name: 'seoTitle', type: 'text' as const },
          { name: 'seoDescription', type: 'textarea' as const },
          { name: 'ogImage', type: 'media' as const },
        ],
      }
    })
    return updated
  },
}

/**
 * Slug Plugin — auto-generates a slug field from a title field
 */
export function slugPlugin(options: { from: string } = { from: 'title' }): ZenithPlugin {
  return {
    name: 'zenith-slug',
    version: '1.0.8',
    description:
      'Dynamic URL routing engine. Automatically generates SEO-friendly slugs from title fields.',
    author: 'ROOT_KERNEL',
    downloads: 8920,
    apply: (config) => {
      const updated = { ...config }
      updated.collections = config.collections.map((col) => {
        const hasSlug = col.fields.some((f) => f.name === 'slug')
        if (hasSlug) return col
        const hasSource = col.fields.some((f) => f.name === options.from)
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
