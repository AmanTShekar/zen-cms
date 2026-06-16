import { CMSConfig } from '@zenith-open/zenithcms-types'
import { logger } from './logger'
import { eventHub } from './event-hub'

/**
 * Zenith Deployment Service
 * ──────────────────────────
 * Manages build hooks for Cloudflare, Netlify, and other static site hosting providers.
 * Listens to EventHub and triggers deployments based on CMSConfig.
 */
export const DeploymentService = {
  config: null as CMSConfig['deployment'] | null,

  init(config: CMSConfig) {
    if (!config.deployment) return
    this.config = config.deployment

    logger.info({ provider: this.config.provider }, 'DeploymentService: Initialized')

    // Subscribe to content changes
    eventHub.on('content.created', (args: any) => this.handleEvent(`${args.collection}.created`))
    eventHub.on('content.updated', (args: any) => this.handleEvent(`${args.collection}.updated`))
    eventHub.on('content.published', (args: any) =>
      this.handleEvent(`${args.collection}.published`)
    )
    eventHub.on('content.deleted', (args: any) => this.handleEvent(`${args.collection}.deleted`))
  },

  async handleEvent(event: string) {
    if (!this.config) return

    const shouldTrigger =
      this.config.autoTrigger ||
      (this.config.triggerOn &&
        (this.config.triggerOn.includes(event) || this.config.triggerOn.includes('*')))

    if (shouldTrigger) {
      await this.triggerDeployment()
    }
  },

  async triggerDeployment() {
    if (!this.config?.hookUrl) return

    try {
      logger.info({ url: this.config.hookUrl }, 'DeploymentService: Triggering build hook...')

      const response = await fetch(this.config.hookUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'ZenithCMS-Deploy-Hook',
          'X-Zenith-Source': 'Zenith Engine',
        },
      })

      if (response.ok) {
        logger.info('DeploymentService: Build hook triggered successfully')
      } else {
        logger.warn({ status: response.status }, 'DeploymentService: Build hook failed')
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'DeploymentService: Error triggering build hook')
    }
  },
}
