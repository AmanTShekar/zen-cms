import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export const githubAuthPlugin = (): ZenithPlugin => {
  return {
    id: 'auth-github',
    name: 'GitHub OAuth',
    description: 'GitHub Authentication Integration',
    onReady: async (ctx: PluginContext) => {
      ctx.logger.info('[GitHub Auth Plugin] Registering GitHub passport strategy...')
      const core = require('@zenith-open/zenithcms-core')
      if (core && core.passport && core.AuthStrategyRegistry) {
        const { Strategy } = require('passport-github2')
        core.AuthStrategyRegistry.registerStrategy({
          name: 'github',
          displayName: 'GitHub Login',
          icon: 'brand-github',
          authenticate: async () => ({ success: false, error: 'GitHub OAuth not fully configured in scaffold' })
        })
      }
    }
  }
}