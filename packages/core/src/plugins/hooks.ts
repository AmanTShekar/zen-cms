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

export type HookHandler<T = unknown> = (payload: T) => T | Promise<T> | void | Promise<void>

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
  on<T = unknown>(hook: string, pluginName: string, handler: HookHandler<T>, priority = 10): () => void {
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
   */
  async apply<T = unknown>(hook: string, payload: T): Promise<T> {
    const handlers = this.hooks.get(hook) || []
    let result = payload
    for (const reg of handlers) {
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
   */
  async emit(hook: string, payload: unknown): Promise<void> {
    const handlers = this.hooks.get(hook) || []
    await Promise.all(
      handlers.map(async (reg) => {
        try {
          await reg.handler(payload)
        } catch (err: any) {
          logger.warn({ plugin: reg.pluginName, hook, err: err.message }, 'Hook handler failed')
        }
      })
    )
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
