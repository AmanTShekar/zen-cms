import Redis from 'ioredis'
import { logger } from './logger'
import { env } from '../config/env';


class RedisService {
  public client: Redis | null = null
  private pubClient: Redis | null = null
  private subClient: Redis | null = null

  constructor() {
    this.init()
  }

  private init() {
    if (env.REDIS_URL) {
      try {
        this.client = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 50, 2000)
        })
        this.client.on('error', (err) => {
          logger.error({ err }, 'Redis connection error')
        })
        logger.info('Redis client initialized')
      } catch (err) {
        logger.error({ err }, 'Failed to initialize Redis client')
      }
    } else {
      if (env.NODE_ENV === 'production') {
        logger.warn('Redis is not configured in production. Distributed state will fail.')
      } else {
        logger.debug('Redis is not configured. Falling back to process-local state for dev.')
      }
    }
  }

  public getPubSubClients(): { pubClient: Redis | null; subClient: Redis | null } {
    if (!env.REDIS_URL) {
      return { pubClient: null, subClient: null }
    }
    
    if (!this.pubClient || !this.subClient) {
      this.pubClient = new Redis(env.REDIS_URL)
      this.subClient = new Redis(env.REDIS_URL)
      
      this.pubClient.on('error', (err) => logger.error({ err }, 'Redis Pub connection error'))
      this.subClient.on('error', (err) => logger.error({ err }, 'Redis Sub connection error'))
    }
    
    return { pubClient: this.pubClient, subClient: this.subClient }
  }
}

export const redisService = new RedisService()
