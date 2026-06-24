import { logger } from '../services/logger'

/**
 * Zenith Plugin Hooks System
 * ──────────────────────────
 * A typed hook registry that plugins (and core code) can use to
 * intercept and extend lifecycle events throughout the CMS.
 *
 * Hook points:
 *   'content:beforeCreate'  — mutate data before document creation
 *   'content:afterCreate'   — react to document creation (e.g. index for search)
 *   'content:beforeUpdate'  — mutate data before update
 *   'content:afterUpdate'   — react to update
 *   'content:beforeDelete'  — pre-delete checks
 *   'content:afterDelete'   — cleanup after delete
 *   'media:afterUpload'     — post-upload processing
 *   'admin:component'       — register admin UI components
 */

export type HookHandler<T = any> = (payload: T) => T | Promise<T> | void | Promise<void>

interface HookRegistration {
  pluginName: string
  handler: HookHandler
  priority: number // lower = runs first
}

class HookRegistry {
  private hooks = new Map<string, HookRegistration[]>()

  /**
   * Register a handler for a hook point.
   * Returns an unsubscribe function.
   */
  on<T = any>(hook: string, pluginName: string, handler: HookHandler<T>, priority = 10): () => void {
    const existing = this.hooks.get(hook) || []
    const registration: HookRegistration = { pluginName, handler: handler as HookHandler, priority }
    // Insert sorted by priority
    const idx = existing.findIndex((r) => r.priority > priority)
    if (idx === -1) {
      existing.push(registration)
    } else {
      existing.splice(idx, 0, registration)
    }
    this.hooks.set(hook, existing)

    return () => {
      const list = this.hooks.get(hook) || []
      this.hooks.set(
        hook,
        list.filter((r) => r.handler !== handler)
      )
    }
  }

  /**
   * Execute all handlers for a hook sequentially.
   * Each handler receives the return value of the previous one (pipeline pattern).
   * Supports wildcard matching: a handler registered on 'content:*:afterCreate'
   * will match 'content:posts:afterCreate', 'content:products:afterCreate', etc.
   */
  async apply<T = any>(hook: string, payload: T): Promise<T> {
    let result = payload
    // Collect exact-match and wildcard handlers, sorted by priority
    const exact = this.hooks.get(hook) || []
    const wildcard = this.getWildcardHandlers(hook)
    const all = [...exact, ...wildcard].sort((a, b) => a.priority - b.priority)
    for (const reg of all) {
      try {
        const out = await reg.handler(result)
        if (out !== undefined) result = out as T
      } catch (err: any) {
        logger.warn({ plugin: reg.pluginName, hook, err: err.message }, 'Hook handler failed')
      }
    }
    return result
  }

  /**
   * Execute all handlers for a hook in parallel (for side-effects that don't mutate).
   * Supports wildcard matching: a handler registered on 'content:*:afterCreate'
   * will match 'content:posts:afterCreate', 'content:products:afterCreate', etc.
   */
  async emit(hook: string, payload: any): Promise<void> {
    const exact = this.hooks.get(hook) || []
    const wildcard = this.getWildcardHandlers(hook)
    const all = [...exact, ...wildcard].sort((a, b) => a.priority - b.priority)
    await Promise.all(
      all.map(async (reg) => {
        try {
          await reg.handler(payload)
        } catch (err: any) {
          logger.warn({ plugin: reg.pluginName, hook, err: err.message }, 'Hook handler failed')
        }
      })
    )
  }

  /**
   * Find wildcard handlers that match a concrete hook name.
   * E.g. 'content:*:afterCreate' matches 'content:posts:afterCreate'.
   */
  private getWildcardHandlers(hook: string): HookRegistration[] {
    const parts = hook.split(':')
    const results: HookRegistration[] = []
    for (const [registeredHook, regs] of this.hooks) {
      if (registeredHook === hook) continue // exact matches handled separately
      const regParts = registeredHook.split(':')
      if (regParts.length !== parts.length) continue
      let matches = true
      for (let i = 0; i < parts.length; i++) {
        if (regParts[i] === '*') continue // wildcard segment
        if (regParts[i] !== parts[i]) { matches = false; break }
      }
      if (matches) results.push(...regs)
    }
    return results
  }

  /**
   * Get all registered hooks (for debugging).
   */
  inspect(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    for (const [hook, regs] of this.hooks) {
      result[hook] = regs.map((r) => `${r.pluginName} (p${r.priority})`)
    }
    return result
  }

