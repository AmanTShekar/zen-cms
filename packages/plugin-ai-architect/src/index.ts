import { ZenithPlugin, PluginContext } from '@zenith-open/zenithcms-types'
import { contentToolsRouter, systemAiRouter } from './router'
import { logger } from '@zenith-open/zenithcms-core'

export const aiArchitectPlugin = (): ZenithPlugin => {
  return {
    id: 'ai-architect',
    name: 'AI Architect',
    description: 'Provides generative AI schemas, real-time SEO analysis, and semantic tools.',
    onInit: async (ctx: PluginContext) => {
      // Mount the API routers over the legacy endpoints for backwards compatibility
      ctx.app.use('/api/v1/content-tools', contentToolsRouter)
      ctx.app.use('/api/v1/system', systemAiRouter)
      logger.info('[AI Architect Plugin] Mounted /api/v1/content-tools and /api/v1/system AI extensions')
    }
  }
}
