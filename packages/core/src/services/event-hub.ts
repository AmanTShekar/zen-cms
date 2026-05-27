import { EventEmitter } from 'events'
import { logger } from './logger'

export type ZenithEventListener = (...args: any[]) => Promise<void> | void

export interface EventHubBackend {
  emit(event: string, ...args: unknown[]): Promise<void>
  on(event: string, listener: ZenithEventListener): void
  off(event: string, listener: ZenithEventListener): void
  destroy(): Promise<void> | void
}

/**
 * In-Memory Event Hub Backend (Default)
 * ──────────────────────────────────────
 * Local event bus within a single Node.js process.
 */
class InMemoryEventBackend implements EventHubBackend {
  private emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(50)
  }

  async emit(event: string, ...args: unknown[]): Promise<void> {
    const listeners = this.emitter.rawListeners(event) as ZenithEventListener[]
    const promises = listeners.map(async (listener) => {
      try {
        await listener(...args)
      } catch (err) {
        logger.error({ err, event }, 'InMemoryEventBackend: Error in event listener')
      }
    })
    await Promise.all(promises)
  }

  on(event: string, listener: ZenithEventListener): void {
    this.emitter.on(event, listener)
  }

  off(event: string, listener: ZenithEventListener): void {
    this.emitter.off(event, listener)
  }

  destroy(): void {
    this.emitter.removeAllListeners()
  }
}

/**
 * Distributed Redis Pub/Sub Event Hub Backend
 * ───────────────────────────────────────────
 * Hardened distributed event bus. Connects multiple Zenith CMS nodes
 * to keep local caches and states perfectly synchronized in production clusters.
 */
class RedisEventBackend implements EventHubBackend {
  private pubClient: any = null
  private subClient: any = null
  private localEmitter = new EventEmitter()
  private channelName = 'zenith_events'

  constructor() {
    this.localEmitter.setMaxListeners(50)
    this.init()
  }

  private async init(): Promise<void> {
    try {
      const { redisService } = require('./redis')
      const { pubClient, subClient } = redisService.getPubSubClients()
      
      if (!pubClient || !subClient) {
        throw new Error('No PubSub clients returned')
      }
      
      this.pubClient = pubClient
      this.subClient = subClient

      this.subClient.on('message', (channel: string, message: string) => {
        if (channel !== this.channelName) return
        try {
          const { event, args } = JSON.parse(message)
          const listeners = this.localEmitter.rawListeners(event) as ZenithEventListener[]
          listeners.forEach(async (listener) => {
            try {
              await listener(...args)
            } catch (err) {
              logger.error({ err, event }, 'RedisEventBackend (Sub Handler): Error in listener')
            }
          })
        } catch (err) {
          logger.error({ err }, 'RedisEventBackend: Failed to parse distributed event packet')
        }
      })

      await this.subClient.subscribe(this.channelName)
      logger.info('RedisEventBackend: Distributed Redis Pub/Sub channel subscribed successfully')
    } catch (err: any) {
      logger.error(
        { err: err.message },
        'RedisEventBackend: Failed to initialize Redis Pub/Sub. Falling back to simple In-Memory bus.'
      )
    }
  }

  async emit(event: string, ...args: unknown[]): Promise<void> {
    // If pubClient is active, broadcast to Redis
    if (this.pubClient && this.pubClient.status === 'ready') {
      try {
        const payload = JSON.stringify({ event, args })
        await this.pubClient.publish(this.channelName, payload)
      } catch (err) {
        logger.error({ err, event }, 'RedisEventBackend: Failed to publish event to Redis channel. Falling back locally.')
        this.emitLocal(event, ...args)
      }
    } else {
      // Fallback locally
      this.emitLocal(event, ...args)
    }
  }

  private async emitLocal(event: string, ...args: unknown[]): Promise<void> {
    const listeners = this.localEmitter.rawListeners(event) as ZenithEventListener[]
    const promises = listeners.map(async (listener) => {
      try {
        await listener(...args)
      } catch (err) {
        logger.error({ err, event }, 'RedisEventBackend (Local Fallback): Error in listener')
      }
    })
    await Promise.all(promises)
  }

  on(event: string, listener: ZenithEventListener): void {
    this.localEmitter.on(event, listener)
  }

  off(event: string, listener: ZenithEventListener): void {
    this.localEmitter.off(event, listener)
  }

  async destroy(): Promise<void> {
    this.localEmitter.removeAllListeners()
    // We don't quit the clients here because they are managed by the unified RedisService.
  }
}

/**
 * Zenith Event Hub Manager
 * ────────────────────────
 * Facade pattern that resolves the optimal pub/sub driver dynamically on startup.
 */
class ZenithEventHub {
  private backend: EventHubBackend

  constructor() {
    const { redisService } = require('./redis')
    if (redisService.client) {
      logger.info('Zenith Event Hub: Initializing pluggable Distributed Redis event bus backend')
      this.backend = new RedisEventBackend()
    } else {
      logger.info('Zenith Event Hub: Initializing standard In-Memory event bus backend')
      this.backend = new InMemoryEventBackend()
    }
  }

  async emit(event: string, ...args: unknown[]): Promise<void> {
    await this.backend.emit(event, ...args)
  }

  on(event: string, listener: ZenithEventListener): () => void {
    this.backend.on(event, listener)
    return () => this.off(event, listener)
  }

  off(event: string, listener: ZenithEventListener): void {
    this.backend.off(event, listener)
  }

  async destroy(): Promise<void> {
    await this.backend.destroy()
  }
}

// Singleton export — one hub per process
export const eventHub = new ZenithEventHub()
