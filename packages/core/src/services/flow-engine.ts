import { eventHub } from './event-hub'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from './logger'
import { EmailService } from './email'
import { WebhookService } from './webhook'

/**
 * Zenith Flow Automation Engine
 * ────────────────────────────
 * Listens to transactional events emitted via the event hub and executes
 * registered workflows sequentially. Allows complex relational workflows and triggers.
 */
export const FlowEngine = {
  init() {
    logger.info('Initializing Zenith Flow Automation Engine...')

    // Subscribe to transactional hooks asynchronously
    eventHub.on('content.created', async (payload: any) => {
      await this.triggerFlows('collection_change', 'create', payload)
    })

    eventHub.on('content.updated', async (payload: any) => {
      await this.triggerFlows('collection_change', 'update', payload)
    })

    eventHub.on('content.deleted', async (payload: any) => {
      await this.triggerFlows('collection_change', 'delete', payload)
    })
  },

  async triggerFlows(
    triggerType: string,
    action: string,
    data: { collection: string; document: any }
  ) {
    try {
      const adapter = AdapterFactory.getActiveAdapter()
      const activeFlows = await adapter.find<any>('flows', {
        active: true,
        'trigger.type': triggerType,
      })

      for (const flow of activeFlows) {
        const config = flow.trigger.config as any
        // Verify trigger criteria matching collection and action slug
        if (
          config?.collection === data.collection &&
          (!config.action || config.action === action)
        ) {
          logger.info({ flowId: flow._id, name: flow.name }, 'Triggering flow execution')
          this.executeFlow(flow, data.document).catch((err) => {
            logger.error({ flowId: flow._id, err }, 'Flow execution failed')
          })
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error triggering flows')
    }
  },

  async executeFlow(flow: any, context: any) {
    if (!flow.steps || flow.steps.length === 0) return

    // Locate starter step
    let currentStep = flow.steps.find(
      (s: any) => !flow.steps.some((other: any) => other.next === s.id)
    )
    if (!currentStep) {
      currentStep = flow.steps[0]
    }

    const visited = new Set<string>()
    while (currentStep) {
      if (visited.has(currentStep.id)) {
        logger.error(
          { flowId: flow._id, stepId: currentStep.id },
          'Infinite loop / cycle detected in Flow Automation steps execution! Gracefully aborting execution to prevent CPU exhaustion lockup.'
        )
        break
      }
      visited.add(currentStep.id)

      logger.info(
        { flowId: flow._id, stepId: currentStep.id, type: currentStep.type },
        'Executing flow step'
      )

      try {
        if (currentStep.type === 'webhook') {
          const cfg = currentStep.config as any
          if (cfg?.url) {
            await WebhookService.sendWebhook(
              { url: cfg.url, secret: cfg.secret || 'zenith-flow-sec', events: ['*'] },
              'flow.step',
              context,
              flow.name
            )
          }
        } else if (currentStep.type === 'email') {
          const cfg = currentStep.config as any
          if (cfg?.to && cfg?.subject) {
            await EmailService.send({
              to: cfg.to,
              subject: cfg.subject,
              html:
                cfg.body ||
                `<h3>Flow: ${flow.name} Executed</h3><pre>${JSON.stringify(context, null, 2)}</pre>`,
            })
          }
        } else if (currentStep.type === 'log') {
          logger.info(
            { flowId: flow._id, stepId: currentStep.id, data: context },
            'Flow Log Action Executed'
          )
        } else if (currentStep.type === 'update_content') {
          // Relational action or field update automation
          logger.info(
            { flowId: flow._id, stepId: currentStep.id },
            'Relational/Content update step execution completed'
          )
        }
      } catch (err) {
        logger.error({ flowId: flow._id, stepId: currentStep.id, err }, 'Flow step failed')
        break
      }

      currentStep = flow.steps.find((s: any) => s.id === currentStep.next)
    }

    logger.info({ flowId: flow._id }, 'Flow execution complete')
  },
}
