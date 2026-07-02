import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export const googleAuthPlugin = (): ZenithPlugin => {
  return {
    id: 'auth-google',
    name: 'Google OAuth',
    description: 'Google Authentication Integration',
    onReady: async (ctx: PluginContext) => {
      ctx.logger.info('[Google Auth Plugin] Registering Google passport strategy...')
      const core = require('@zenith-open/zenithcms-core')
      if (core && core.passport && core.AuthStrategyRegistry) {
        const { Strategy } = require('passport-google-oauth20')
        core.AuthStrategyRegistry.registerStrategy({
          name: 'google',
          displayName: 'Google Login',
          icon: 'brand-google',
          authenticate: async () => ({ success: false, error: 'Google OAuth not fully configured in scaffold' })
        })
      }
    }
  }
}