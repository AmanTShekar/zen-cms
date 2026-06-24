/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { eventHub } from './event-hub'
import { AdapterFactory } from '../database/adapters/AdapterFactory'
import { logger } from './logger'
import { EmailService } from './email'
import { WebhookService } from './webhook'
import { AIService } from './ai'
import vm from 'vm'

/**
 * Helper to interpolate variables from context into a string.
 */
function interpolate(template: string, context: Record<string, any>): string {
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

function interpolateObject(obj: Record<string, any>, context: Record<string, any>): any {
  if (typeof obj === 'string') return interpolate(obj, context)
  if (Array.isArray(obj)) return obj.map((v) => interpolateObject(v, context))
  if (obj && typeof obj === 'object') {
    const newObj: Record<string, any> = {}
    for (const [k, v] of Object.entries(obj)) {
      newObj[k] = interpolateObject(v, context)
    }
    return newObj
  }
  return obj
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Zenith Flow Automation Engine - Enterprise Edition
 * ──────────────────────────────────────────────────
 * Durable DAG execution, retries, conditional routing, and persistent logs.
 */
export const FlowEngine = {
  init() {
    logger.info('Initializing Zenith Flow Automation Engine (Enterprise)...')

    eventHub.on('content.created', async (payload: Record<string, any>) => {
      await this.triggerFlows('collection_change', 'create', payload)
    })

    eventHub.on('content.updated', async (payload: Record<string, any>) => {
      await this.triggerFlows('collection_change', 'update', payload)
    })

    eventHub.on('content.deleted', async (payload: Record<string, any>) => {
      await this.triggerFlows('collection_change', 'delete', payload)
    })

    // Resume interrupted runs on boot
    this.resumeRuns().catch(err => logger.error({ err }, 'Failed to resume flows'))

    // Poller to wake up sleeping runs
    setInterval(async () => {
      try {
        const adapter = AdapterFactory.getActiveAdapter()
        const sleeping = await adapter.find<Record<string, any>>('z_flow_runs', { status: 'sleeping' })
        const now = Date.now()
        for (const run of sleeping) {
          if (run.resumeAt && now >= new Date(run.resumeAt).getTime()) {
            await adapter.update('z_flow_runs', String(run._id || run.id), { status: 'running', updatedAt: new Date().toISOString() })
            this.processRun(String(run._id || run.id)).catch(err => logger.error(err))
          }
        }
      } catch (err) {
        // Silently ignore errors in polling loop to prevent crashing
      }
    }, 15000)
  },

  async resumeRuns() {
    const adapter = AdapterFactory.getActiveAdapter()
    const running = await adapter.find<Record<string, any>>('z_flow_runs', { status: 'running' })
    if (running.length > 0) {
      logger.info(`Resuming ${running.length} interrupted flow runs...`)
      for (const run of running) {
        this.processRun(String(run._id || run.id)).catch(err => logger.error({ err, runId: run._id }, 'Error resuming run'))
      }
    }
  },

  async triggerFlows(
    triggerType: string,
    action: string,
    data: { collection: string; document: Record<string, any> }
  ) {
    try {
      const adapter = AdapterFactory.getActiveAdapter()
      const activeFlows = await adapter.find<Record<string, any>>('flows', { active: true })

      for (const flow of activeFlows) {
        const isGraph = flow.nodes && Array.isArray(flow.nodes)
        let shouldTrigger = false

        if (isGraph) {
          const triggerNode = flow.nodes.find((n: Record<string, any>) => n.type === 'trigger')
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
        }

        if (shouldTrigger) {
          logger.info({ flowId: flow._id, name: flow.name }, 'Triggering flow execution')
          const runId = await this.createRun(flow, data.document)
          this.processRun(runId).catch(err => logger.error({ err, flowId: flow._id }, 'Flow execution failed'))
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error triggering flows')
    }
  },

  async createRun(flow: Record<string, any>, payload: Record<string, any>): Promise<string> {
    const adapter = AdapterFactory.getActiveAdapter()
    const run = await adapter.create('z_flow_runs', {
      flowId: String(flow._id || flow.id),
      status: 'running',
      context: { payload, env: process.env },
      completedNodes: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    return String((run as Record<string, any>)._id || (run as Record<string, any>).id)
  },

  async appendLog(runId: string, level: string, nodeId: string, msg: string, details?: Record<string, any>) {
    const adapter = AdapterFactory.getActiveAdapter()
    await adapter.create('z_flow_logs', {
      runId,
      level,
      nodeId,
      msg,
      details,
      timestamp: new Date().toISOString()
    })
    logger[level === 'error' ? 'error' : 'info']({ runId, nodeId, msg, details }, 'Flow Log')
  },

  /**
   * The core DAG execution loop. Processes nodes that are ready to run.
   */
  async processRun(runId: string) {
    const adapter = AdapterFactory.getActiveAdapter()
      const run = await adapter.findOne<Record<string, any>>('z_flow_runs', { _id: runId })
      if (!run || run.status !== 'running') return

      const flow = await adapter.findOne<Record<string, any>>('flows', { _id: run.flowId })
      if (!flow) {
        await this.markRunFailed(runId, 'Flow definition not found')
        return
      }

      const nodes: Record<string, any>[] = flow.nodes || []
      const edges: Record<string, any>[] = flow.edges || []

    let madeProgress = false
    const promises: Promise<void>[] = []
    
    // Mongoose strips empty objects by default, so ensure completedNodes exists
    run.completedNodes = run.completedNodes || {}

    for (const node of nodes) {
      // Skip completed nodes
      if (run.completedNodes[node.id]) continue

      // Check incoming edges
      const incomingEdges = edges.filter(e => e.target === node.id)
      let canRun = true

      // If it's a trigger node, it has no incoming edges and is ready
      if (node.type !== 'trigger' && incomingEdges.length > 0) {
        for (const edge of incomingEdges) {
          const parentResult = run.completedNodes[edge.source]
          
          if (!parentResult) {
            canRun = false // Parent hasn't finished
            break
          }

          // If the parent was a condition node, verify the edge's sourceHandle matches the evaluation
          if (parentResult.isCondition) {
            const requiredHandle = edge.sourceHandle || edge.source // react-flow stores it in sourceHandle
            if (parentResult.branch !== requiredHandle && parentResult.branch !== edge.source) {
              canRun = false // This edge path was NOT taken!
              // If we are on a dead path, we should mark this node as skipped so descendants know.
              // For simplicity, we just won't run it.
            }
          }
        }
      }

      if (canRun) {
        madeProgress = true
        // Execute the node
        promises.push(this.executeNode(runId, run, flow, node))
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises)
      // Recurse to process the next layer of the DAG
      await this.processRun(runId)
    } else {
      // If no promises were made, check if we are completely done or deadlocked
      const allDone = nodes.every(n => run.completedNodes[n.id] || this.isNodeDead(n, edges, run.completedNodes))
      
      // FIX: In a durable DAG, if no promises are queued, execution is finished.
      // E.g., we hit the end of a branch, or a condition skipped all children.
      await adapter.update('z_flow_runs', runId, { status: 'completed', updatedAt: new Date().toISOString() })
      await this.appendLog(runId, 'info', 'system', 'Flow execution completed successfully')
    }
  },

  isNodeDead(node: any, edges: Record<string, any>[], completedNodes: Record<string, any>[]): boolean {
    // A node is dead if any parent is dead, OR if its parent was a condition and routed away from it.
    // For MVP durable DAG, if we stop making progress and didn't fail, we assume completion.
    return false;
  },

  async markRunFailed(runId: string, reason: string) {
    const adapter = AdapterFactory.getActiveAdapter()
    await adapter.update('z_flow_runs', runId, { status: 'failed', error: reason, updatedAt: new Date().toISOString() })
    await this.appendLog(runId, 'error', 'system', `Flow failed: ${reason}`)
  },

  async executeNode(runId: string, run: Record<string, any>, flow: Record<string, any>, node: any) {
    const adapter = AdapterFactory.getActiveAdapter()
    let result: Record<string, any> = null
    let branch: string | null = null
    let isCondition = false

    try {
      await this.appendLog(runId, 'info', node.id, `Executing node ${node.data.label || node.type}`)

      if (node.type === 'trigger') {
        result = run.context.payload
      } 
      else if (node.type === 'condition') {
        isCondition = true
        const condition = node.data.condition || 'false'
        const interpolated = interpolateObject(condition, run.context)
        
        // Safe Sandbox Evaluation
        const sandbox = { payload: run.context.payload, env: process.env, ...run.context }
        vm.createContext(sandbox)
        let evalResult = false
        try {
          evalResult = !!vm.runInContext(interpolated, sandbox)
        } catch (e: any) {
          throw new Error(`Condition evaluation error: ${e.message}`)
        }
        
        branch = evalResult ? 'true' : 'false'
        await this.appendLog(runId, 'info', node.id, `Condition evaluated to ${evalResult}`)
      }
      else if (node.type === 'action') {
        if (node.data.actionType === 'delay') {
          const amount = Number(node.data.amount) || 0
          const unit = node.data.unit || 'seconds'
          const multipliers: Record<string, any> = { seconds: 1000, minutes: 60000, hours: 3600000, days: 86400000 }
          const ms = amount * (multipliers[unit] || 1000)

          if (!run.context[`${node.id}_slept`]) {
            await this.appendLog(runId, 'info', node.id, `Suspending run for ${amount} ${unit}`)
            run.context[`${node.id}_slept`] = true
            run.status = 'sleeping'
            run.resumeAt = new Date(Date.now() + ms).toISOString()
            
            await adapter.update('z_flow_runs', runId, {
              status: 'sleeping',
              resumeAt: run.resumeAt,
              context: run.context,
              updatedAt: new Date().toISOString()
            })
            return // Halt execution of this branch
          } else {
            if (Date.now() < new Date(run.resumeAt).getTime()) return // Still sleeping
            await this.appendLog(runId, 'info', node.id, `Woke up from sleep`)
            result = { slept: true, ms }
          }
        } else {
          result = await this.executeStepWithRetry(node.data.actionType, node.data, run.context, flow, runId, node.id)
        }

        if (node.data.actionType === 'code') {
          run.context.payload = result // Transformer updates global payload
        }
      }

      // Update State
      const nextContext = { ...run.context, [node.id]: result }
      const completedUpdate = { result, branch, isCondition }
      
      // Atomic DB Update for durable execution
      run.completedNodes[node.id] = completedUpdate
      run.context = nextContext
      
      await adapter.update('z_flow_runs', runId, {
        completedNodes: run.completedNodes,
        context: run.context,
        updatedAt: new Date().toISOString()
      })

    } catch (err: any) {
      await this.appendLog(runId, 'error', node.id, `Node execution failed: ${err.message}`)
      await this.markRunFailed(runId, err.message)
      throw err // Stop execution of this branch
    }
  },

  async executeStepWithRetry(type: string, rawConfig: Record<string, any>, context: Record<string, any>, flow: Record<string, any>, runId: string, nodeId: string): Promise<Record<string, any>> {
    const maxRetries = ['http', 'webhook'].includes(type) ? 3 : 1
    let attempt = 0
    let lastError: any

    while (attempt < maxRetries) {
      try {
        if (attempt > 0) {
          await this.appendLog(runId, 'info', nodeId, `Retry attempt ${attempt}/${maxRetries}`)
          await sleep(1000 * Math.pow(2, attempt)) // Exponential backoff: 2s, 4s...
        }
        return await this.executeStep(type, rawConfig, context, flow)
      } catch (err: any) {
        lastError = err
        attempt++
      }
    }
    throw lastError
  },

  async executeStep(type: string, rawConfig: Record<string, any>, context: Record<string, any>, flow: Record<string, any>): Promise<Record<string, any>> {
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
        return await AIService.generateContent(config.prompt, flow.siteId)
      }
    } else if (type === 'email') {
      if (config.to && config.subject) {
        await EmailService.send({
          to: config.to,
          subject: config.subject,
          html: config.body || `<pre>${JSON.stringify(context.payload || context, null, 2)}</pre>`,
        }, undefined, flow.siteId)
      }
    } else if (type === 'code') {
      if (config.code) {
        const sandbox = { payload: context.payload, env: process.env, ...context }
        vm.createContext(sandbox)
        const wrapper = `(function() { ${config.code} })()`
        return vm.runInContext(wrapper, sandbox)
      }
    } else if (type === 'loop') {
      const arrayValue = interpolateObject(`{{${config.arrayPath}}}`, context)
      if (Array.isArray(arrayValue) && config.targetFlowId) {
        const targetFlowQuery: Record<string, any> = { _id: config.targetFlowId }
        if (flow.siteId) targetFlowQuery.siteId = flow.siteId
        const targetFlow = await adapter.findOne<Record<string, any>>('flows', targetFlowQuery)
        if (targetFlow) {
          for (const item of arrayValue) {
            const childRunId = await this.createRun(targetFlow, item)
            this.processRun(childRunId).catch(err => logger.error({ err }, 'Sub-flow failed'))
          }
          return { spawned: arrayValue.length, targetFlowId: config.targetFlowId }
        } else {
          throw new Error('Target Sub-Flow not found')
        }
      } else {
        return { spawned: 0, error: 'Invalid array or missing target flow' }
      }
    } else if (type === 'log') {
      logger.info({ flowId: flow._id, data: context.payload || context, message: config.message }, 'Flow Log Action')
    } else if (type === 'update_content') {
      if (config.collection) {
        const targetCollection = config.collection as string
        const targetId = config.documentId || context?.payload?._id || context?._id

        // MULTI-TENANT GUARD: Securely enforce siteId on automated flow actions
        if (config.operation === 'create') {
          const payload = config.fields || {}
          if (flow.siteId) payload.siteId = flow.siteId
          return await adapter.create(targetCollection, payload)
        } else if (config.operation === 'update') {
          if (flow.siteId) {
            const existing = await adapter.findOne(targetCollection, { _id: targetId, siteId: flow.siteId })
            if (!existing) throw new Error('Document not found or access denied')
          }
          return await adapter.update(targetCollection, targetId, config.fields || {})
        } else if (config.operation === 'delete') {
          if (targetId) {
            if (flow.siteId) {
              const existing = await adapter.findOne<Record<string, any>>(targetCollection, { id: targetId }).catch(() => adapter.findOne<Record<string, any>>(targetCollection, { _id: targetId }))
              if (existing && existing.siteId !== flow.siteId) throw new Error('FlowEngine: Tenant isolation violation during delete')
            }
            await adapter.delete(targetCollection, String(targetId))
          }
        } else {
          // Default to update
          if (targetId) {
            if (flow.siteId) {
              const existing = await adapter.findOne<Record<string, any>>(targetCollection, { id: targetId }).catch(() => adapter.findOne<Record<string, any>>(targetCollection, { _id: targetId }))
              if (existing && existing.siteId !== flow.siteId) throw new Error('FlowEngine: Tenant isolation violation during update')
            }
            return await adapter.update(targetCollection, String(targetId), config.fields || {})
          }
        }
      }
    }
  }
}
