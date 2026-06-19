import { eventHub } from './event-hub'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from './logger'
import { EmailService } from './email'
import { WebhookService } from './webhook'
import { AIService } from './ai'

/**
 * Helper to interpolate variables from context into a string.
 * Example: "Hello {{payload.title}}!" -> "Hello World!"
 */
function interpolate(template: string, context: any): string {
  if (!template || typeof template !== 'string') return template
  return template.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, path) => {
    const keys = path.split('.')
    let result = context
    for (const key of keys) {
      if (result === undefined || result === null) return ''
      result = result[key]
    }
    return result !== undefined && result !== null ? String(result) : ''
  })
}

/**
 * Deep interpolation for objects
 */
function interpolateObject(obj: any, context: any): any {
  if (typeof obj === 'string') return interpolate(obj, context)
  if (Array.isArray(obj)) return obj.map((v) => interpolateObject(v, context))
  if (obj && typeof obj === 'object') {
    const newObj: any = {}
    for (const [k, v] of Object.entries(obj)) {
      newObj[k] = interpolateObject(v, context)
    }
    return newObj
  }
  return obj
}

/**
 * Zenith Flow Automation Engine
 * ────────────────────────────
 * Executes graph-based workflows.
 */
export const FlowEngine = {
  init() {
    logger.info('Initializing Zenith Flow Automation Engine...')

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
      const activeFlows = await adapter.find<Record<string, any>>('flows', {
        active: true,
      })

      for (const flow of activeFlows) {
        // Support legacy schema and new graph schema
        const isGraph = flow.nodes && Array.isArray(flow.nodes)
        
        let shouldTrigger = false
        if (isGraph) {
          const triggerNode = flow.nodes.find((n: any) => n.type === 'trigger')
          if (triggerNode) {
            const config = triggerNode.data || {}
            if (
              config.triggerType === triggerType &&
              config.collection === data.collection &&
              (!config.action || config.action === action)
            ) {
              shouldTrigger = true
            }
          }
        } else if (flow.trigger?.type === triggerType) {
          const config = flow.trigger.config as any
          if (
            config?.collection === data.collection &&
            (!config.action || config.action === action)
          ) {
            shouldTrigger = true
          }
        }

        if (shouldTrigger) {
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
    const isGraph = flow.nodes && Array.isArray(flow.nodes)
    
    // Support legacy schema fallback
    if (!isGraph) {
      if (!flow.steps || flow.steps.length === 0) return
      const adapter = AdapterFactory.getActiveAdapter()

      let currentStep = flow.steps.find((s: any) => !flow.steps.some((other: any) => other.next === s.id))
      if (!currentStep) currentStep = flow.steps[0]

      const visited = new Set<string>()
      while (currentStep) {
        if (visited.has(currentStep.id)) break
        visited.add(currentStep.id)
        try {
          await this.executeStep(currentStep.type, currentStep.config, context, flow)
        } catch (err) {
          logger.error({ flowId: flow._id, stepId: currentStep.id, err }, 'Flow step failed')
          break
        }
        currentStep = flow.steps.find((s: any) => s.id === currentStep.next)
      }
      return
    }

    // Graph Execution Logic
    const nodes = flow.nodes || []
    const edges = flow.edges || []
    
    if (nodes.length === 0) return

    const triggerNode = nodes.find((n: any) => n.type === 'trigger')
    if (!triggerNode) return

    const visited = new Set<string>()
    const executionQueue: any[] = [triggerNode]

    while (executionQueue.length > 0) {
      const currentNode = executionQueue.shift()
      
      if (visited.has(currentNode.id)) {
        logger.error({ flowId: flow._id, nodeId: currentNode.id }, 'Cycle detected in flow execution')
        continue
      }
      visited.add(currentNode.id)

      // Execute Action Node
      if (currentNode.type === 'action') {
        logger.info({ flowId: flow._id, stepId: currentNode.id, action: currentNode.data.actionType }, 'Executing flow step')
        try {
          const stepContext = { payload: context, env: process.env }
          const result = await this.executeStep(currentNode.data.actionType, currentNode.data, stepContext, flow)
          
          // Optionally merge output into context for next nodes
          if (result) {
            context = { ...context, [currentNode.id]: result }
          }
        } catch (err) {
          logger.error({ flowId: flow._id, stepId: currentNode.id, err }, 'Flow node execution failed')
          break // Stop execution down this branch
        }
      }

      // Find children
      const childrenEdges = edges.filter((e: any) => e.source === currentNode.id)
      const childrenNodes = childrenEdges
        .map((e: any) => nodes.find((n: any) => n.id === e.target))
        .filter(Boolean)
      
      executionQueue.push(...childrenNodes)
    }
  },

  async executeStep(type: string, rawConfig: any, context: any, flow: any): Promise<any> {
    const config = interpolateObject(rawConfig, context)
    const adapter = AdapterFactory.getActiveAdapter()

    if (type === 'webhook' || type === 'http') {
      if (config.url) {
        if (type === 'webhook') {
          await WebhookService.sendWebhook(
            { url: config.url, secret: config.secret || 'zenith-flow-sec', events: ['*'] },
            'flow.step',
            context.payload || context,
            flow.name
          )
        } else {
          // Generic HTTP
          const headers = config.headers ? JSON.parse(config.headers) : {}
          const body = config.body ? JSON.parse(config.body) : context.payload || context
          const method = config.method || 'POST'
          const res = await fetch(config.url, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: method !== 'GET' ? JSON.stringify(body) : undefined
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return await res.json()
        }
      }
    } else if (type === 'slack') {
      if (config.webhookUrl && config.message) {
        const res = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: config.message })
        })
        if (!res.ok) throw new Error(`Slack HTTP ${res.status}`)
      }
    } else if (type === 'ai_prompt') {
      if (config.prompt) {
        return await AIService.generateContent(config.prompt)
      }
    } else if (type === 'email') {
      if (config.to && config.subject) {
        await EmailService.send({
          to: config.to,
          subject: config.subject,
          html: config.body || `<pre>${JSON.stringify(context.payload || context, null, 2)}</pre>`,
        })
      }
    } else if (type === 'log') {
      logger.info({ flowId: flow._id, data: context.payload || context, message: config.message }, 'Flow Log Action')
    } else if (type === 'update_content') {
      // Logic for updating DB content
      if (config.collection) {
        const targetCollection = config.collection as string
        const targetId = config.documentId || context?.payload?._id || context?._id

        if (config.operation === 'create') {
          return await adapter.create(targetCollection, config.fields || {})
        } else if (config.operation === 'delete') {
          if (targetId) await adapter.delete(targetCollection, String(targetId))
        } else {
          if (targetId) return await adapter.update(targetCollection, String(targetId), config.fields || {})
        }
      }
    }
  }
}
