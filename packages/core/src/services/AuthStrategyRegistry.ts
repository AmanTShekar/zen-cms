/* eslint-disable @typescript-eslint/ban-ts-comment */

import { logger } from './logger'
import passport from 'passport'

export interface AuthStrategy {
  name: string
  displayName: string
  icon?: string
  authenticate: (payload: Record<string, any>) => Promise<{ success: boolean; user?: Record<string, any>; error?: string }>
}

export class AuthStrategyRegistry {
  private static strategies = new Map<string, AuthStrategy>()

  /**
   * Registers a dynamic authentication provider.
   */
  static registerStrategy(strategy: AuthStrategy): void {
    this.strategies.set(strategy.name, strategy)
    logger.info({ providerName: strategy.name }, '[AuthRegistry] Registered dynamic SSO strategy successfully')
  }

  /**
   * Unregisters an authentication provider.
   */
  static unregisterStrategy(name: string): void {
    if (this.strategies.has(name)) {
      this.strategies.delete(name)
      logger.info({ providerName: name }, '[AuthRegistry] Unregistered auth strategy')
    }
  }

  /**
   * Retrieves a registered auth strategy by name.
   */
  static getStrategy(name: string): AuthStrategy | undefined {
    return this.strategies.get(name)
  }

  /**
   * Lists all available SSO and OAuth providers configured in the system.
   */
  static listStrategies(): { name: string; displayName: string; icon?: string }[] {
    return Array.from(this.strategies.values()).map((s) => ({
      name: s.name,
      displayName: s.displayName,
      icon: s.icon
    }))
  }
}

// Plugins can import `passport` from `@zenith-open/zenithcms-core` 
// and call `passport.use()` and `AuthStrategyRegistry.registerStrategy()` themselves.
export { passport }
