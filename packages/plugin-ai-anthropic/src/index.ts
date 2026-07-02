import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'

export const anthropicPlugin = (): ZenithPlugin => {
  return {
    id: 'ai-anthropic',
    name: 'Anthropic AI',
    description: 'Official Anthropic SDK for Claude models',
    onReady: async (ctx: PluginContext) => {
      ctx.logger.info('[Anthropic Plugin] Loaded Anthropic AI Provider')
      // Register with AI provider registry in core
    }
  }
}