  clear(): void {
    this.hooks.clear()
  }
}

export const hookRegistry = new HookRegistry()

// ── Admin Component Registry ─────────────────────────────────────────────────

export interface AdminComponentRegistration {
  pluginName: string
  slot: 'dashboard:before' | 'dashboard:after' | 'collection:list' | 'collection:edit' | 'settings:sidebar' | 'navbar:end'
  component: string // component identifier (resolved by admin frontend)
  label: string
  icon?: string
}

class AdminComponentRegistry {
  private components: AdminComponentRegistration[] = []

  register(reg: AdminComponentRegistration): void {
    this.components.push(reg)
    logger.debug({ plugin: reg.pluginName, slot: reg.slot }, 'Admin component registered')
  }

  getForSlot(slot: AdminComponentRegistration['slot']): AdminComponentRegistration[] {
    return this.components.filter((c) => c.slot === slot)
  }

  getAll(): AdminComponentRegistration[] {
    return [...this.components]
  }

  clear(): void {
    this.components = []
  }
}

export const adminComponentRegistry = new AdminComponentRegistry()

// ── Plugin Lifecycle Runner ──────────────────────────────────────────────────
//
// Industry approach (Payload CMS): plugins are plain objects implementing the
// ZenithPlugin interface. The engine calls `plugin.apply()` at config-merge
// time, then `onInit()` after the adapter connects, and `onReady()` once all
// routes are mounted and the HTTP server is listening.
//
// Each phase is isolated: a plugin that throws during onInit does not prevent
// other plugins from running — the error is logged and the engine continues.

import type { ZenithPlugin, PluginContext, CMSConfig } from '@zenith-open/zenithcms-types'

export class PluginLifecycleRunner {
  private plugins: ZenithPlugin[]
  private context: PluginContext

  constructor(plugins: ZenithPlugin[], context: PluginContext) {
    this.plugins = plugins.filter(p => p.enabled !== false)
    this.context = context
  }

  /**
   * Phase 1 — Apply: mutate the CMS config (add collections, fields, hooks).
   * Called synchronously before any adapters connect. Returns the transformed config.
   */
  applyAll(config: CMSConfig): CMSConfig {
    let result = { ...config }
    for (const plugin of this.plugins) {
      try {
        const transformed = plugin.apply(result, plugin.config)
        if (transformed) result = transformed
        logger.info({ plugin: plugin.id }, 'Plugin applied config transforms')
      } catch (err: any) {
        logger.error({ plugin: plugin.id, err: err.message }, 'Plugin.apply() failed — skipping')
      }
    }
    return result
  }

  /**
   * Phase 2 — onInit: adapter is connected, before routes are mounted.
   * Plugins can register additional collections, run migrations, seed data, etc.
   */
  async runOnInit(): Promise<void> {
    for (const plugin of this.plugins) {
      if (typeof plugin.onInit !== 'function') continue
      try {
        await plugin.onInit(this.context)
        logger.info({ plugin: plugin.id }, 'Plugin.onInit() complete')
      } catch (err: any) {
        logger.error({ plugin: plugin.id, err: err.message }, 'Plugin.onInit() failed — continuing')
      }
    }
  }

  /**
   * Phase 3 — onReady: all routes are mounted, HTTP server is listening.
   * Plugins can start background jobs, register webhooks, connect to external services.
   */
  async runOnReady(): Promise<void> {
    for (const plugin of this.plugins) {
      if (typeof plugin.onReady !== 'function') continue
      try {
        await plugin.onReady(this.context)
        logger.info({ plugin: plugin.id }, 'Plugin.onReady() complete')
      } catch (err: any) {
        logger.error({ plugin: plugin.id, err: err.message }, 'Plugin.onReady() failed — continuing')
      }
    }
  }

  /**
   * Phase 4 — onDestroy: engine is shutting down (SIGTERM / SIGINT).
   * Plugins should close connections, flush queues, complete in-flight work.
   */
  async runOnDestroy(): Promise<void> {
    for (const plugin of this.plugins) {
      if (typeof plugin.onDestroy !== 'function') continue
      try {
        await plugin.onDestroy(this.context)
        logger.info({ plugin: plugin.id }, 'Plugin.onDestroy() complete')
      } catch (err: any) {
        logger.error({ plugin: plugin.id, err: err.message }, 'Plugin.onDestroy() failed — continuing')
      }
    }
  }
}
